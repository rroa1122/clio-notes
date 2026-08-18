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
        .select('user_id, status, error_message')
        .eq('user_id', 'c630d8ae-2c39-4760-99f3-88ae4a824f92')
        .eq('status', 'failed');
        
    if (error) {
        console.error(error);
        return;
    }
    
    const errors = {};
    tasks.forEach(t => {
        const shortErr = String(t.error_message).split('\n')[0].substring(0, 70);
        errors[shortErr] = (errors[shortErr] || 0) + 1;
    });
    
    console.log("Aitana Fail Errors:", errors);
}

main().catch(console.error);
