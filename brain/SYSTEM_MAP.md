# 🧠 PROJECT BRAIN: Complete System Map (`SYSTEM_MAP.md`)

This file is the **Long-Term Architectural Memory** of **Clio Notes (`clio-suite`)**. Every AI agent (both Reinier's agent and his teammate's agent) must read this map to immediately understand the entire system without guessing or searching from scratch.

---

## 1. Infrastructure, URLs & Servers
- **GitHub Repository:** `https://github.com/rroa1122/clio-notes.git` (Main branch: `main`).
- **Production Web App:** `https://notes.clinicflow.dev` (hosted on VPS `root@clinicflow.dev` at `/var/www/clionotes`).
- **n8n AI Engine:** `https://n8n.clinicflow.dev` (Webhook: `/webhook/medical-note`, SQLite DB on VPS: `/root/n8n/database.sqlite`, Docker container: `n8n`).
- **Amexzone RPA Bot (Production):** `/root/amexzone-notes-bot/` on VPS (managed by PM2 process `amexzone-worker`). Local source code: `amexzone-bot/`.
- **Supabase Project:** `https://toisvwdmscmnogzcpeyj.supabase.co` (configured in `src/lib/supabaseClient.ts`).

---

## 2. Supabase Database Tables
All data persistence and RPA queues run through Supabase:
- **`notes`**: Clinical notes (TCM & Psychiatry), JSON content, signature status, and metadata.
- **`patients`**: Patient demographics, EMR ID, Case No, diagnoses, medications, and intake documents.
- **`amexzone_note_tasks`**: RPA queue table connecting Clio Notes (`TcmNoteShell.tsx` / `SyncPortal.tsx`) with the Playwright worker (`amexzone-bot/worker.js`).
- **`profiles`**: User profiles, roles, setup completion status, and clinic membership.
- **`clinics`**: Clinic/agency details and multi-tenant configuration.
- **`provider_integrations`**: Encrypted EHR credentials (Amexzone username/password per provider) used by the RPA bot and `SyncPortal.tsx`.
- **`audit_logs`**: HIPAA/security audit trail (`src/services/auditService.ts`, `src/pages/AuditLogs.tsx`).
- **`calendars` & `events`**: Provider scheduling and appointment conflict detection (`src/services/calendarService.ts`).
- **`clinic_call_intakes`**: Call intake records.

---

## 3. Complete Frontend Route & Module Map (`src/App.tsx`)

### A. Authentication, MFA & Security (`src/context/AuthContext.tsx`)
- `/login` (`src/pages/Login.tsx`) & `/signup` (`src/pages/Signup.tsx`)
- `/auth/invite` (`src/pages/auth/Invite.tsx`) & `/auth/reset` (`src/pages/auth/ResetPassword.tsx`)
- **MFA Flow:** `src/pages/MfaEnrollment.tsx` and `src/pages/MfaChallenge.tsx` (uses `src/components/ui/OtpInput.tsx`).
- **Onboarding Guard:** `src/components/auth/SetupGuard.tsx` -> redirects new users to `/setup` (`src/pages/Setup.tsx`).
- **Inactivity Lock:** `src/components/auth/ScreenLockOverlay.tsx`.

### B. Patients & Amexzone Intake (`src/pages/`)
- `/patients` (`src/pages/Patients.tsx`): Patient directory, creation (`src/notes-module/components/PatientCreateModal.tsx`), and editing (`PatientEditModal.tsx`).
- `/patients/:id` (`src/pages/PatientDetail.tsx`): Full patient chart, history calendar (`PatientHistoryCalendar.tsx`), and intake data.
- **Intake Processor:** `src/lib/services/amexzoneIntakeProcessor.ts` and `src/lib/services/patientIntakeService.ts` parse uploaded Amexzone intake/assessment documents to auto-populate patient demographics and clinical fields.

### C. Clinical Notes Module (`src/notes-module/`)
- `/notes/new` (`src/notes-module/pages/Record.tsx`):
  - Audio recording/dictation (`RecorderCard.tsx`), patient selector (`PatientSelector.tsx`), service/subTemplate selector, POS, time/units spinner, and TCM domain checkboxes.
  - Sends payload to n8n webhook (`https://n8n.clinicflow.dev/webhook/medical-note`).
- `/notes/history` (`src/notes-module/pages/NotesHistory.tsx`): List of all generated notes, filters, and sync statuses.
- `/notes/templates` (`src/notes-module/pages/Templates.tsx`): Template management (restricted to primary admin).
- **Note Rendering & Editing:**
  - `src/notes-module/components/TcmNoteShell.tsx`: Renders TCM notes, interactive edit mode, `[CONFIRM: ...]` amber badges, automatic `FOR TCM REVIEW` card, signature capture, and "Sync to Amexzone" trigger.
  - `src/notes-module/components/ClioNoteViewer.tsx`: Renders Psychiatry notes (`TabHPI.tsx`, `TabMeds.tsx`, `TabExam.tsx`, `TabROS.tsx`, `TabAssessment.tsx`, `TabScreenings.tsx`).
- **Printing & Signatures:**
  - `/notes/print/:id` (`src/notes-module/pages/PrintNote.tsx`, `src/notes-module/components/EcwPrintNote.tsx`, `NotePrintPreview.tsx`, `src/notes-module/lib/PDFService.ts`).
  - `/patients/print-assessment/:id` (`src/pages/PrintAssessment.tsx`).
  - `/sign-note/:token` (`src/notes-module/pages/SignNote.tsx`, `SignatureModal.tsx`, `SignaturePad.tsx`).

