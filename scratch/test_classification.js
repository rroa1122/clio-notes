import fs from 'fs';
import { extractPatientData } from './src/lib/services/patientIntakeService.js';

// We need a helper to read and parse the mock response
function unflat(serialized) {
    const cache = new Map();
    function resolve(idx) {
        if (cache.has(idx)) return cache.get(idx);
        const val = serialized[idx];
        if (val === null || val === undefined) return val;
        if (typeof val === 'object') {
            if (Array.isArray(val)) {
                const res = [];
                cache.set(idx, res);
                for (const item of val) res.push(resolve(parseInt(item)));
                return res;
            } else {
                const res = {};
                cache.set(idx, res);
                for (const k of Object.keys(val)) res[k] = resolve(parseInt(val[k]));
                return res;
            }
        }
        return val;
    }
    return resolve(0);
}

async function run() {
    const raw = JSON.parse(fs.readFileSync('scratch/execution_35528.json'));
    const resolved = unflat(raw);
    const rawItem = resolved.resultData.runData['Respond to Webhook'][0].data.main[0][0].json;
    
    // Mock the extractPatientData behavior by modifying the file object parameter
    // Let's print the result of calling the extraction logic directly on the parsed content.
    // In order to call the inner logic, we can mock the fetch call in the function,
    // or we can just mock a file extraction.
    // Since extractPatientData takes a File and fetches the endpoint, we can temporarily mock global.fetch
    // to return the rawItem.
    const originalFetch = global.fetch;
    global.fetch = async () => {
        return {
            ok: true,
            json: async () => [rawItem] // standard n8n array output
        };
    };
    
    try {
        const dummyFile = new File(["dummy"], "test.pdf", { type: "application/pdf" });
        const result = await extractPatientData(dummyFile);
        console.log("CLASSIFICATION RESULT:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Test error:", err);
    } finally {
        global.fetch = originalFetch;
    }
}

run();
