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

async function scan() {
    const { data, error } = await supabase
        .from('patients')
        .select('tcm_social_needs, psych_name, diagnoses, presenting_problems')
        .eq('id', '24641b10-5d38-4537-aa7d-f5d505f72b33')
        .single();

    if (error) {
        console.error(error);
        return;
    }

    console.log("scanning patients table fields for 'prueba':");
    console.log("psych_name:", data.psych_name);
    console.log("diagnoses:", data.diagnoses);
    console.log("presenting_problems:", data.presenting_problems);

    const needs = data.tcm_social_needs || {};
    console.log("\nscanning tcm_social_needs keys/values containing 'prueba' or 'psych':");
    for (const [key, val] of Object.entries(needs)) {
        const valStr = JSON.stringify(val);
        if (valStr.toLowerCase().includes('prueba') || valStr.toLowerCase().includes('psych')) {
            console.log(`- ${key}: ${valStr}`);
        }
    }
}
scan();
