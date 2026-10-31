# 🧠 CEREBRO DEL PROYECTO: Memoria Activa (`STATE.md`)

Este archivo registra el **Estado Actual del Trabajo** para que cualquier nueva conversación (de Reinier o de su compañero) retome exactamente donde quedamos sin perder contexto.

---

## Última Actualización
- **Fecha:** 2026-10-30
- **Rama Actual:** `feat/tcm-templates-v2` (commit `81168b1`)
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
2. **Capas Sincronizadas en Producción (`clinicflow.dev`):**
   - **Frontend:** Desplegado en `/var/www/clionotes` (`https://notes.clinicflow.dev`).
   - **n8n:** Base de datos SQLite actualizada con los 6 workflows y contenedor reiniciado.
   - **Amexzone RPA Bot:** Actualizados `worker.js` y `encounterService.js`, reiniciado en PM2 (`online`).
3. **CI/CD Automático de GitHub Actions (`deploy.yml`):**
   - Se configuró el trigger para que escuche tanto `main` como `feat/**` / `feat/*`, de modo que cada push en cualquier rama de trabajo despliegue automáticamente en `clinicflow.dev`.

---

## Próximos Pasos (Fase 2)
- Templates v2 para Initial Service Plan Development, Discuss and Sign Initial Services Plan, Psychiatric Records Retrieval, PCP Records Retrieval y Emergency Contact.
- Pruebas reales de generación de notas de Home Visit, Assessment y Referral en `https://notes.clinicflow.dev`.
