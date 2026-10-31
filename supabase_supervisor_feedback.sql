-- Migration: Supervisor feedback loop (comentarios del supervisor -> reglas por perfil)
--
-- Flujo:
--   1. El CM pega el comentario del supervisor en la nota -> fila en supervisor_feedback.
--   2. Clio lo clasifica, propone la corrección de esa nota y una regla para notas futuras
--      -> fila en documentation_rules con status 'pending' y scope 'profile'.
--   3. Los admins de Clio aprueban o rechazan la regla. Aprobada, se aplica solo a las notas
--      futuras de ese CM (y ese template). Nunca cambia el template base.
--   4. El panel de rechazos agrupa por template / categoría / CM / supervisor; si una regla se
--      repite entre perfiles, los admins deciden subirla a scope 'clinic' o 'global'.
--
-- Seguro de correr más de una vez (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- 0. Helper: ¿el usuario actual es admin de Clio?
CREATE OR REPLACE FUNCTION public.is_clio_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin', 'clio')
    );
$$;

-- 1. Comentarios del supervisor (uno por comentario pegado por el CM)
CREATE TABLE IF NOT EXISTS public.supervisor_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE, -- CM
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    note_id TEXT REFERENCES public.notes(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    template_id TEXT,                 -- p. ej. 'tcm_gather_psy_note'
    service_title TEXT,               -- título canónico del servicio
    supervisor_name TEXT,
    feedback_text TEXT NOT NULL,      -- lo que escribió el supervisor, tal cual
    category TEXT CHECK (category IN (
        'too_short', 'missing_key_point', 'omitted_data', 'wording', 'incorrect_data', 'format', 'other'
    )),
    section TEXT,                     -- párrafo / sección de la nota a la que se refiere
    ai_summary TEXT,                  -- resumen de Clio en una línea
    proposed_correction TEXT,         -- corrección propuesta para esta nota
    applied_to_note BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMP WITH TIME ZONE,
    rule_id UUID,                     -- regla propuesta a partir de este comentario (FK abajo)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS supervisor_feedback_user_idx ON public.supervisor_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS supervisor_feedback_template_idx ON public.supervisor_feedback (template_id, category);
CREATE INDEX IF NOT EXISTS supervisor_feedback_clinic_idx ON public.supervisor_feedback (clinic_id);

-- 2. Reglas de documentación aprendidas (se aplican a notas futuras según su alcance)
CREATE TABLE IF NOT EXISTS public.documentation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'profile' CHECK (scope IN ('profile', 'clinic', 'global')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,     -- CM cuando scope = 'profile'
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,    -- agencia cuando scope = 'clinic'
    template_id TEXT,                 -- NULL = todos los templates TCM
    category TEXT,
    rule_text TEXT NOT NULL,          -- instrucción que se agrega al prompt de ese perfil/template
    source_feedback_ids UUID[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'retired')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT documentation_rules_scope_owner CHECK (
        (scope = 'profile' AND user_id IS NOT NULL) OR
        (scope = 'clinic' AND clinic_id IS NOT NULL) OR
        (scope = 'global')
    )
);

CREATE INDEX IF NOT EXISTS documentation_rules_lookup_idx ON public.documentation_rules (status, scope, user_id, clinic_id, template_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'supervisor_feedback_rule_id_fkey'
    ) THEN
        ALTER TABLE public.supervisor_feedback
            ADD CONSTRAINT supervisor_feedback_rule_id_fkey
            FOREIGN KEY (rule_id) REFERENCES public.documentation_rules(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. RLS
ALTER TABLE public.supervisor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_rules ENABLE ROW LEVEL SECURITY;

-- supervisor_feedback: el CM gestiona sus propios comentarios; los admins de Clio ven y editan todo
DROP POLICY IF EXISTS "CM gestiona sus comentarios de supervisor" ON public.supervisor_feedback;
CREATE POLICY "CM gestiona sus comentarios de supervisor"
ON public.supervisor_feedback
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins de Clio gestionan todos los comentarios" ON public.supervisor_feedback;
CREATE POLICY "Admins de Clio gestionan todos los comentarios"
ON public.supervisor_feedback
FOR ALL
USING (public.is_clio_admin())
WITH CHECK (public.is_clio_admin());

-- documentation_rules:
--   * el CM lee las reglas aprobadas que le aplican (su perfil, su agencia o globales)
--   * el CM solo puede proponer reglas de su propio perfil en estado 'pending' (no aprobarlas)
--   * los admins de Clio aprueban, rechazan, retiran y cambian el alcance
DROP POLICY IF EXISTS "CM lee reglas aprobadas que le aplican" ON public.documentation_rules;
CREATE POLICY "CM lee reglas aprobadas que le aplican"
ON public.documentation_rules
FOR SELECT
USING (
    (scope = 'profile' AND user_id = auth.uid())
    OR (status = 'approved' AND scope = 'clinic' AND clinic_id = (SELECT p.clinic_id FROM public.profiles p WHERE p.id = auth.uid()))
    OR (status = 'approved' AND scope = 'global')
);

DROP POLICY IF EXISTS "CM propone reglas pendientes de su perfil" ON public.documentation_rules;
CREATE POLICY "CM propone reglas pendientes de su perfil"
ON public.documentation_rules
FOR INSERT
WITH CHECK (scope = 'profile' AND user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins de Clio gestionan las reglas" ON public.documentation_rules;
CREATE POLICY "Admins de Clio gestionan las reglas"
ON public.documentation_rules
FOR ALL
USING (public.is_clio_admin())
WITH CHECK (public.is_clio_admin());

-- 4. Panel de rechazos: comentarios agrupados (los admins lo consultan; respeta RLS)
CREATE OR REPLACE VIEW public.supervisor_feedback_panel
WITH (security_invoker = true)
AS
SELECT
    f.template_id,
    f.category,
    count(*)                                   AS feedback_count,
    count(DISTINCT f.user_id)                  AS cm_count,
    count(DISTINCT lower(coalesce(f.supervisor_name, ''))) AS supervisor_count,
    count(DISTINCT f.clinic_id)                AS clinic_count,
    min(f.created_at)                          AS first_seen,
    max(f.created_at)                          AS last_seen
FROM public.supervisor_feedback f
GROUP BY f.template_id, f.category;

-- 5. updated_at automático
CREATE OR REPLACE FUNCTION public.clio_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supervisor_feedback_touch ON public.supervisor_feedback;
CREATE TRIGGER supervisor_feedback_touch BEFORE UPDATE ON public.supervisor_feedback
FOR EACH ROW EXECUTE FUNCTION public.clio_touch_updated_at();

DROP TRIGGER IF EXISTS documentation_rules_touch ON public.documentation_rules;
CREATE TRIGGER documentation_rules_touch BEFORE UPDATE ON public.documentation_rules
FOR EACH ROW EXECUTE FUNCTION public.clio_touch_updated_at();
