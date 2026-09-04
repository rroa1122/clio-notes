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
    const { data: tasks, error } = await supabase
        .from('amexzone_note_tasks')
        .select('*')
        .ilike('patient_name', '%testthiago%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !tasks || tasks.length === 0) {
        console.error("No task found:", error);
        return;
    }

    const t = tasks[0];
    console.log(`🎯 Última tarea encontrada: ID ${t.id} para ${t.patient_name}`);
    
    // Parse note text payload
    const jsonIdx = t.note_text.indexOf('{');
    const payload = JSON.parse(t.note_text.slice(jsonIdx));
    console.log("Payload visit_date:", payload.visit_date);
    console.log("Services count:", payload.services?.length);

    console.log("🚀 Insertando NUEVA tarea de sincronización limpia...");
    const { data: newTask, error: insErr } = await supabase
        .from('amexzone_note_tasks')
        .insert({
            user_id: t.user_id,
            patient_name: t.patient_name,
            patient_dob: t.patient_dob,
            note_text: t.note_text,
            status: 'pending'
        })
        .select()
        .single();

    if (insErr) {
        console.error("Error al insertar nueva tarea:", insErr);
        return;
    }

    console.log(`✅ ¡Tarea ${newTask.id} encolada exitosamente! Monitoreando en tiempo real...`);

    for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: cur } = await supabase
            .from('amexzone_note_tasks')
            .select('status, error_message, updated_at')
            .eq('id', newTask.id)
            .single();

        if (cur) {
            console.log(`[${(i + 1) * 3}s] Estado: ${cur.status}${cur.error_message ? ` | Error: ${cur.error_message}` : ''}`);
            if (cur.status === 'completed') {
                console.log("🎉 ¡SINCRONIZACIÓN EXITOSA Y COMPLETADA!");
                break;
            }
            if (cur.status === 'failed') {
                console.log("❌ Falló la sincronización:", cur.error_message);
                break;
            }
        }
    }
}

main();
