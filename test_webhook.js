async function testWebhook() {
    const variations = [
        { url: 'https://n8n.clinicflow.dev/webhook/nextSteps', method: 'GET' },
        { url: 'https://n8n.clinicflow.dev/webhook/next-steps', method: 'POST' },
        { url: 'https://n8n.clinicflow.dev/webhook/next-steps', method: 'GET' },
        { url: 'https://n8n.clinicflow.dev/webhook-test/nextSteps', method: 'POST' }
    ];

    for (const v of variations) {
        console.log(`\n--- Testing ${v.method} ${v.url} ---`);
        try {
            const options = { method: v.method };
            if (v.method === 'POST') {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify({ test: true });
            }
            const res = await fetch(v.url, options);
            console.log("Status:", res.status);
            console.log("Body:", await res.text());
        } catch (err) {
            console.error("Error:", err);
        }
    }
}

testWebhook();
