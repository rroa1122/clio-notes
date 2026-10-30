# 🧠 CEREBRO DEL PROYECTO: Lecciones y Reglas Técnicas (`LESSONS.md`)

Este archivo es la **Memoria Episódica** del proyecto. Contiene errores ya resueltos y reglas críticas que **ningún agente ni sub-agente debe violar**.

---

## 1. Reglas Clínicas y de Datos (Templates TCM)
1. **Regla Anti-Fabricación (`[CONFIRM: ...]`):**
   - Nunca inventar datos clínicos que no estén en el audio, transcripción o formulario.
   - En `Record.tsx`, **NO inyectar medicamentos sintéticos de relleno** (como `Fluoxetine`, `Buspirone`, `Hydroxyzine`) cuando se usan plantillas estrictas con `[CONFIRM: ...]`.
   - En `TcmNoteShell.tsx`, cualquier etiqueta `[CONFIRM: ...]` se resalta en ámbar y se lista automáticamente en la tarjeta final `FOR TCM REVIEW` (mostrando `None` cuando todas fueron resueltas).
   - **Nunca rellenar con datos ficticios** para "completar" una nota: estas notas se facturan a Medicaid y se auditan. La nota se escribe completa (todos los párrafos del template) y solo el dato faltante queda como `[CONFIRM: ...]` dentro de una oración completa.
   - **Revisión manual (Pending TCM Review):** una nota con `[CONFIRM: ...]` se puede guardar (`content.meta.review_status = 'pending_tcm_review'`, `meta.pending_confirm_items`), pero firmar, solicitar firma y sincronizar a Amexzone quedan bloqueados en `TcmNoteShell.tsx`, y el bot rechaza cualquier `[TCM_PROGRESS_NOTE]` que contenga `[CONFIRM:` (`amexzone-bot/worker.js`).
   - **Guardar nunca se bloquea por datos faltantes:** DOS, Case Manager, Supervisor, al menos un dominio y al menos un diagnóstico ya no impiden guardar; si faltan, la nota se guarda como Pending TCM Review (`meta.missing_required_fields`) y aparecen como `[REQUIRED: ...]` en la tarjeta FOR TCM REVIEW. Firmar y sincronizar sí se bloquean. El bot (`src/tasks/progressNoteTask.js`) vuelve a verificar DOS, Case Manager, Supervisor y `payload.review` y rechaza la tarea si algo falta. Solo los conflictos de horario siguen bloqueando el guardado.
   - **Notas cortas = datos que no llegan al prompt:** el frontend envía el paciente completo (incluye `tcm_social_needs`, el form TCM Social), pero cada workflow n8n debe leerlo explícitamente en su prompt (`patient_full_object.tcm_social_needs?.campo`). Un dominio sin datos no se omite: se escribe con `[CONFIRM: ...]`.
2. **Preservación de Formato Multi-Párrafo (`clioUtils.ts`):**
   - `normalizeTcmNote` no debe colapsar saltos de línea dobles (`\n\n`) ni viñetas (`•`) en plantillas estructuradas por párrafos (`tcm_initial_home_visit_note`, `tcm_case_assignment_note`, etc.).
3. **Múltiples Dominios Seleccionados:**
   - Respetar los dominios marcados por el usuario en `Record.tsx` y permitir activarlos/desactivarlos interactivamente en el modo edición de `TcmNoteShell.tsx`.

---

## 2. Reglas del RPA Bot de Amexzone (`amexzone-bot/`)
1. **Nombres Literales de Servicios en Amexzone:**
   - En `amexzone-bot/worker.js` (`mapClioServiceToAmexzone`) y `amexzone-bot/src/amexzone/encounterService.js` (`fillServiceModal`), los servicios:
     - `"Initial Home Visit / Develop Intake"`
     - `"New Referral - Initial Telephone Contact and Coordination of Initial Home Visit"`
     deben enviarse **literalmente** a Amexzone EHR (no convertirlos a `"Assessment"` ni a `"Case Assigned"`).

---

## 3. Reglas de Despliegue y Entorno Windows
1. **Actualización de Workflows n8n en el VPS:**
   - Nunca ejecutar sentencias `sqlite3` con JSON complejo directamente entre comillas por SSH desde PowerShell, ya que PowerShell rompe el escapado de comillas.
   - Usar siempre `node scratch/sync_all_workflows.cjs` (o `npm run flow -- deploy n8n`), que sube un script Python a `/tmp/remote_sync_script.py` y reinicia el contenedor `n8n`.
2. **Edición de Archivos con CRLF:**
   - Algunos archivos del repositorio usan saltos de línea Windows (`CRLF`). Al usar `edit_file`, emplear bloques cortos y exactos para evitar fallos de coincidencia.
3. **Verificación Obligatoria Antes de Subir:**
   - Siempre ejecutar `npm run build` (`tsc -b && vite build`) y confirmar **0 errores** antes de hacer commit o desplegar.
4. **Convivencia en Equipo (Idioma y Bloqueo de Alcance / Scope Lock):**
   - Nunca guardar preferencias personales de un desarrollador (como forzar español o inglés) en las reglas compartidas de GitHub (`AGENTS.md`, `GEMINI.md`, `.agents/rules/`). El agente responde en el idioma en que le escriba cada desarrollador (respetando la regla local `user_global` de cada máquina).
   - **Scope Lock estricto:** Ningún agente puede modificar templates, pantallas o funciones que no pertenezcan a la tarea pedida por el usuario en ese momento.
