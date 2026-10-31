# 🧠 CEREBRO DEL PROYECTO: Memoria Activa (`STATE.md`)

Este archivo registra el **Estado Actual del Trabajo** para que cualquier nueva conversación (de Reinier o de su compañero) retome exactamente donde quedamos sin perder contexto.

---

## Última Actualización
- **Fecha:** 2026-10-30
- **Rama Actual:** `feat/tcm-templates-v2`
- **Estado de Compilación (`npm run build`):** ✅ Limpio (0 errores)
- **Estado de Producción (`clinicflow.dev`):** ✅ Desplegado al 100% (Frontend + n8n + RPA Bot)

---

## Lo que ya está Completado y Desplegado en Producción
1. **Templates TCM v2 (Commits hasta `81168b1` de Claude / alegidos):**
   - **Formato determinista de nombres de pacientes:** "First Last" en la primera mención y luego primer nombre.
   - **Badges `[CONFIRM]` clickeables interactivos:** Permiten al clínico resolver y completar los datos directamente en la nota y sincronizar con la ficha del paciente.
   - **Títulos oficiales de intake:** Actualizados para todos los templates de admisión.
   - **Develop Assessment y Adult Certification v2:** Templates enriquecidos con estándares oficiales de la agencia.
   - **Seguridad y Orientación:** Restauración de reglas de orientación y seguridad por excepción.
   - **Eliminación de narración de vacíos (Gap Narration):** Se eliminaron frases redundantes de datos faltantes en los prompts y en el frontend (`stripGapNarration`).
   - **Modal de confirmación interactivo en Clio:** Diálogo propio con opciones para completar TCM Social o continuar.
2. **Exportación de los 4 Workflows Restantes de n8n:**
   - Se exportaron directamente desde la base de datos de n8n en el VPS y se agregaron a `scratch/`:
     - `scratch/gather_pcp_record_workflow.json` (`tcm-gather-pcp-note` - ID: `K3rH8zeSNCBx6QFL`)
     - `scratch/gather_psy_record_workflow.json` (`tcm-gather-psy-note` - ID: `K3sH8zeSNCBx6QFL`)
     - `scratch/pc_emergency_contact_workflow.json` (`tcm-pc-emergency-contact-note` - ID: `K3tH8zeSNCBx6QFL`)
     - `scratch/service_plan_discussion_workflow.json` (`tcm-service-plan-discussion` - ID: `RvtViS0iE8lV67yf`)
   - Se actualizaron en `scratch/sync_all_workflows.cjs` para sincronización automática continua.
3. **CI/CD Automático de GitHub Actions (`deploy.yml`):**
   - Configurado para escuchar ramas `main` y `feat/**` / `feat/*`, desplegando automáticamente en cada push.

---

## Próximos Pasos (Fase 2)
- Ajustes de prompts v2 en los 4 nuevos workflows para estandarizarlos a TCM v2.
- Pruebas reales de notas en `https://notes.clinicflow.dev`.
