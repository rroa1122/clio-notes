---
trigger: always_on
---

# Reglas del Equipo y Flujo de Trabajo — Clio Notes (`clio-suite`)

## 1. Idioma y Confirmación
- **Explicaciones en Español:** Siempre explica qué cambiaste, qué hiciste y los resultados en español corto, claro y sencillo.
- **Pedir confirmación antes de implementar:** Antes de modificar código o desplegar, explica brevemente el plan y pide confirmación al usuario.

## 2. Arquitectura del Proyecto (3 Capas Sincronizadas)
Cualquier cambio en plantillas clínicas TCM o servicios debe mantener sincronizadas estas 3 capas:
1. **Frontend (React + TypeScript + Vite):**
   - `src/notes-module/pages/Record.tsx` (selector de servicios, POS, minutos/unidades por defecto, formulario).
   - `src/notes-module/lib/clioUtils.ts` (`getTemplateIdFromSubTemplate`, `normalizeTcmNote`).
   - `src/notes-module/lib/constants.ts` (nombres y mapeo de plantillas).
   - `src/notes-module/components/TcmNoteShell.tsx` (renderizado de nota, edición, badges `[CONFIRM: ...]`, payload de sincronización EHR).
2. **Workflows de IA en n8n (`scratch/`):**
   - Archivos JSON de workflows en `scratch/*_workflow.json`.
   - Script de sincronización a producción: `scratch/sync_all_workflows.cjs` (actualiza `/root/n8n/database.sqlite` en el VPS y reinicia el contenedor `n8n`).
3. **Amexzone RPA Bot (`amexzone-bot/`):**
   - `amexzone-bot/worker.js` (`mapClioServiceToAmexzone`, cola de trabajos de Supabase `ehr_sync_jobs`).
   - `amexzone-bot/src/amexzone/encounterService.js` (`fillServiceModal`, automatización Playwright hacia Amexzone EHR).

## 3. Programa de Flujo de Trabajo en Equipo (`npm run flow`)
Este repositorio incluye la herramienta CLI `scripts/flow.cjs` para que los desarrolladores y sus agentes trabajen sin pisarse cambios:

- **Ver estado actual:** `npm run flow -- status`
- **Traer últimos cambios del compañero (`origin/main`):** `npm run flow -- sync`
- **Iniciar una tarea nueva en rama limpia (`feat/...`):** `npm run flow -- start <nombre-tarea>`
- **Verificar compilación (`npm run build`), hacer commit y subir a GitHub:** `npm run flow -- save "<mensaje>"`
- **Desplegar a producción (`root@clinicflow.dev`):**
  - Todo: `npm run flow -- deploy all`
  - Solo Frontend (`/var/www/clionotes`): `npm run flow -- deploy web`
  - Solo Workflows n8n: `npm run flow -- deploy n8n`
  - Solo RPA Bot (`/root/amexzone-notes-bot`): `npm run flow -- deploy bot`

## 4. Fábrica de Software con IA (`npm run factory` y `factory/orders.json`)
- El tablero visual de la Fábrica de Software se abre en `http://localhost:4100` con `npm run factory` (`scripts/factory-server.cjs`).
- Las órdenes de trabajo del equipo viven en `factory/orders.json` y pasan por 4 estaciones (`plan` -> `build` -> `qa` -> `done`).
- Cuando el usuario pida *"Ejecuta la Fábrica de Software para la orden ORD-XXX"*:
  1. Lee la orden en `factory/orders.json` y presenta el plan breve pidiendo confirmación.
  2. Al confirmar, mueve la orden a `"stage": "build"` en `factory/orders.json` y delega en paralelo a los sub-agentes correspondientes (`clio-frontend-agent`, `clio-n8n-agent`, `clio-rpa-agent`).
  3. Pasa la orden a `"stage": "qa"`, ejecuta `clio-qa-agent` (`npm run build`), y si hay 0 errores pasa la orden a `"stage": "done"` con `"qaPassed": true`.

## 5. Regla de Seguridad antes de Guardar o Desplegar
- Nunca subas código roto: ejecuta siempre `npm run build` (o usa `npm run flow -- save "<mensaje>"` que lo ejecuta automáticamente) para verificar que TypeScript y Vite compilan con 0 errores.
