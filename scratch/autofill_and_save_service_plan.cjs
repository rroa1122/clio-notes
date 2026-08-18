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

const SUPABASE_URL = env.SUPABASE_URL || 'https://toisvwdmscmnogzcpeyj.supabase.co';
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Fetching patient Testthiago Six from Supabase...");
    const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .ilike('full_name', '%Testthiago Six%')
        .single();

    if (pErr) {
        console.error("Error fetching patient:", pErr);
        return;
    }

    console.log(`Found patient: ${patient.full_name} (${patient.emr_id})`);
    
    const requestBody = {
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
        tcm_social_needs: patient.tcm_social_needs || {}
    };

    console.log("Triggering n8n autofill-service-plan webhook...");
    const response = await fetch('https://n8n.clinicflow.dev/webhook/autofill-service-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        console.error(`n8n webhook returned error status ${response.status}`);
        return;
    }

    const resData = await response.json();
    let content = resData;
    if (Array.isArray(resData) && resData.length > 0) content = resData[0];
    if (content && content.json) content = content.json;
    
    console.log("RAW WEBHOOK RESPONSE KEYS:", Object.keys(content));
    console.log("FULL RAW RESPONSE:", JSON.stringify(content, null, 2));
    
    let tcm_social_needs = content.tcm_social_needs || content;

    if (!tcm_social_needs || Object.keys(tcm_social_needs).length === 0 || !tcm_social_needs.service_plan_discharge_criteria) {
        console.error("AI did not return a structured service plan:", content);
        return;
    }

    console.log("Successfully generated service plan via AI. Saving to Supabase...");
    
    const updatedSocialNeeds = {
        ...(patient.tcm_social_needs || {}),
        ...tcm_social_needs
    };

    const { data: updated, error: updateErr } = await supabase
        .from('patients')
        .update({
            tcm_social_needs: updatedSocialNeeds
        })
        .eq('id', patient.id)
        .select();

    if (updateErr) {
        console.error("❌ Error updating patient record:", updateErr);
    } else {
        console.log("✅ PATIENT SOCIAL NEEDS UPDATED SUCCESSFULLY!");
        
        // Print some of the updated fields to verify they are in the first person and correct
        console.log("Goal for Mental Health:", updated[0].tcm_social_needs.service_plan_goal_domain_mental_health);
        console.log("Goal for Physical Health:", updated[0].tcm_social_needs.service_plan_goal_domain_physical_health);
        console.log("Goal for Housing:", updated[0].tcm_social_needs.service_plan_goal_domain_housing);
        console.log("Intake Date:", updated[0].tcm_social_needs.service_plan_intake_date);
        console.log("Assessment Date:", updated[0].tcm_social_needs.service_plan_assessment_date);
    }
}

main();
