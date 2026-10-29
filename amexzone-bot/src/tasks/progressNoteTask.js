const path = require('path');
const { supabase } = require('../config/supabase');
const { launchBrowserContext, setupPageInterceptors, waitForLoader } = require('../core/browser');
const { refreshSessionCookies, handlePin, handleUnsavedChanges, setActiveSessionPin } = require('../core/sessionManager');
const { navigateToPatient } = require('../amexzone/patientService');
const { ensureCitasTab, findExistingAppointment, createNewAppointment, openAppointmentForEditing, updateAppointmentDate } = require('../amexzone/appointmentService');
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

    const userId = task.user_id;
    let pin = '';
    try {
        const { data: pInt } = await supabase.from('provider_integrations').select('amexzone_pin').eq('user_id', userId).maybeSingle();
        if (pInt && pInt.amexzone_pin) pin = String(pInt.amexzone_pin).trim();
    } catch (e) {}
    if (!pin) pin = integration?.amexzone_pin || integration?.pin || payload.pin || '2017';
    if (pin) setActiveSessionPin(pin);
    
    let patientEmrId = '';
    const rawAmexId = payload.amexzone_id || payload.patient_amexzone_id || (payload.patient_emr_id && /^\d+$/.test(String(payload.patient_emr_id).trim()) ? payload.patient_emr_id : '') || '';
    if (rawAmexId && /^\d+$/.test(String(rawAmexId).trim())) {
        patientEmrId = String(rawAmexId).trim();
    }

    if (!patientEmrId && payload.patient_id) {
        try {
            const { data: pDbList } = await supabase
                .from('patients')
                .select('amexzone_id')
                .eq('id', payload.patient_id)
                .not('amexzone_id', 'is', null)
                .limit(1);
            if (pDbList && pDbList.length > 0 && pDbList[0].amexzone_id && /^\d+$/.test(String(pDbList[0].amexzone_id).trim())) {
                patientEmrId = String(pDbList[0].amexzone_id).trim();
            }
        } catch (e) {}
    }

    if (!patientEmrId && (payload.patient_emr_id || payload.emr_id)) {
        try {
            const emrVal = String(payload.patient_emr_id || payload.emr_id).trim();
            const { data: pDbList } = await supabase
                .from('patients')
                .select('amexzone_id')
                .ilike('emr_id', `%${emrVal}%`)
                .not('amexzone_id', 'is', null)
                .limit(1);
            if (pDbList && pDbList.length > 0 && pDbList[0].amexzone_id && /^\d+$/.test(String(pDbList[0].amexzone_id).trim())) {
                patientEmrId = String(pDbList[0].amexzone_id).trim();
            }
        } catch (e) {}
    }

    if (!patientEmrId && (task.patient_name || payload.patient_name)) {
        try {
            const rawName = (task.patient_name || payload.patient_name || '').trim();
            const { data: pDbList } = await supabase
                .from('patients')
                .select('amexzone_id')
                .ilike('full_name', `%${rawName}%`)
                .not('amexzone_id', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1);
            if (pDbList && pDbList.length > 0 && pDbList[0].amexzone_id && /^\d+$/.test(String(pDbList[0].amexzone_id).trim())) {
                patientEmrId = String(pDbList[0].amexzone_id).trim();
            }
        } catch (e) {}
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
        await navigateToPatient(page, patientEmrId, task.patient_name, pin, userId);

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
