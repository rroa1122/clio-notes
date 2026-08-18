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

async function printMeds() {
    const { data: patient, error } = await supabase
        .from('patients')
        .select('tcm_social_needs')
        .eq('id', '24641b10-5d38-4537-aa7d-f5d505f72b33')
        .single();
        
    if (error) {
        console.error(error);
        return;
    }

    const needs = patient.tcm_social_needs || {};
    console.log("medications_grid:", JSON.stringify(needs.medications_grid, null, 2));
    console.log("medications:", JSON.stringify(needs.medications, null, 2));
}
printMeds();
