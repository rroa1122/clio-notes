---
trigger: always_on
---

# Team Workflow & Architecture Rules — Clio Notes (`clio-suite`)

## 1. Language, Confirmation & Scope Lock
- **Language:** Respond in the **same language the user writes in** (English or Spanish), while honoring any local `user_global` rule on the developer's machine.
- **Confirmation:** Before modifying code or deploying, briefly explain your plan and ask the user for confirmation.
- **Scope Lock (Team Safety):** Never modify unrelated templates, components, or logic outside the user's current request.

## 2. Project Architecture (3 Synchronized Layers)
Any change to TCM clinical templates or services must keep these 3 layers synchronized:
1. **Frontend (React + TypeScript + Vite):**
   - `src/notes-module/pages/Record.tsx` (service selector, POS, default minutes/units, form).
   - `src/notes-module/lib/clioUtils.ts` (`getTemplateIdFromSubTemplate`, `normalizeTcmNote`).
   - `src/notes-module/lib/constants.ts` (template names and definitions).
   - `src/notes-module/components/TcmNoteShell.tsx` (note rendering, edit mode, `[CONFIRM: ...]` badges, EHR sync payload).
2. **n8n AI Workflows (`scratch/`):**
   - Workflow JSON files in `scratch/*_workflow.json`.
   - Production sync script: `scratch/sync_all_workflows.cjs` (updates `/root/n8n/database.sqlite` on the VPS and restarts the `n8n` container).
3. **Amexzone RPA Bot (`amexzone-bot/`):**
   - `amexzone-bot/worker.js` (`mapClioServiceToAmexzone`, Supabase `ehr_sync_jobs` queue).
   - `amexzone-bot/src/amexzone/encounterService.js` (`fillServiceModal`, Playwright automation for Amexzone EHR).

## 3. Team Workflow CLI (`npm run flow`)
Use `scripts/flow.cjs` so developers and their AI agents work without conflicts:
- **Check status:** `npm run flow -- status`
- **Pull latest teammate changes (`origin/main`):** `npm run flow -- sync`
- **Start a new feature branch (`feat/...`):** `npm run flow -- start <task-name>`
- **Verify build (`npm run build`), commit, and push to GitHub:** `npm run flow -- save "<message>"`
- **Deploy to production (`root@clinicflow.dev`):**
  - Everything: `npm run flow -- deploy all`
  - Frontend only (`/var/www/clionotes`): `npm run flow -- deploy web`
  - n8n Workflows only: `npm run flow -- deploy n8n`
  - RPA Bot only (`/root/amexzone-notes-bot`): `npm run flow -- deploy bot`

## 4. Safety Rule Before Saving or Deploying
- Never push broken code: always run `npm run build` (or use `npm run flow -- save "<message>"` which runs it automatically) to verify that TypeScript and Vite compile with 0 errors.
