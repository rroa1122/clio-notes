const https = require('https');

const postData = JSON.stringify({
    text: "TCM conducted initial home visit with client. Inspected environment, verified basic utilities are active, food supply is adequate, and reviewed rights and responsibilities. Client signed consent forms.",
    patient_clinical_context: JSON.stringify({
        full_name: "Maria Rodriguez",
        dob: "1975-05-12",
        diagnoses: ["F41.1"],
        case_manager: "Claudia Leyva"
    }),
    encounter: {
        service_date: "2026-08-16",
        time_in: "11:00 AM",
        time_out: "11:45 AM",
        units: "3"
    }
});

const options = {
    hostname: 'n8n.clinicflow.dev',
    port: 443,
    path: '/webhook/tcm-initial-home-visit-note',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Sending test request to https://n8n.clinicflow.dev/webhook/tcm-initial-home-visit-note...');

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response received len:', data.length);
        try {
            const parsed = JSON.parse(data);
            console.log('Parsed JSON ok:', parsed.ok);
            console.log('Note structure keys:', Object.keys(parsed));
        } catch (e) {
            console.log('Raw preview:', data.substring(0, 300));
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
