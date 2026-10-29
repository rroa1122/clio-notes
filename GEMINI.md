# Clio Notes (`clio-suite`) — Workspace Instructions & Project Brain

Lee y sigue siempre las instrucciones definidas en:
1. **El Cerebro del Proyecto (`brain/`):**
   - `brain/STATE.md` (Estado actual del trabajo y qué se hizo por última vez).
   - `brain/SYSTEM_MAP.md` (Mapa exacto de las 3 capas: Frontend, Workflows n8n y RPA Bot Amexzone).
   - `brain/LESSONS.md` (Reglas clínicas y técnicas que nunca se deben violar).
2. **Reglas de Orquestación y Equipo:**
   - `.agents/rules/orchestrator-brain.md` (Cómo crear y usar siempre los sub-agentes especializados y actualizar el Cerebro al terminar).
   - `.agents/rules/team-workflow.md` y `AGENTS.md`.

## Reglas de Oro:
- Explica siempre lo que hiciste o cambiaste en **español corto, claro y sencillo**.
- Pide confirmación al usuario antes de empezar a implementar cambios.
- Usa `npm run flow -- status | sync | start | save | deploy` (`scripts/flow.cjs`) para gestionar ramas, sincronización en equipo en GitHub (`https://github.com/rroa1122/clio-notes.git`) y despliegues a `clinicflow.dev`.
