# 🤖 PROJECT BRAIN: Specialized Sub-Agents Catalog (`AGENTS_CATALOG.md`)

This file is the official registry of the **9 Specialized Sub-Agents** in the Clio Notes AI Software Factory.
The Orchestrator Agent must define (`define_subagent`) and invoke (`invoke_subagent`) these agents according to the task, and **must automatically register here any new agent** created when a new repetitive task is detected.

---

## 1. Active Agents Squad (9 Core Roles)

| # | Name (`Name`) | Role / Specialty | Files / Tools Controlled | When to Invoke |
|---|---|---|---|---|
| 1 | `clio-docx-extractor-agent` | **Clinical Specs Analyst (`.docx`)** | Extracts `word/document.xml` from `.docx` files uploaded by the user | Whenever the user uploads or references a Word document with TCM Template specs |
| 2 | `clio-frontend-agent` | **Frontend Web Builder (React/TS)** | `src/notes-module/pages/Record.tsx`, `clioUtils.ts`, `constants.ts`, `TcmNoteShell.tsx` | For form changes, note normalization, paragraph rendering, `[CONFIRM: ...]` badges, and POS/service selection |
| 3 | `clio-n8n-agent` | **Clinical AI Builder (n8n Workflows)** | `scratch/*_workflow.json`, `scratch/sync_all_workflows.cjs` | For creating or updating OpenAI prompts, paragraph rules, and workflows in `/root/n8n/database.sqlite` |
| 4 | `clio-rpa-agent` | **RPA Bot Builder (Amexzone EHR)** | `amexzone-bot/worker.js`, `amexzone-bot/src/amexzone/encounterService.js` | For updating service name mappings (`mapClioServiceToAmexzone`) and Amexzone modal automation (`fillServiceModal`) |
| 5 | `clio-qa-agent` | **Quality Inspector (QA & Build)** | `npm run build` (`tsc -b && vite build`) | Mandatory after any code change before committing or deploying |
| 6 | `clio-code-reviewer-agent` | **The Guardian (Code Review & Scope Lock)** | `git status -s`, `git diff`, security & Scope Lock audit | Before saving/pushing to GitHub to ensure no teammate code or unrelated template was altered |
| 7 | `clio-debugger-agent` | **The Detective (Live Bug & Log Hunter)** | `pm2 logs amexzone-worker`, `docker logs n8n`, Supabase `ehr_sync_jobs` errors | Whenever a note fails to generate in n8n, fails to sync to Amexzone, or throws a runtime error |
| 8 | `clio-visual-verifier-agent` | **Visual Browser Inspector (Playwright UI)** | Headless Chromium / Playwright screenshots & DOM checks | When verifying visual UI changes, dark/light mode layouts, or PDF print views |
| 9 | `clio-devops-supabase-agent` | **Supabase & VPS Deployment Specialist** | Supabase (`ehr_sync_jobs`, RLS, tables), `scripts/flow.cjs`, SSH `root@clinicflow.dev` | For database migrations/queries and production deployments to `clinicflow.dev` |

---

## 2. Protocol for Auto-Creating New Agents (Self-Evolution)
Whenever the Orchestrator detects a task that:
- Repeats 2 or more times, or
- Requires a dedicated technical domain not yet covered above,

**The Orchestrator must (without waiting for the user to ask):**
1. Call `define_subagent` to create the new specialized agent in the current session.
2. Add it to the table in this file (`brain/AGENTS_CATALOG.md`) so it persists for future sessions and for the teammate.
3. If the workflow involves multiple fixed steps, also save a reusable skill in `.agents/skills/<skill-name>/SKILL.md`.
