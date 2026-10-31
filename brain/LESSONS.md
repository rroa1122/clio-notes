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
   - **Documentation Standards v2 (aplica a TODOS los templates TCM):**
     - **Datos conocidos nunca son `[CONFIRM]`:** TCM, supervisor, agencia, identidad del cliente, fecha/hora e idioma de la sesión. El idioma por defecto es **Spanish**. `resolveKnownConfirms` (`clioUtils.ts`) los reemplaza en el frontend si el modelo igual los marca, y en el Referral usa la fecha/hora del Initial Home Visit si está en la misma nota (`linked_initial_home_visit`).
     - **Datos que Clio pide pero están vacíos:** los no esenciales (origen, entrada a EE.UU., ciudadanía, educación, ocupación, estado civil, hijos, religión, banco, farmacia, teléfono) se omiten sin `[CONFIRM]`; los esenciales del servicio llevan como máximo un `[CONFIRM]` agrupado por sección. Antes de generar templates que dependen de TCM Social, `Record.tsx` avisa si el form está incompleto.
     - **Datos que Clio nunca pide:** solo del transcript; si no están, se reformula como acción del TCM sin afirmar resultados, o se omite (frecuencia de citas, reserva de medicamentos, suministros, detalles del vecindario).
     - **Por excepción (estándar de la agencia, visitas cara a cara):** si el TCM no menciona problemas, el hogar está limpio y adecuado, el vecindario es seguro, y el cliente estuvo alerta, orientado, calmado y cooperativo, sin ideación suicida/homicida. Redacción obligatoria: "No suicidal or homicidal ideation, intent or plan was reported or observed during the visit. The client was alert and oriented to person, place and time." (nunca "the client denied" salvo que el TCM diga que preguntó). En la Adult Certification (revisión de documentos): "No suicidal or homicidal ideation or disorientation has been reported." Si el TCM o los récords reportan riesgo, se documenta con su fuente. **Nunca** por excepción: ADLs, adherencia, transporte, plan de huracán, asuntos legales (se reformulan como acciones del TCM).
     - Ignorar frases viejas guardadas en el paciente ("reports no current prescribed medications", "no acute physical conditions") si contradicen los datos reales. Nunca "themselves" ni "he/she" para el TCM.
   - **`[CONFIRM]` clicables (`TcmNoteShell.tsx`):** en modo vista, cada `[CONFIRM]` abre un cuadro para completarlo; reemplaza el texto en todas las narrativas de la nota y, si está marcado "Guardar también en la ficha", actualiza el campo del paciente (contacto de emergencia, PCP, vivienda y con quién vive, ingresos y beneficios, alergias, farmacia) leyendo la ficha completa antes de guardarla. Los tipos sin campo en la ficha solo se reemplazan en la nota.
   - **Service Plan = guía de la agencia (`src/lib/tcm/servicePlanGuide.ts`):** metas y objetivos se copian palabra por palabra de la guía SP (versiones hombre y mujer); solo cambian el nombre, los pronombres y las fechas (fecha final = target date del plan). `resolveServicePlan(patient)` es la única fuente: la usan el documento SP (`PatientDetail.tsx`), la sincronización a Amexzone y la nota "Initial Service Plan Development". Valores editados por el TCM se respetan; vacíos o defaults viejos de Clio se reemplazan por la guía. El autofill con IA no puede escribir metas/objetivos. En la nota, la IA escribe `[[SERVICE_PLAN_GOALS]]` y `injectServicePlanGoals` (Record.tsx) pega el texto del documento; la visita para firmar se coordina sin fecha (la fecha va en "Discuss and Sign").
2. **Formato de párrafos (estilo Amexzone):**
   - En Amexzone la narrativa es un textarea: cada párrafo empieza en una línea nueva **sin línea en blanco** entre párrafos. Los prompts piden un solo `\n` entre párrafos, `normalizeTcmNote` colapsa cualquier `\n\n` a `\n` (sin perder viñetas `•`), `mergeJointNotes` une Outcome/Next Steps con `\n`, y el bot (`encounterService.js`) vuelve a colapsar antes de pegar el texto.
   - **Diagnósticos TCM:** el encuentro lleva **un solo** diagnóstico, el primario de salud mental (ICD-10 capítulo F). `mergePatientIntoNote(..., { primaryBehavioralOnly: true })` lo selecciona y deja el resto en `medical_record_diagnoses`; esas condiciones solo se mencionan en la narrativa con fines de récord médico.
   - **Respetar los datos documentados:** no "corregir" ni marcar valores válidos aunque parezcan raros (p. ej., el teléfono del psiquiatra igual al de la agencia en referidos internos).
   - **Idioma:** `storage.upsertPatient` guarda Spanish cuando no se especifica otro idioma (crear, editar e importar).

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
