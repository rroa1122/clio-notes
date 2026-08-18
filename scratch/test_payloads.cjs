// Use global fetch
const expandAbbreviations = (text) => {
    if (!text) return '';
    return text
      .replace(/\bQD\b/gi, 'daily')
      .replace(/\bQ\.D\.\b/gi, 'daily')
      .replace(/\bHS\b/gi, 'at bedtime')
      .replace(/\bH\.S\.\b/gi, 'at bedtime')
      .replace(/\bPRN\b/gi, 'as needed')
      .replace(/\bP\.R\.N\.\b/gi, 'as needed')
      .replace(/\bPO\b/gi, 'by mouth')
      .replace(/\bP\.O\.\b/gi, 'by mouth')
};

async function testPayload(name, psychMedString, pcpMedString = "Lisinopril 20mg QD, Simvastatin 20mg QD") {
    const webhookUrl = 'https://n8n.clinicflow.dev/webhook/autofill-assessment';
    
    // Apply expansion to inputs
    const expandedPsych = expandAbbreviations(psychMedString);
    const expandedPcp = expandAbbreviations(pcpMedString);
    
    const payload = {
        patient_id: "24641b10-5d38-4537-aa7d-f5d505f72b33",
        full_name: "Testthiago Six",
        dob: "1956-06-01",
        gender: "Female",
        diagnoses: "F32.9 - Major depressive disorder, single episode, unspecified\nF41.1 - Generalized anxiety disorder\nG47.00 - Insomnia, unspecified\n",
        presenting_problems: "The patient presents with persistent symptoms of reactive depression and generalized anxiety. Reports trouble sleeping, low energy, constant worry about financial situation, and lack of social support.",
        pcp_conditions: "Hypertension, High Cholesterol, Pre-diabetes",
        pcp_medications: expandedPcp,
        psych_conditions: "Major depressive disorder, Generalized anxiety, Insomnia",
        psych_medications: expandedPsych,
        address: "60606, MIAMI, FL 60606",
        phone: "+1 786 916 6073",
        insurance_company: "Amexzone Health",
        pcp_name: "Dr. Jose A. Gonzalez",
        psych_name: "Dr. Luannys Quesada Carvajal, APRN"
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const resData = await response.json();
        let content = resData;
        if (Array.isArray(resData) && resData.length > 0) content = resData[0];
        if (content && content.json) content = content.json;
        
        console.log(`[${name}] Status: ${response.status}, ok: ${content.ok}, error: ${content.error || 'none'}`);
        if (!content.ok) {
            console.log(` -> Preview: ${String(content.raw_preview || '').slice(0, 100)}`);
        } else {
            console.log(` -> Medications mapped: ${content.medications_grid.map(m => `${m.medication} (${m.dose})`).join(', ')}`);
        }
    } catch (e) {
        console.error(`[${name}] Error:`, e.message);
    }
}

async function main() {
    console.log("Starting diagnostic payload tests with abbreviation expansion...");
    
    await testPayload("Test 1: Full Original Meds with Alprazolam, QD, HS, PRN", 
                      "Sertraline 100mg QD, Trazodone 50mg HS, Alprazolam 0.25mg PRN",
                      "Lisinopril 20mg QD, Simvastatin 20mg QD");
    await new Promise(r => setTimeout(r, 2000));
    
    await testPayload("Test 2: Only Sertraline & Trazodone (HS)", 
                      "Sertraline 100mg QD, Trazodone 50mg HS");
    await new Promise(r => setTimeout(r, 2000));
    
    await testPayload("Test 3: Gabapentin 300mg daily", 
                      "Sertraline 100mg QD, Trazodone 50mg HS, Gabapentin 300mg daily");
}

main();
