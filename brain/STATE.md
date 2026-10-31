# 🧠 CEREBRO DEL PROYECTO: Memoria Activa (`STATE.md`)

Este archivo registra el **Estado Actual del Trabajo** para que cualquier nueva conversación (de Reinier o de su compañero) retome exactamente donde quedamos sin perder contexto.

---

## Última Actualización
- **Fecha:** 2026-10-31
- **Rama Actual:** `feat/tcm-templates-v2`
- **Estado de Compilación (`npm run build`):** ✅ Limpio (0 errores)
- **Estado de Producción (`clinicflow.dev`):** ✅ Desplegado al 100% (Frontend + n8n + RPA Bot)

---

## Lo que ya está Completado y Desplegado en Producción
1. **Platform Admins & Pantalla de Reglas (`/admin/rules`):**
   - Flag `is_platform_admin` configurado en `profiles` para `reinier.roa2.0@gmail.com` y `asleylegidos@gmail.com`.
   - Pantalla `src/pages/DocumentationRules.tsx` desplegada en `https://notes.clinicflow.dev/admin/rules`.
   - Diálogo `SupervisorFeedbackDialog.tsx` integrado en `TcmNoteShell.tsx` para captura de feedback directo en las notas.
2. **Supervisor Feedback Loop (Base de Datos & Reglas por Perfil):**
   - Creada y aplicada la migración `supabase_supervisor_feedback.sql`.
   - Tablas `public.supervisor_feedback` y `public.documentation_rules` con RLS, índices, triggers y vista `supervisor_feedback_panel` activas en Supabase.
3. **Templates TCM v2 (Commits de Claude / alegidos):**
   - **Formato determinista de nombres de pacientes:** "First Last" en la primera mención y luego primer nombre.
   - **Badges `[CONFIRM]` clickeables interactivos:** Permiten al clínico resolver y completar los datos directamente en la nota y sincronizar con la ficha del paciente.
   - **Títulos oficiales de intake:** Actualizados para todos los templates de admisión.
   - **Develop Assessment y Adult Certification v2:** Templates enriquecidos con estándares oficiales de la agencia.
   - **Seguridad y Orientación:** Restauración de reglas de orientación y seguridad por excepción.
   - **Eliminación de narración de vacíos (Gap Narration):** Se eliminaron frases redundantes de datos faltantes en los prompts y en el frontend (`stripGapNarration`).
   - **Modal de confirmación interactivo en Clio:** Diálogo propio con opciones para completar TCM Social o continuar.
4. **Exportación e Integración de los 10 Workflows de n8n:**
   - Todos los 10 workflows ahora residen formalmente en `scratch/`.
   - Se configuró [`scratch/sync_all_workflows.cjs`](scratch/sync_all_workflows.cjs) de forma multiplataforma (Windows y Linux en GitHub Actions) para inyectar los 10 workflows en la base de datos de n8n.
5. **Selector Unificado de Encuentro (Calendario + Horas Inicio y Fin):**
   - Creado `src/components/ui/calendar-with-time-presets.tsx` (y alias `calendar-with-time-pressets.tsx`).
   - Integra calendario y selector de horas completamente armonizado con la paleta Slate / Azul Noche de Clio Notes (`dark:bg-slate-900`, `dark:bg-slate-950`, `border-slate-800`), con selector de día refinado de 32px, dos columnas de hora (Inicio y Fin) de 08:00 a 18:00, y footer directo (`Date • 09:00 – 09:45 (45 min)`) con botón Continuar.
   - Integrado en desktop y mobile en `src/notes-module/pages/Record.tsx`.
6. **CI/CD Automático de GitHub Actions (`deploy.yml`):**
   - Configurado para escuchar ramas `main` y `feat/**` / `feat/*`, desplegando automáticamente en cada push de Claude o el equipo.
6. **Protocolo de Colaboración Multi-Agente (Anti-Conflicto):**
   - Documentado en `brain/SYSTEM_MAP.md` sección 6 para evitar bloqueos y colisiones entre Claude y Antigravity.

---

## Próximos Pasos
- Inyectar reglas aprobadas de `documentation_rules` en el payload de `Record.tsx` hacia n8n.
- Actualizar el mapeo de servicios en `amexzone-bot/worker.js` cuando se definan los nombres finales de los nuevos templates para Amexzone EHR.
