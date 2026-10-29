# Clio Notes (`clio-suite`) — Guía para Agentes de IA y Desarrolladores

Este repositorio contiene el sistema completo de **Clio Notes** (`https://notes.clinicflow.dev`), incluyendo el Frontend, los workflows de generación clínica en **n8n** y el **RPA Bot de sincronización con Amexzone EHR**.

## Reglas Principales para el Agente
1. **Idioma:** Responde y explica siempre los cambios en **español corto, claro y sencillo**.
2. **Confirmación:** Antes de empezar a implementar código o desplegar, explica tu plan y **pide confirmación al usuario**.
3. **Verificación:** Siempre verifica que `npm run build` compile sin errores antes de hacer commit o subir cambios.

## Estructura del Proyecto
- **`src/`** — Aplicación Frontend (React 19 + TypeScript + Vite + Tailwind + Supabase).
  - `src/notes-module/pages/Record.tsx`: Grabación/dictado de notas TCM y selector de servicios/plantillas.
  - `src/notes-module/lib/clioUtils.ts`: Normalización de notas TCM (`normalizeTcmNote`) y mapeo de plantillas.
  - `src/notes-module/lib/constants.ts`: Catálogo de plantillas TCM.
  - `src/notes-module/components/TcmNoteShell.tsx`: Vista y edición interactiva de notas TCM y envío a la cola de sincronización EHR (`ehr_sync_jobs`).
- **`scratch/*_workflow.json` y `scratch/sync_all_workflows.cjs`** — Workflows de IA en n8n para cada plantilla TCM y script de sincronización a `/root/n8n/database.sqlite`.
- **`amexzone-bot/`** — Worker RPA en Node.js + Playwright (`worker.js` y `src/amexzone/encounterService.js`) que toma trabajos de Supabase y los registra automáticamente en Amexzone EHR.
- **`scripts/flow.cjs`** — Programa CLI unificado para el trabajo en equipo entre desarrolladores y agentes.

## Cómo Usar el Programa de Flujo de Trabajo (`npm run flow`)
Tanto el usuario (menú interactivo con `npm run flow`) como el agente de IA pueden ejecutar estos comandos:

- **Ver estado:** `npm run flow -- status`
- **Sincronizar cambios del compañero:** `npm run flow -- sync`
- **Crear rama para nueva tarea:** `npm run flow -- start <nombre-tarea>`
- **Compilar, guardar commit y subir a GitHub:** `npm run flow -- save "<mensaje>"`
- **Desplegar a producción (`clinicflow.dev`):**
  - `npm run flow -- deploy all` (Frontend + n8n + RPA Bot)
  - `npm run flow -- deploy web` (Solo Frontend)
  - `npm run flow -- deploy n8n` (Solo Workflows n8n)
  - `npm run flow -- deploy bot` (Solo RPA Bot Amexzone)
