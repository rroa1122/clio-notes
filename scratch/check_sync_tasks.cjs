const fs = require('fs');
const envText = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = env.SUPABASE_URL || 'https://toisvwdmscmnogzcpeyj.supabase.co';
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTasks() {
    const { data: tasks, error } = await supabase
        .from('amexzone_note_tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${tasks.length} amexzone note tasks:`);
    tasks.forEach(t => {
        console.log(`- ID: ${t.id}, Status: ${t.status}, Patient: ${t.patient_name}, Type: ${t.note_text.slice(0, 30)}...`);
    });
}
checkTasks();
