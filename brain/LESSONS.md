# 🧠 CEREBRO DEL PROYECTO: Lecciones y Reglas Técnicas (`LESSONS.md`)

Este archivo es la **Memoria Episódica** del proyecto. Contiene errores ya resueltos y reglas críticas que **ningún agente ni sub-agente debe violar**.

---

## 1. Reglas Clínicas y de Datos (Templates TCM)
1. **Regla Anti-Fabricación (`[CONFIRM: ...]`):**
   - Nunca inventar datos clínicos que no estén en el audio, transcripción o formulario.
   - En `Record.tsx`, **NO inyectar medicamentos sintéticos de relleno** (como `Fluoxetine`, `Buspirone`, `Hydroxyzine`) cuando se usan plantillas estrictas con `[CONFIRM: ...]`.
   - En `TcmNoteShell.tsx`, cualquier etiqueta `[CONFIRM: ...]` se resalta en ámbar y se lista automáticamente en la tarjeta final `FOR TCM REVIEW` (mostrando `None` cuando todas fueron resueltas).
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
