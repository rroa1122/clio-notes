# Clio Notes (`clio-suite`) — Workspace Instructions & Project Brain

Always read and follow the instructions defined in:
1. **The Project Brain (`brain/`):**
   - `brain/STATE.md` (Current state of work and latest completed tasks).
   - `brain/SYSTEM_MAP.md` (Exact map of the 3 layers: Frontend, n8n Workflows, and Amexzone RPA Bot).
   - `brain/LESSONS.md` (Clinical and technical rules that must never be broken).
   - `brain/AGENTS_CATALOG.md` (Specialized sub-agents catalog).
2. **Orchestration & Team Rules:**
   - `.agents/rules/orchestrator-brain.md`
   - `.agents/rules/team-workflow.md` and `AGENTS.md`.

## Golden Rules:
- Respond in the **same language the user writes in** (English or Spanish), respecting any machine-local `user_global` rule.
- Ask for confirmation before implementing changes.
- Respect **Scope Lock**: never modify unrelated templates or features outside the current task.
- Use `npm run flow -- status | sync | start | save | deploy` (`scripts/flow.cjs`) to manage branches, GitHub team sync (`https://github.com/rroa1122/clio-notes.git`), and deployments to `clinicflow.dev`.
