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

const supabaseUrl = env.SUPABASE_URL || 'https://toisvwdmscmnogzcpeyj.supabase.co';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY in env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching Testthiago Six from Supabase...");
    const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('full_name', 'Testthiago Six')
        .single();
        
    if (error || !patient) {
        console.error("Error fetching patient:", error);
        process.exit(1);
    }
    
    console.log("Patient found:", patient.full_name, "ID:", patient.id);
    
    const webhookUrl = 'https://n8n.clinicflow.dev/webhook/autofill-assessment';
    console.log("Triggering n8n webhook:", webhookUrl);
    
    const payload = {
        patient_id: patient.id,
        full_name: patient.full_name,
        dob: patient.dob,
        gender: patient.gender,
        diagnoses: patient.diagnoses,
        presenting_problems: patient.presenting_problems,
        pcp_conditions: patient.pcp_conditions,
        pcp_medications: patient.pcp_medications,
        psych_conditions: patient.psych_conditions,
        psych_medications: patient.psych_medications,
        address: patient.address,
        phone: patient.phone,
        insurance_company: patient.insurance_company,
        pcp_name: patient.pcp_name,
        psych_name: patient.psych_name
    };
    
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    console.log("n8n response status:", response.status);
    if (!response.ok) {
        const text = await response.text();
        console.error("n8n failed:", text);
        process.exit(1);
    }
    
    const resData = await response.json();
    console.log("n8n raw response:", JSON.stringify(resData).slice(0, 500));
    let content = resData;
    if (Array.isArray(resData) && resData.length > 0) content = resData[0];
    if (content && content.json) content = content.json;
    
    console.log("Content keys:", Object.keys(content || {}));
    let tcm_social_needs = content.tcm_social_needs || content;
    
    if (!tcm_social_needs || !tcm_social_needs.ok) {
        console.error("n8n returned failed status or empty needs:", tcm_social_needs);
        process.exit(1);
    }
    
    // Clean up medications_grid and past_services like the frontend does
    if (Array.isArray(tcm_social_needs.past_services)) {
        tcm_social_needs.past_services = tcm_social_needs.past_services.map(item => ({
            ...item,
            date_received: item.date_received || item.date || ''
        }));
    }
    
    if (Array.isArray(tcm_social_needs.medications_grid)) {
        tcm_social_needs.medications_grid = tcm_social_needs.medications_grid.map(item => {
            let phys = item.physician || '';
            if (!phys || phys.includes('PCP') || phys.toLowerCase().includes('primary')) {
                phys = patient.pcp_name || 'Primary Care Physician';
            } else if (phys.includes('Psych') || phys.toLowerCase().includes('psychiatrist')) {
                phys = patient.psych_name || 'Psychiatrist';
            }
            return {
                ...item,
                physician: phys
            };
        });
    }
    
    // Clean up info_providers dynamic psychiatrist name
    if (Array.isArray(tcm_social_needs.info_providers)) {
        tcm_social_needs.info_providers = tcm_social_needs.info_providers.map(item => {
            let name = item.name || '';
            if (!name || name.includes('{{') || name.toLowerCase().includes('psychiatrist')) {
                name = patient.psych_name || 'Psychiatrist';
            }
            return {
                ...item,
                name: name
            };
        });
    }
    
    console.log("Updating patient record in Supabase with resolved tcm_social_needs...");
    const { error: updateError } = await supabase
        .from('patients')
        .update({
            tcm_social_needs: tcm_social_needs,
            updated_at: new Date().toISOString()
        })
        .eq('id', patient.id);
        
    if (updateError) {
        console.error("Failed to update patient record:", updateError);
        process.exit(1);
    }
    
    console.log("Success! Patient tcm_social_needs updated successfully.");
    console.log("info_providers:", JSON.stringify(tcm_social_needs.info_providers, null, 2));
    console.log("medications_grid:", JSON.stringify(tcm_social_needs.medications_grid, null, 2));
}

main().catch(console.error);
