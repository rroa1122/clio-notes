-- Platform admins de Clio (aprueban reglas de documentación y ven el panel de rechazos).
-- No se toca profiles.role: ahí vive la especialidad del usuario (p. ej. 'tcm'), que decide sus templates.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles p
SET is_platform_admin = TRUE
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) IN ('asleylegidos@gmail.com', 'reinier.roa2.0@gmail.com');

-- is_clio_admin(): admin por flag de plataforma (o por los roles de admin que ya existían)
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
          AND (p.is_platform_admin OR p.role IN ('admin', 'super_admin', 'clio'))
    );
$$;

-- Nadie puede marcarse admin a sí mismo desde la app: solo otro admin o el SQL Editor.
CREATE OR REPLACE FUNCTION public.protect_platform_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin
       AND auth.uid() IS NOT NULL
       AND NOT public.is_clio_admin() THEN
        RAISE EXCEPTION 'Only Clio platform admins can change is_platform_admin';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_platform_admin ON public.profiles;
CREATE TRIGGER profiles_protect_platform_admin BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_platform_admin_flag();

-- Los admins de Clio pueden leer los perfiles (nombres de los CMs en la pantalla de reglas)
DROP POLICY IF EXISTS "Admins de Clio leen perfiles" ON public.profiles;
CREATE POLICY "Admins de Clio leen perfiles"
ON public.profiles
FOR SELECT
USING (public.is_clio_admin());

-- Verificación: debe devolver las 2 cuentas
SELECT u.email, p.full_name, p.role, p.is_platform_admin
FROM public.profiles p JOIN auth.users u ON u.id = p.id
WHERE p.is_platform_admin;
