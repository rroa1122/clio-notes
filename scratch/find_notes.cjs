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
    const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
    if (error) console.error(error);
    else {
        notes.forEach(n => {
            console.log('ID:', n.id, '| Patient:', n.patient_id, '| Type:', n.note_type || n.type, '| DOS:', n.dos_date || n.date, '| Keys:', Object.keys(n));
        });
    }
}
main();
