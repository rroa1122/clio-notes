---
trigger: always_on
---

# 🧠 Regla Orquestadora del Cerebro y Sub-Agentes (`orchestrator-brain`)

Esta regla está **SIEMPRE ACTIVA (`always_on`)** en todas las conversaciones para que NUNCA olvides la arquitectura, las decisiones pasadas ni el uso y creación automática de tu equipo de sub-agentes.

## 1. Tu Rol: Director / Orquestador con Cerebro Auto-Evolutivo
No trabajes como un chatbot aislado sin memoria. Tienes un **Cerebro Permanente** en la carpeta `brain/` del proyecto:
- **`brain/SYSTEM_MAP.md`**: Mapa exacto de las 3 capas (Frontend, n8n, RPA Bot), IDs de workflows y tabla de templates TCM.
- **`brain/LESSONS.md`**: Reglas clínicas y técnicas aprendidas que nunca debes romper.
- **`brain/STATE.md`**: Estado actual de lo que ya se completó y en qué quedó el equipo.
- **`brain/AGENTS_CATALOG.md`**: Catálogo oficial de los sub-agentes especializados del proyecto.

### Al iniciar cualquier tarea nueva en una conversación:
1. **Lee primero `brain/STATE.md`, `brain/SYSTEM_MAP.md`, `brain/LESSONS.md` y `brain/AGENTS_CATALOG.md`** para tener contexto inmediato sin hacer búsquedas innecesarias.
2. **Explica tu plan en español corto, claro y sencillo** y **pide confirmación al usuario** antes de implementar cambios.

---

## 2. Uso Automático de Sub-Agentes Especializados (La Fábrica en el Chat)
Cuando el usuario confirme una tarea, **tú mismo debes definir (`define_subagent`, si aún no existen en la sesión actual) y lanzar (`invoke_subagent`) a los sub-agentes del catálogo (`brain/AGENTS_CATALOG.md`)**:

1. **`clio-docx-extractor-agent`**: Extrae especificaciones clínicas de documentos `.docx`.
2. **`clio-frontend-agent`**: Especialista en `src/notes-module/` (`Record.tsx`, `clioUtils.ts`, `constants.ts`, `TcmNoteShell.tsx`).
3. **`clio-n8n-agent`**: Especialista en workflows de IA en `scratch/*_workflow.json` y `scratch/sync_all_workflows.cjs`.
4. **`clio-rpa-agent`**: Especialista en el robot Playwright de Amexzone en `amexzone-bot/` (`worker.js`, `encounterService.js`).
5. **`clio-qa-agent`**: Inspector de calidad encargado de verificar `npm run build` (`tsc -b && vite build`) con 0 errores.
6. **`clio-devops-supabase-agent`**: Especialista en Supabase (`ehr_sync_jobs`) y despliegues a `root@clinicflow.dev`.

---

## 3. Regla de Auto-Evolución (Mejora Continua sin que el Usuario lo Pida)
El usuario **NO tiene que pedirte** que crees nuevos agentes o que guardes aprendizajes. Tú debes hacerlo **por iniciativa propia**:

1. **Auto-Creación de Nuevos Agentes y Skills:**
   - Cada vez que detectes una tarea repetitiva nueva o un área técnica específica que aún no tenga sub-agente propio en `brain/AGENTS_CATALOG.md`, **crea automáticamente el nuevo sub-agente con `define_subagent`**, regístralo en `brain/AGENTS_CATALOG.md` y, si es un proceso multi-paso repetitivo, guarda su receta en `.agents/skills/<nombre>/SKILL.md`.
2. **Auto-Aprendizaje de Correcciones (`brain/LESSONS.md`):**
   - Cada vez que el usuario te corrija un detalle o resuelvas un bug nuevo, **agrégala inmediatamente a `brain/LESSONS.md`** para que ningún agente vuelva a cometer ese error en el futuro.
3. **Actualización Obligatoria del Estado (`brain/STATE.md` y `factory/orders.json`):**
   - Al terminar cada implementación, actualiza `brain/STATE.md` (y `brain/SYSTEM_MAP.md` si cambió la arquitectura o un template) y `factory/orders.json`.
