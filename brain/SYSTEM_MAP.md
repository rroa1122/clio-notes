# 🧠 CEREBRO DEL PROYECTO: Mapa del Sistema (`SYSTEM_MAP.md`)

Este archivo es la **Memoria de Largo Plazo** de **Clio Notes (`clio-suite`)**. Todo agente de IA debe consultar este mapa para conocer al instante dónde vive cada componente sin tener que explorar desde cero.

---

## 1. Infraestructura y Servidores
- **Repositorio GitHub:** `https://github.com/rroa1122/clio-notes.git` (Rama principal: `main`).
- **Servidor VPS Producción:** `root@clinicflow.dev` (Llave SSH local: `C:\Users\REINIER\.ssh\id_rsa_clinicflow`).
  - **Frontend Producción:** `/var/www/clionotes` -> `https://notes.clinicflow.dev`
  - **Base de Datos n8n:** `/root/n8n/database.sqlite` (Contenedor Docker: `n8n`, Webhook principal: `https://n8n.clinicflow.dev/webhook/medical-note`).
  - **RPA Bot Producción:** `/root/amexzone-notes-bot/` (Proceso PM2: `amexzone-worker`).
- **Supabase:** `https://toisvwdmscmnogzcpeyj.supabase.co` (`src/lib/supabaseClient.ts`). Cola de sincronización RPA: tabla `ehr_sync_jobs`.

---

## 2. Mapa de las 3 Capas Sincronizadas

Cada vez que se crea o ajusta un **Template TCM**, intervienen exactamente estos archivos:

### Capa 1: Frontend Web (`src/notes-module/`)
1. `src/notes-module/pages/Record.tsx`:
   - Selector de servicio (`subTemplate`), valores por defecto de **POS** (`place_of_service`), **minutos** (`duration_minutes`) y **unidades**.
   - Construcción del payload que se envía al webhook de n8n (`https://n8n.clinicflow.dev/webhook/medical-note`).
2. `src/notes-module/lib/clioUtils.ts`:
   - `getTemplateIdFromSubTemplate`: Mapea el nombre del servicio seleccionado al `template_id` interno.
   - `normalizeTcmNote`: Normaliza el JSON que devuelve n8n (respeta saltos de párrafo `\n\n`, viñetas `•`, múltiples dominios seleccionados y títulos exactos de servicio).
3. `src/notes-module/lib/constants.ts`:
   - `DEFAULT_TEMPLATES`: Catálogo de plantillas y sus campos (`TCM_DOMAINS`, `Progress Note`, `Facility`, `Summary`).
4. `src/notes-module/components/TcmNoteShell.tsx`:
   - Vista previa y modo edición de la nota generada.
   - Resalta etiquetas `[CONFIRM: ...]` en color ámbar y muestra la tarjeta automática **`FOR TCM REVIEW`** al final.
   - Envía el trabajo a Supabase (`ehr_sync_jobs`) al presionar sincronizar con Amexzone.

### Capa 2: Workflows de IA Clínica en n8n (`scratch/`)
- Script de despliegue a n8n: `node scratch/sync_all_workflows.cjs` (sube los JSON a `/tmp/`, actualiza `/root/n8n/database.sqlite` con Python y reinicia el contenedor `n8n`).
- Archivos de Workflows:
  - `scratch/tcm_workflow.json` -> Router principal y notas generales TCM.
  - `scratch/initial_home_visit_workflow.json` (`ID: K3aJ8zeSNCBx6QFL`) -> Template #1 (`Initial Home Visit / Develop Intake`).
  - `scratch/case_assignment_workflow.json` (`ID: K3zH8zeSNCBx6QFL`) -> Template #2 (`New Referral - Initial Telephone Contact and Coordination of Initial Home Visit`).
  - `scratch/assessment_workflow.json` -> Template de `Assessment`.
  - `scratch/service_plan_workflow.json` -> Template de `Service Plan Development`.
  - `scratch/adult_certification_workflow.json` -> Template de `Adult Certification`.

### Capa 3: Amexzone RPA Bot (`amexzone-bot/`)
1. `amexzone-bot/worker.js`:
   - Escucha `ehr_sync_jobs` en Supabase.
   - `mapClioServiceToAmexzone`: Traduce o pasa literal el nombre del servicio hacia Amexzone EHR.
2. `amexzone-bot/src/amexzone/encounterService.js`:
   - `fillServiceModal`: Selecciona el servicio exacto en el modal de Amexzone, marca los dominios (`1` al `12`), el POS, el tiempo/unidades y pega el `summary_notes`.

---

## 3. Tabla Maestra de Templates TCM Configurados

| # | Nombre del Servicio (UI & Amexzone) | `template_id` | POS por Defecto | Tiempo / Unidades | Workflow n8n | Estado |
|---|---|---|---|---|---|---|
| 1 | `Initial Home Visit / Develop Intake` | `tcm_initial_home_visit_note` | `12 - Home` | `98 min` (`7u`) | `initial_home_visit_workflow.json` (`K3aJ8zeSNCBx6QFL`) | ✅ Perfeccionado y en Producción |
| 2 | `New Referral - Initial Telephone Contact and Coordination of Initial Home Visit` | `tcm_case_assignment_note` | `11 - Office` | `25 min` (`2u`) | `case_assignment_workflow.json` (`K3zH8zeSNCBx6QFL`) | ✅ Perfeccionado y en Producción |
| 3 | `Assessment` | `tcm_assessment_note` | `12 - Home` / `11 - Office` | Variable | `assessment_workflow.json` | ⏳ Disponible para ajustes |
| 4 | `TCM Service Plan Development` | `tcm_service_plan_note` | `11 - Office` | Variable | `service_plan_workflow.json` | ⏳ Disponible para ajustes |
| 5 | `Adult Certification` | `tcm_adult_certification_note` | `11 - Office` | Variable | `adult_certification_workflow.json` | ⏳ Disponible para ajustes |
| 6 | `TCM Progress Note` (Spaced / General) | `tcm_progress_note` | Variable | Variable | `tcm_workflow.json` | ⏳ Disponible para ajustes |
