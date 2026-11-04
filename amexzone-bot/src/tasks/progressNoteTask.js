const path = require('path');
const { supabase } = require('../config/supabase');
const { launchBrowserContext, setupPageInterceptors, waitForLoader } = require('../core/browser');
const { refreshSessionCookies, handlePin, handleUnsavedChanges, setActiveSessionPin } = require('../core/sessionManager');
const { navigateToPatient } = require('../amexzone/patientService');
const { ensureCitasTab, findExistingAppointment, createNewAppointment, openAppointmentForEditing, updateAppointmentDate, assertNoDuplicateOrOverlap } = require('../amexzone/appointmentService');
const { processEncounterServices } = require('../amexzone/encounterService');

const processProgressNoteTask = async (task, integration) => {
    console.log(`\n⚙️  PROCESANDO TAREA DE NOTA DE PROGRESO: ${task.id}`);
    console.log(`👤 Paciente: ${task.patient_name}`);

    let payload;
    try {
        const jsonIdx = task.note_text.indexOf('{');
        const cleanedStr = jsonIdx !== -1 ? task.note_text.slice(jsonIdx) : task.note_text;
        payload = JSON.parse(cleanedStr);
    } catch (e) {
        console.error("❌ Error al parsear el payload:", e.message);
        throw new Error("Payload inválido.");
    }

    // Manual review gate: notes can be saved incomplete in Clio ("Pending TCM Review"),
    // but they must never reach Amexzone without the required fields.
    const missingForSync = [];
    if (!payload.visit_date || !String(payload.visit_date).trim()) missingForSync.push('Date of Service (DOS)');
    if (payload.review) {
        // Payloads from current Clio versions carry the full required-field check.
        if (!String(payload.case_manager_name || '').trim()) missingForSync.push('Case Manager');
        if (!String(payload.supervisor_name || '').trim()) missingForSync.push('Supervisor');
        (payload.review.missing_required_fields || []).forEach((f) => {
            if (!missingForSync.includes(f)) missingForSync.push(f);
        });
        if ((payload.review.pending_confirm_items || []).length > 0) missingForSync.push('[CONFIRM] items');
    }
    if (missingForSync.length > 0) {
        throw new Error(`Nota pendiente de revisión (Pending TCM Review). Falta: ${missingForSync.join(', ')}. Complétala en Clio antes de sincronizar.`);
    }

    const userId = task.user_id;
    let pin = '';
    try {
        const { data: pInt } = await supabase.from('provider_integrations').select('amexzone_pin').eq('user_id', userId).maybeSingle();
        if (pInt && pInt.amexzone_pin) pin = String(pInt.amexzone_pin).trim();
    } catch (e) {}
    if (!pin) pin = integration?.amexzone_pin || integration?.pin || payload.pin || '2017';
    if (pin) setActiveSessionPin(pin);
    
    // Patient identity: ONLY the Amexzone patient id (patients.amexzone_id) is trusted.
    // patient_emr_id / account numbers are Clio-side numbers and must never be used as an Amexzone id
    // (2026-11-03: account number 28372 was sent as the Amexzone id for Severo Gomez Rodriguez).
    const isAmexId = (v) => v !== undefined && v !== null && /^\d+$/.test(String(v).trim());
    let patientEmrId = '';
    let expectedDob = payload.patient_dob || task.patient_dob || '';
    if (payload.patient_id) {
        try {
            const { data: pRow } = await supabase
                .from('patients')
                .select('amexzone_id, full_name, dob')
                .eq('id', payload.patient_id)
                .maybeSingle();
            if (pRow && isAmexId(pRow.amexzone_id)) patientEmrId = String(pRow.amexzone_id).trim();
            if (pRow && pRow.dob) expectedDob = pRow.dob;
        } catch (e) {}
    }
    if (!patientEmrId && isAmexId(payload.amexzone_id)) {
        patientEmrId = String(payload.amexzone_id).trim();
    }
    if (!patientEmrId) {
        throw new Error('El paciente no está vinculado a Amexzone (falta el Amexzone ID en su ficha de Clio). Vincúlalo antes de sincronizar. No se creó nada en Amexzone.');
    }

    const isServer = process.platform === 'linux';
    if (isServer && !process.env.DISPLAY) {
        process.env.DISPLAY = ':99';
    }
    const userDataDir = path.join(__dirname, `../../user_data_provider_${userId}`);
    const launchOptions = {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1366,768',
            '--start-maximized'
        ]
    };

    if (process.env.PROXY_SERVER) {
        launchOptions.proxy = { server: process.env.PROXY_SERVER };
        if (process.env.PROXY_USERNAME) {
            console.log(`👤 Usando proxy Webshare: ${process.env.PROXY_USERNAME}`);
            launchOptions.proxy.username = process.env.PROXY_USERNAME;
            launchOptions.proxy.password = process.env.PROXY_PASSWORD;
        }
    }

    const context = await launchBrowserContext(userDataDir, launchOptions, userId);
    let page;
    const pages = context.pages();
    if (pages.length > 0) {
        page = pages[0];
    } else {
        page = await context.newPage();
    }
    await setupPageInterceptors(page);

    try {
        // 1. Navigate to patient
        const patientInfo = await navigateToPatient(page, patientEmrId, task.patient_name, pin, userId, expectedDob);

        // 2. Duplicate / overlap guard: cancel if the patient already has an encounter that day
        //    or the Case Manager already has an encounter overlapping these service times.
        await assertNoDuplicateOrOverlap(page, {
            patientId: patientEmrId,
            cmTrabajadorId: patientInfo && patientInfo.cmTrabajadorId,
            visitDate: payload.visit_date,
            services: payload.services && payload.services.length ? payload.services : [payload]
        });

        // 3. Always create a new appointment for the progress note
        console.log(`📅 Creando nueva cita en Amexzone para la fecha ${payload.visit_date}...`);
        await createNewAppointment(page, patientEmrId, task.patient_name, payload.visit_date, pin, payload);

        // 4. Open appointment for editing
        await openAppointmentForEditing(page, payload.visit_date, pin);

        // 5. Fill services and narrative
        const savedServicesReport = await processEncounterServices(page, payload, pin);

        // 6. Sync actual saved times back to Supabase notes table
        if (savedServicesReport && Array.isArray(savedServicesReport) && (task.note_id || payload.id)) {
            const noteIdToUpdate = task.note_id || payload.id;
            try {
                const { data: currentNoteRow } = await supabase
                    .from('notes')
                    .select('content')
                    .eq('id', noteIdToUpdate)
                    .maybeSingle();

                if (currentNoteRow) {
                    const content = currentNoteRow.content || {};
                    let timeChanged = false;

                    const formatTo12h = (tStr) => {
                        if (!tStr) return '';
                        const match = tStr.match(/(\d{1,2}):(\d{2})/);
                        if (!match) return tStr;
                        let h = parseInt(match[1], 10);
                        const m = match[2];
                        const mer = h >= 12 ? 'PM' : 'AM';
                        let h12 = h % 12;
                        if (h12 === 0) h12 = 12;
                        return `${String(h12).padStart(2, '0')}:${m} ${mer}`;
                    };

                    savedServicesReport.forEach((svcReport, sIdx) => {
                        if (!svcReport.hora_inicio) return;
                        const finalIn12 = formatTo12h(svcReport.hora_inicio);
                        const finalOut12 = formatTo12h(svcReport.hora_fin);

                        if (content.joint_services && content.joint_services[sIdx]) {
                            const js = content.joint_services[sIdx];
                            if (js.encounter?.time_in !== finalIn12) {
                                js.encounter = js.encounter || {};
                                js.encounter.time_in = finalIn12;
                                js.encounter.time_out = finalOut12;
                                js.encounter.time_range = `${finalIn12} - ${finalOut12}`;
                                timeChanged = true;
                            }
                        }

                        if (sIdx === 0 && content.encounter) {
                            if (content.encounter.time_in !== finalIn12) {
                                content.encounter.time_in = finalIn12;
                                content.encounter.time_out = finalOut12;
                                content.encounter.time_range = `${finalIn12} - ${finalOut12}`;
                                timeChanged = true;
                            }
                        }
                    });

                    if (timeChanged) {
                        console.log("📝 Actualizando horarios reales de Amexzone en Supabase notes...");
                        await supabase.from('notes').update({
                            content: content,
                            updated_at: new Date().toISOString()
                        }).eq('id', noteIdToUpdate);

                        // Also record in task result_summary
                        await supabase.from('amexzone_note_tasks').update({
                            result_summary: JSON.stringify({
                                time_adjusted: true,
                                actual_services: savedServicesReport
                            })
                        }).eq('id', task.id);
                    }
                }
            } catch (syncBackErr) {
                console.error("Error actualizando horarios en Supabase:", syncBackErr.message);
            }
        }

        // 7. Refresh cookies
        await refreshSessionCookies(context, userId);

    } finally {
        await context.close();
    }
};

module.exports = {
    processProgressNoteTask
};
