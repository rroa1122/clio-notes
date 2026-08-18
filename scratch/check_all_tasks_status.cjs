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
        .select('user_id, status, error_message, created_at, patient_name')
        .order('created_at', { ascending: false })
        .limit(30);
        
    if (error) {
        console.error(error);
        return;
    }
    
    console.log("Last 30 tasks details:");
    tasks.forEach(t => {
        console.log(`- Created: ${t.created_at} | User: ${t.user_id} | Patient: ${t.patient_name} | Status: ${t.status} | Err: ${t.error_message ? t.error_message.split('\n')[0] : 'None'}`);
    });
}
main().catch(console.error);
