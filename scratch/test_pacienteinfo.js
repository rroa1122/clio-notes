async function checkWebhook(url) {
    console.log(`Checking ${url}...`);
    try {
        const res = await fetch(url, { method: 'POST' });
        console.log(`Status: ${res.status} ${res.statusText}`);
        try {
            const text = await res.text();
            console.log(`Body: ${text.slice(0, 200)}`);
        } catch (_) {}
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

async function run() {
    const urls = [
        'https://n8n.clinicflow.dev/webhook/pacienteinfo',
        'https://n8n.clinicflow.dev/webhook/paciente-info',
        'https://n8n.clinicflow.dev/webhook/patient-info',
        'https://n8n.clinicflow.dev/webhook/patientinfo',
        'https://n8n.clinicflow.dev/webhook-test/pacienteinfo'
    ];
    for (const url of urls) {
        await checkWebhook(url);
    }
}

run();
