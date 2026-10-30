# 🧠 CEREBRO DEL PROYECTO: Memoria Activa (`STATE.md`)

Este archivo registra el **Estado Actual del Trabajo** para que cualquier nueva conversación (de Reinier o de su compañero) retome exactamente donde quedamos sin perder contexto.

---

## Última Actualización
- **Fecha:** 2026-10-29
- **Rama Principal:** `main` (`https://github.com/rroa1122/clio-notes.git`)
- **Estado de Compilación (`npm run build`):** ✅ Limpio (0 errores)
- **Estado de Producción (`clinicflow.dev`):** ✅ Sincronizado (Web + n8n + RPA Bot)

---

## Lo que ya está Completado y Desplegado en Producción
1. **Templates TCM v2 (Notas Exhaustivas & Barrera de Auditoría Pending TCM Review):**
   - Fusionado desde `feat/tcm-templates-v2` a `main` y desplegado en `clinicflow.dev`.
   - Workflows n8n actualizados (`K3aJ8zeSNCBx6QFL` y `K3zH8zeSNCBx6QFL`) para leer `tcm_social_needs` y generar notas exhaustivas con viñetas y `[CONFIRM: ...]`.
   - `TcmNoteShell.tsx`: bloquea firma y sync a Amexzone si hay `[CONFIRM: ...]`, guardando como `pending_tcm_review`.
   - `amexzone-bot/worker.js`: rechaza notas con `[CONFIRM:` como segunda barrera de protección.
   - Frontend, n8n y RPA Bot sincronizados y reiniciados en producción.
2. **Sistema de Trabajo en Equipo y Fábrica de Software IA:**
   - `scripts/flow.cjs` (`npm run flow`) para sincronizar, crear ramas, compilar, subir a GitHub y desplegar.
   - `scripts/factory-server.cjs` (`npm run factory` en `http://localhost:4100`) y `factory/orders.json`.
   - Cerebro persistente en `brain/` (`SYSTEM_MAP.md`, `LESSONS.md`, `STATE.md`, `AGENTS_CATALOG.md`) y regla orquestadora permanente en `.agents/rules/orchestrator-brain.md`.

---

## Próximos Pasos (Fase 2)
- Templates v2 para Assessment, Adult Certification (separar de `tcm_assessment_note`), Initial Service Plan Development, Discuss and Sign Initial Services Plan, Psychiatric Records Retrieval, PCP Records Retrieval y Emergency Contact.
- Fase 3: Cola de revisión manual (filtrar notas con `meta.review_status = 'pending_tcm_review'`).
