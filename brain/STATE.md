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
- **Selector Unificado de Encuentro Clínico (`UnifiedTimePicker`):**
  - Componente unificado para hora de inicio (`In`), hora de fin (`Out`), duración y unidades clínicas TCM con chips de 1 toque (`15m`, `30m`, `45m`, `60m`, `90m`, `120m`).
  - Segmented control AM/PM, botón "Ahora", auto-sincronización en vivo sin botón redundante de confirmación, y desplegado a producción.
1. **Templates TCM v2 (Commits hasta `81168b1` de Claude / alegidos):**
   - **Formato determinista de nombres de pacientes:** "First Last" en la primera mención y luego primer nombre.
   - **Badges `[CONFIRM]` clickeables interactivos:** Permiten al clínico resolver y completar los datos directamente en la nota y sincronizar con la ficha del paciente.
   - **Títulos oficiales de intake:** Actualizados para todos los templates de admisión.
   - **Develop Assessment y Adult Certification v2:** Templates enriquecidos con estándares oficiales de la agencia.
   - **Seguridad y Orientación:** Restauración de reglas de orientación y seguridad por excepción.
   - **Eliminación de narración de vacíos (Gap Narration):** Se eliminaron frases redundantes de datos faltantes en los prompts y en el frontend (`stripGapNarration`).
   - **Modal de confirmación interactivo en Clio:** Diálogo propio con opciones para completar TCM Social o continuar.
2. **Exportación e Integración de los 10 Workflows de n8n:**
   - Todos los 10 workflows ahora residen formalmente en `scratch/`:
     - `initial_home_visit_workflow.json`
     - `case_assignment_workflow.json`
     - `assessment_workflow.json`
     - `adult_certification_workflow.json`
     - `service_plan_workflow.json`
     - `gather_pcp_record_workflow.json`
     - `gather_psy_record_workflow.json`
     - `pc_emergency_contact_workflow.json`
     - `service_plan_discussion_workflow.json`
     - `tcm_workflow.json`
   - Se configuró [`scratch/sync_all_workflows.cjs`](scratch/sync_all_workflows.cjs) de forma multiplataforma (Windows y Linux en GitHub Actions) para inyectar los 10 workflows en la base de datos de n8n.
3. **CI/CD Automático de GitHub Actions (`deploy.yml`):**
   - Configurado para escuchar ramas `main` y `feat/**` / `feat/*`, desplegando automáticamente en cada push de Claude o el equipo.
4. **Protocolo de Colaboración Multi-Agente (Anti-Conflicto):**
   - Documentado en `brain/SYSTEM_MAP.md` sección 6 para evitar bloqueos y colisiones entre Claude y Antigravity.
5. **Supervisor Feedback Loop (Base de Datos & Reglas por Perfil):**
   - Creada y aplicada la migración `supabase/migrations/20261031_supervisor_feedback_loop.sql`.
   - Tablas `public.supervisor_feedback` y `public.documentation_rules` con RLS, índices, triggers y vista `supervisor_feedback_panel` activas en Supabase.

---

## Próximos Pasos
- Implementar en Frontend (`TcmNoteShell.tsx` o modal) la acción para que el CM pegue el feedback del supervisor y solicite la corrección + propuesta de regla.
- Inyectar reglas aprobadas de `documentation_rules` en el payload de `Record.tsx` hacia n8n.
- Claude puede actualizar los prompts de los 4 nuevos workflows para estandarizarlos a v2.
- Actualizar el mapeo de servicios en `amexzone-bot/worker.js` cuando se definan los nombres finales de los nuevos templates para Amexzone EHR.
