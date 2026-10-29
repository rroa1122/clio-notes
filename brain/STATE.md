# 🧠 CEREBRO DEL PROYECTO: Memoria Activa (`STATE.md`)

Este archivo registra el **Estado Actual del Trabajo** para que cualquier nueva conversación (de Reinier o de su compañero) retome exactamente donde quedamos sin perder contexto.

---

## Última Actualización
- **Fecha:** 2026-10-29
- **Rama Principal:** `main` (`https://github.com/rroa1122/clio-notes.git`)
- **Estado de Compilación (`npm run build`):** ✅ Limpio (0 errores)
- **Estado de Producción (`clinicflow.dev`):** ✅ Sincronizado (Web + n8n + RPA Bot)

---

## Lo que ya está Completado y Desplegado
1. **Template #1 (`Initial Home Visit / Develop Intake`):**
   - Configurado en `Record.tsx` (POS `12 - Home`, `98 min` / `7u`), `clioUtils.ts`, `constants.ts`, `TcmNoteShell.tsx`.
   - Workflow n8n `K3aJ8zeSNCBx6QFL` (`scratch/initial_home_visit_workflow.json`) con estructura de 6 párrafos y reglas `[CONFIRM: ...]`.
   - Mapeo literal en `amexzone-bot/worker.js` y `encounterService.js`.
2. **Template #2 (`Initial Referral / Case Assignment` -> `"New Referral - Initial Telephone Contact and Coordination of Initial Home Visit"`):**
   - Configurado en `Record.tsx` (POS `11 - Office`, `25 min` / `2u`), `clioUtils.ts`, `constants.ts`, `TcmNoteShell.tsx`.
   - Workflow n8n `K3zH8zeSNCBx6QFL` (`scratch/case_assignment_workflow.json`) con estructura de 4 párrafos y reglas `[CONFIRM: ...]`.
   - Mapeo literal en `amexzone-bot/worker.js` y `encounterService.js`.
3. **Sistema de Trabajo en Equipo y Fábrica de Software IA:**
   - `scripts/flow.cjs` (`npm run flow`) para sincronizar, crear ramas, compilar, subir a GitHub y desplegar.
   - `scripts/factory-server.cjs` (`npm run factory` en `http://localhost:4100`) y `factory/orders.json`.
   - Cerebro persistente en `brain/` (`SYSTEM_MAP.md`, `LESSONS.md`, `STATE.md`) y regla orquestadora permanente en `.agents/rules/orchestrator-brain.md`.

---

## Próximos Pasos / Pendientes
- Continuar con cualquier otro template TCM o ajuste funcional que Reinier o su compañero indiquen.
