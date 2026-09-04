const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('C:/Users/REINIER/.gemini/antigravity/scratch/amexzone-notes-bot/.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const noteId = '3ba50838-43dc-443b-a128-024c301999c0';
    console.log(`🔍 Obteniendo nota de la tabla 'notes': ${noteId}...`);
    
    const { data: note, error: nErr } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();
        
    if (nErr || !note) {
        console.error("No se encontró la nota:", nErr);
        return;
    }
    
    console.log(`📝 Nota encontrada: Title: ${note.title}, Patient ID: ${note.patient_id}, User ID: ${note.user_id}`);

    const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', note.patient_id)
        .single();

    if (pErr || !patient) {
        console.error("No se encontró el paciente:", pErr);
        return;
    }

    console.log(`👤 Paciente: ${patient.full_name} (EMR: ${patient.emr_id}, Amexzone ID: ${patient.amexzone_id})`);

    // Parse note content / data
    const parsedData = typeof note.data === 'object' && note.data !== null ? note.data : (typeof note.content === 'object' ? note.content : JSON.parse(note.content || note.data || '{}'));
    const jointServices = parsedData.joint_services || [];
    
    console.log(`📊 Servicios en la nota: ${jointServices.length > 0 ? jointServices.length : 1}`);

    const primaryVisitDate = jointServices?.[0]?.encounter?.dos_date || parsedData.encounter?.dos_date || parsedData.meta?.visitDate || note.date || '2026-08-05';
    
    const compiledServices = (jointServices && jointServices.length > 0)
        ? jointServices.map(js => ({
            service_type: js.focus || js.service_name || js.service_type || 'Progress Note - TCM',
            encounter: {
                dos_date: js.encounter?.dos_date || primaryVisitDate,
                time_in: js.encounter?.time_in || '09:38 AM',
                time_out: js.encounter?.time_out || '10:20 AM',
                duration: js.encounter?.duration || '42',
                units: js.encounter?.units || '3',
                pos: js.encounter?.pos || '11 - Office'
            },
            narrative: {
                summary_notes: js.clinical_narrative || js.narrative?.summary_notes || '',
                outcome_of_services: parsedData.tcm_outcome_of_services || parsedData.narratives?.service_plan || '',
                next_steps: parsedData.tcm_next_steps || parsedData.narratives?.next_steps || ''
            },
            domains: js.domains || parsedData.domains || ["1_mental_health_substance_abuse"]
        }))
        : [{
            service_type: parsedData.focus || 'Progress Note - TCM',
            encounter: {
                dos_date: primaryVisitDate,
                time_in: parsedData.encounter?.time_in || '09:38 AM',
                time_out: parsedData.encounter?.time_out || '10:20 AM',
                duration: parsedData.encounter?.duration || '42',
                units: parsedData.encounter?.units || '3',
                pos: parsedData.encounter?.pos || '11 - Office'
            },
            narrative: {
                summary_notes: parsedData.clinical_narrative || parsedData.narrative?.summary_notes || '',
                outcome_of_services: parsedData.tcm_outcome_of_services || '',
                next_steps: parsedData.tcm_next_steps || ''
            },
            domains: parsedData.domains || ["1_mental_health_substance_abuse"]
        }];

    const taskPayload = {
        patient_name: patient.full_name,
        patient_emr_id: patient.emr_id,
        patient_id: patient.id,
        amexzone_id: patient.amexzone_id,
        visit_date: primaryVisitDate,
        services: compiledServices,
        outcome_of_services: parsedData.tcm_outcome_of_services || '',
        next_steps: parsedData.tcm_next_steps || ''
    };

    const taskText = `[TCM_PROGRESS_NOTE]\n${JSON.stringify(taskPayload, null, 2)}`;
    
    console.log("🚀 Encolando tarea de sincronización en 'amexzone_note_tasks'...");
    const { data: newTask, error: tErr } = await supabase
        .from('amexzone_note_tasks')
        .insert({
            user_id: note.user_id,
            patient_name: patient.full_name,
            patient_dob: patient.dob,
            note_text: taskText,
            status: 'pending'
        })
        .select()
        .single();
        
    if (tErr) {
        console.error("Error al encolar tarea:", tErr);
        return;
    }
    
    console.log(`✅ Tarea creada con ID: ${newTask.id}. Esperando procesamiento por el bot...`);
    
    // Polling until completion or failure
    for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: currentTask } = await supabase
            .from('amexzone_note_tasks')
            .select('status, error_message, updated_at')
            .eq('id', newTask.id)
            .single();
            
        if (currentTask) {
            console.log(`[${(i + 1) * 3}s] Estado: ${currentTask.status}${currentTask.error_message ? ` | Error: ${currentTask.error_message}` : ''}`);
            if (currentTask.status === 'completed') {
                console.log("🎉 ¡SINCRONIZACIÓN EXITOSA COMPLETADA!");
                break;
            }
            if (currentTask.status === 'failed') {
                console.log("❌ Sincronización fallida:", currentTask.error_message);
                break;
            }
        }
    }
}

main().catch(console.error);
