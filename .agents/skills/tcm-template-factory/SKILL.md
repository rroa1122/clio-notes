---
name: tcm-template-factory
description: Receta automática de la Fábrica de Software para crear o perfeccionar cualquier Template TCM en las 3 capas (Frontend, n8n y RPA Bot Amexzone) a partir de un documento Word (.docx) o instrucciones clínicas.
---

# Receta de Fábrica: Creación / Ajuste de Template TCM (`tcm-template-factory`)

Usa esta receta cada vez que el usuario pida agregar, corregir o ajustar una plantilla clínica de TCM.

## Paso 1: Extracción y Planificación (Cerebro + `clio-docx-extractor-agent`)
1. Lee `brain/SYSTEM_MAP.md` y `brain/LESSONS.md`.
2. Si hay un archivo `.docx`, lanza `clio-docx-extractor-agent` para extraer:
   - Nombre exacto del servicio en Clio Notes y en Amexzone EHR.
   - POS por defecto (`11 - Office`, `12 - Home`, etc.) y duración (`minutos` y `unidades`).
   - Estructura de párrafos, viñetas (`•`) y etiquetas `[CONFIRM: ...]`.
3. Presenta el plan corto en español al usuario y **pide confirmación**.

## Paso 2: Construcción en Paralelo (Los 3 Sub-Agentes Constructores)
Una vez confirmado por el usuario, lanza en paralelo:
1. **`clio-frontend-agent`**:
   - Actualiza `src/notes-module/pages/Record.tsx` (selector, POS, minutos, unidades, y exclusión de medicamentos sintéticos si aplica `[CONFIRM: ...]`).
   - Actualiza `src/notes-module/lib/clioUtils.ts` (`getTemplateIdFromSubTemplate` y `normalizeTcmNote` preservando `\n\n` y `•`).
   - Actualiza `src/notes-module/lib/constants.ts` y `src/notes-module/components/TcmNoteShell.tsx`.
2. **`clio-n8n-agent`**:
   - Crea o actualiza `scratch/<template>_workflow.json` con el prompt clínico exacto y reglas anti-fabricación.
   - Registra el archivo en `scratch/sync_all_workflows.cjs`.
3. **`clio-rpa-agent`**:
   - Verifica y actualiza `mapClioServiceToAmexzone` en `amexzone-bot/worker.js` y `fillServiceModal` en `amexzone-bot/src/amexzone/encounterService.js` para que el nombre del servicio pase exactamente como lo espera Amexzone EHR.

## Paso 3: Inspección de Calidad (`clio-qa-agent`)
- Lanza `clio-qa-agent` para ejecutar `npm run build` (`tsc -b && vite build`) y confirmar **0 errores**.

## Paso 4: Despliegue y Actualización del Cerebro
- Despliega con `npm run flow -- deploy all` (o los módulos afectados).
- Actualiza `brain/SYSTEM_MAP.md`, `brain/STATE.md` y `factory/orders.json`.