### D. EHR Sync Portal, Settings & Admin (`src/pages/`)
- `/sync` (`src/pages/SyncPortal.tsx`): Live dashboard for Amexzone RPA tasks (`amexzone_note_tasks`), credential status (`provider_integrations`), error formatting (`src/lib/services/syncErrorFormatter.ts`), and retry controls.
- `/settings` (`src/pages/Settings.tsx`): User and clinic settings.
- `/audit-logs` (`src/pages/AuditLogs.tsx`): Security and activity logs.
- `/platform-admin` (`src/pages/PlatformAdmin.tsx`): Super-admin portal.

---

## 4. The 3 Synchronized Layers for TCM Templates

Whenever creating or modifying a **TCM Template**, these 3 layers must stay in sync:

1. **Layer 1 — Frontend (`src/notes-module/`):**
   - `src/notes-module/pages/Record.tsx` (service selector, default POS, minutes/units, webhook payload).
   - `src/notes-module/lib/clioUtils.ts` (`getTemplateIdFromSubTemplate`, `normalizeTcmNote`).
   - `src/notes-module/lib/constants.ts` (`DEFAULT_TEMPLATES` catalog).
   - `src/notes-module/components/TcmNoteShell.tsx` (display, edit mode, `[CONFIRM: ...]` badges, and RPA task creation).
2. **Layer 2 — n8n AI Workflows (`scratch/`):**
   - Workflow JSONs: `scratch/*_workflow.json`.
   - Deployment script: `node scratch/sync_all_workflows.cjs` (uploads JSONs to VPS `/tmp/`, updates `/root/n8n/database.sqlite`, and restarts Docker `n8n`).
3. **Layer 3 — Amexzone RPA Bot (`amexzone-bot/`):**
   - `amexzone-bot/worker.js`: Polls `amexzone_note_tasks`, maps service names via `mapClioServiceToAmexzone`, and launches Playwright tasks (`src/tasks/progressNoteTask.js`).
   - `amexzone-bot/src/amexzone/encounterService.js`: Automates Amexzone EHR modal (`fillServiceModal`), selects service, POS, time/units, domains `1-12`, and pastes `summary_notes`.
   - Supporting RPA modules: `authService.js`, `sessionManager.js`, `browser.js`, `patientService.js`, `appointmentService.js`, `availabilityService.js`.

---

## 5. Master Table of TCM Templates

Official titles live in `TCM_CANONICAL_TITLES` (`clioUtils.ts`); Record forces them on every generated note and the Amexzone sync uses them literally. All v2 prompts follow the Documentation Standards v2 in `brain/LESSONS.md`.

| # | Service Name (UI, note & Amexzone) | `template_id` | Default POS | Default Time / Units | n8n Workflow File & ID | Status |
|---|---|---|---|---|---|---|
| 1 | `Initial Home Visit / Develop Intake` | `tcm_initial_home_visit_note` | `12 - Home` | `98 min` (`7u`) | `initial_home_visit_workflow.json` (`K3aJ8zeSNCBx6QFL`) | ✅ v2 |
| 2 | `New Referral - Initial Telephone Contact and Coordination of Initial Home Visit` | `tcm_case_assignment_note` | `11 - Office` | `25 min` (`2u`) | `case_assignment_workflow.json` (`K3zH8zeSNCBx6QFL`) | ✅ v2 |
| 3 | `Develop Assessment` | `tcm_assessment_note` | `12 - Home` | `113 min` (`8u`) | `assessment_workflow.json` (`GppDFTdj19n9o3Q2`) | ✅ v2 (branch) |
| 4 | `Adult Certification` | `tcm_adult_certification_note` | `11 - Office` | `33 min` (`2u`) | `adult_certification_workflow.json` (`K3vH8zeSNCBx6QFL`) | ✅ v2 (branch) |
| 5 | `Initial Service Plan Development` | `tcm_service_plan_note` | `11 - Office` | `100 min` (`7u`) | `service_plan_workflow.json` (`RvtViS0iE8lV67ye`) | ⏳ v2 pending |
| 6 | `Discuss and Sign Initial Services Plan` | `tcm_service_plan_discussion` | `12 - Home` | `68 min` (`5u`) | webhook `tcm-service-plan-discussion` — **workflow not in repo** | ⏳ needs prod export |
| 7 | `Psychiatric Medical Records Retrieval and Coordination of Care` | `tcm_gather_psy_note` | `11 - Office` | `41 min` (`3u`) | webhook `tcm-gather-psy-note` — **workflow not in repo** | ⏳ needs prod export |
| 8 | `PCP Medical Records Retrieval and Coordination of Care` | `tcm_gather_pcp_note` | `11 - Office` | `41 min` (`3u`) | webhook `tcm-gather-pcp-note` — **workflow not in repo** | ⏳ needs prod export |
| 9 | `Emergency Contact / Gather Information` | `tcm_pc_emergency_contact_note` | `11 - Office` | `23 min` (`2u`) | webhook `tcm-pc-emergency-contact-note` — **workflow not in repo** | ⏳ needs prod export |
| 10 | `TCM Progress Note` (Spaced / General) | `tcm_progress_note` | Variable | Variable | `tcm_workflow.json` (`edM28zeSNCBx6QFI`) | — |
