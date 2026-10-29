# 🤖 CEREBRO DEL PROYECTO: Catálogo de Sub-Agentes (`AGENTS_CATALOG.md`)

Este archivo es el registro oficial de los **Sub-Agentes Especializados** de la Fábrica de Software de Clio Notes.
El Agente Orquestador debe definir (`define_subagent`) y utilizar (`invoke_subagent`) estos agentes en cada sesión según la tarea, y **debe registrar aquí automáticamente cualquier nuevo agente** que cree cuando detecte una nueva tarea repetitiva.

---

## 1. Agentes Activos en la Fábrica

| # | Nombre (`Name`) | Rol / Especialidad | Archivos / Herramientas que controla | Cuándo invocarlo |
|---|---|---|---|---|
| 1 | `clio-docx-extractor-agent` | **Analista de Documentos Clínicos (`.docx`)** | Extrae `word/document.xml` de archivos `.docx` subidos por el usuario | Cada vez que el usuario suba o mencione un documento Word con instrucciones de un Template TCM |
| 2 | `clio-frontend-agent` | **Constructor de Frontend Web (React/TS)** | `src/notes-module/pages/Record.tsx`, `clioUtils.ts`, `constants.ts`, `TcmNoteShell.tsx` | Para cambios en formularios, normalización de notas, visualización de párrafos, badges `[CONFIRM: ...]` y selección de servicios/POS |
| 3 | `clio-n8n-agent` | **Constructor de IA Clínica (n8n Workflows)** | `scratch/*_workflow.json`, `scratch/sync_all_workflows.cjs` | Para crear o ajustar prompts de OpenAI, reglas de párrafos y workflows en `/root/n8n/database.sqlite` |
| 4 | `clio-rpa-agent` | **Constructor de RPA Bot (Amexzone EHR)** | `amexzone-bot/worker.js`, `amexzone-bot/src/amexzone/encounterService.js` | Para ajustar el mapeo de nombres de servicio (`mapClioServiceToAmexzone`) y llenado del modal en Amexzone (`fillServiceModal`) |
| 5 | `clio-qa-agent` | **Inspector de Calidad (QA & Build)** | `npm run build` (`tsc -b && vite build`) | Obligatorio al terminar cualquier cambio de código antes de guardar o desplegar |
| 6 | `clio-devops-supabase-agent` | **Especialista en Supabase y Despliegue VPS** | Supabase (`ehr_sync_jobs`), `scripts/flow.cjs`, SSH a `root@clinicflow.dev`, PM2 y Docker | Para revisar colas de sincronización en Supabase, logs del bot en PM2 o desplegar a producción |

---

## 2. Protocolo para Auto-Crear Nuevos Agentes (Evolución Automática)
Cuando el Orquestador detecte una tarea nueva que:
- Se repite 2 o más veces, o
- Requiere un dominio técnico específico (ej. reportes PDF en `EcwPrintNote.tsx`, auditoría de seguridad/MFA, migraciones SQL),

**El Orquestador debe (sin esperar a que el usuario lo pida):**
1. Llamar a `define_subagent` para crear el nuevo agente especializado en la sesión actual.
2. Agregarlo a la tabla de este archivo (`brain/AGENTS_CATALOG.md`) para que quede persistente para futuras sesiones y para el compañero de equipo.
3. Si el proceso tiene múltiples pasos fijos, crear también una receta en `.agents/skills/<nombre-receta>/SKILL.md`.
