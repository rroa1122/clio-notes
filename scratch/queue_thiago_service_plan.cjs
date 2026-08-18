const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

const SUPABASE_URL = env.SUPABASE_URL || 'https://toisvwdmscmnogzcpeyj.supabase.co';
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Fetching patient Testthiago Six from Supabase...");
    const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .ilike('full_name', '%Testthiago Six%')
        .single();

    if (pErr) {
        console.error("Error fetching patient:", pErr);
        return;
    }

    console.log(`Found patient: ${patient.full_name} (${patient.emr_id})`);
    
    const data = patient.tcm_social_needs || {};

    const payload = {
        type: 'TCM_SERVICE_PLAN',
        patient_emr_id: patient.emr_id || '27510',
        patient_name: patient.full_name,
        patient_dob: patient.dob,
        gender: patient.gender || 'Female',
        ssn: patient.ssn || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        psych_name: patient.psych_name || 'Dr. Luannys Quesada Carvajal, APRN',
        pcp_name: patient.pcp_name || 'Dr. Jose A. Gonzalez',
        case_manager: patient.case_manager || 'Claudia Leyva',
        service_plan_data: {
            ...data,
            // Dynamic age calculate test
            service_plan_date: "08/11/2026",
            service_plan_target_date: "02/11/2027",
            // Unify clinical diagnosis code to F33.1
            diagnosis_code: "F33.1",
            diagnosis_descriptor: "Major depressive disorder, recurrent, moderate"
        }
    };

    console.log("Inserting service plan task into public.amexzone_note_tasks...");
    const { data: inserted, error: insertErr } = await supabase
        .from('amexzone_note_tasks')
        .insert({
            note_id: null,
            user_id: 'c630d8ae-2c39-4760-99f3-88ae4a824f92',
            clinic_id: '71c0bd25-1f15-4383-b550-6a823aa3acb0',
            patient_name: patient.full_name,
            patient_dob: patient.dob,
            visit_date: "2026-08-11",
            note_text: '[TCM_SERVICE_PLAN]\n' + JSON.stringify(payload),
            status: 'pending'
        })
        .select();

    if (insertErr) {
        console.error("❌ Error inserting task:", insertErr);
    } else {
        console.log("✅ TAREA DE PRUEBA DE SERVICE PLAN ENCOLADA EXITOSAMENTE:", inserted[0].id);
        console.log("Monitoring task progress...");
        
        let completed = false;
        // Wait up to 10 minutes (300 iterations * 2000 ms = 600 seconds)
        for (let i = 0; i < 300; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const { data: task, error: tErr } = await supabase
                .from('amexzone_note_tasks')
                .select('status, error_message')
                .eq('id', inserted[0].id)
                .single();
                
            if (tErr) {
                console.error("Error monitoring task:", tErr);
                break;
            }
            
            console.log(`Task Status: ${task.status}`);
            if (task.status === 'completed') {
                completed = true;
                console.log("\n=================== TAREA COMPLETADA CON ÉXITO ===================");
                break;
            } else if (task.status === 'failed') {
                completed = true;
                console.log("\n=================== TAREA FALLÓ ===================");
                console.log("Error message:", task.error_message);
                break;
            }
        }
        
        if (!completed) {
            console.log("Task did not complete within timeout.");
        }
    }
}

main();
