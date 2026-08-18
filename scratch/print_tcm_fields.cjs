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

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: integrations, error: iErr } = await supabase
        .from('provider_integrations')
        .select('user_id, amexzone_email, mfa_status, mfa_channel, updated_at');
        
    if (iErr) {
        console.error("Integrations Error:", iErr);
    } else {
        console.log("Current provider_integrations:");
        console.log(integrations);
    }
    
    const { data: tasks, error: tErr } = await supabase
        .from('amexzone_note_tasks')
        .select('id, patient_name, status, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
        
    if (tErr) {
        console.error("Tasks Error:", tErr);
    } else {
        console.log("\nLast 3 tasks:");
        console.log(tasks);
    }
}

main().catch(console.error);
