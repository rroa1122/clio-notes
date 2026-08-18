const https = require('https');

const postData = JSON.stringify({
    text: "TCM conducted face-to-face home visit with client to monitor progress and verify basic needs stability.",
    patient_clinical_context: JSON.stringify({
        full_name: "Test Patient",
        dob: "1980-01-01",
        diagnoses: ["F33.1"],
        case_manager: "Test Manager"
    }),
    encounter: {
        service_date: "2026-08-16",
        time_in: "10:00 AM",
        time_out: "10:30 AM",
        units: "2"
    }
});

const options = {
    hostname: 'n8n.clinicflow.dev',
    port: 443,
    path: '/webhook/tcm-note',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Sending test request to https://n8n.clinicflow.dev/webhook/tcm-note (Text only, no audio)...');

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
