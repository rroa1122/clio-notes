# Clio Notes (`clio-suite`) — Guide for AI Agents & Developers

This repository contains the complete **Clio Notes** system (`https://notes.clinicflow.dev`), including the React Frontend, the clinical AI workflows in **n8n**, and the **Amexzone EHR RPA Sync Bot**.

## Core Rules for AI Agents
1. **Language:** Respond in the **same language the user writes in** (English or Spanish), while respecting any machine-local `user_global` rules.
2. **Confirmation:** Before implementing code changes or deploying, explain your plan briefly and **ask the user for confirmation**.
3. **Scope Lock (Team Safety):** Only touch the files and templates relevant to the user's current request. Do not alter or refactor unrelated templates or features created by the other developer.
4. **Build Verification:** Always verify that `npm run build` compiles with 0 errors before committing or pushing changes.

## Project Brain (`brain/`)
Before starting any task, read the persistent Project Brain:
- `brain/STATE.md` — Current project status and recent changes.
- `brain/SYSTEM_MAP.md` — Exact map of the 3 layers (Frontend, n8n, RPA Bot) and TCM templates table.
- `brain/LESSONS.md` — Clinical and technical rules that must never be violated.
- `brain/AGENTS_CATALOG.md` — Specialized sub-agents to invoke for each layer.

## Team Workflow CLI (`npm run flow`)
Both developers and AI agents can run these commands (`scripts/flow.cjs`):
- **Check status:** `npm run flow -- status`
- **Sync teammate's latest changes:** `npm run flow -- sync`
- **Create clean branch for a new task:** `npm run flow -- start <task-name>`
- **Build, commit, and push to GitHub:** `npm run flow -- save "<message>"`
- **Deploy to production (`clinicflow.dev`):**
  - `npm run flow -- deploy all` (Frontend + n8n + RPA Bot)
  - `npm run flow -- deploy web` (Frontend only)
  - `npm run flow -- deploy n8n` (n8n Workflows only)
  - `npm run flow -- deploy bot` (Amexzone RPA Bot only)
