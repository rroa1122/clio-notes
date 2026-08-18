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

async function findPrueba() {
    // 1. Search in patients table for patient 'Testthiago Six'
    const { data: patient, error: pError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', '24641b10-5d38-4537-aa7d-f5d505f72b33')
        .single();
        
    if (pError) {
        console.error(pError);
        return;
    }

    console.log("Searching in patient row:");
    for (const [key, val] of Object.entries(patient)) {
        const valStr = JSON.stringify(val);
        if (valStr && valStr.toLowerCase().includes('prueba')) {
            console.log(`- patients.${key}: ${valStr.slice(0, 200)}`);
        }
    }

    // 2. Search in notes table for patient 'Testthiago Six'
    const { data: notes, error: nError } = await supabase
        .from('notes')
        .select('*')
        .eq('patient_id', '24641b10-5d38-4537-aa7d-f5d505f72b33');

    if (nError) {
        console.error(nError);
        return;
    }

    console.log("\nSearching in notes table:");
    notes.forEach(note => {
        for (const [key, val] of Object.entries(note)) {
            const valStr = JSON.stringify(val);
            if (valStr && valStr.toLowerCase().includes('prueba')) {
                console.log(`- note id ${note.id} (${note.note_type}).${key}: ${valStr.slice(0, 200)}`);
            }
        }
    });
}
findPrueba();
