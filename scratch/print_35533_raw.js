import fs from 'fs';

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

const raw = JSON.parse(fs.readFileSync('scratch/execution_35533.json'));
const resolved = unflat(raw);
const rawItem = resolved.resultData.runData['Respond to Webhook'][0].data.main[0][0].json;

console.log("RAW KEYS:", Object.keys(rawItem));
console.log("psychiatric_diagnoses:", rawItem.psychiatric_diagnoses);
console.log("medical_diagnoses:", rawItem.medical_diagnoses);
console.log("psychiatric_medications:", rawItem.psychiatric_medications);
console.log("medical_medications:", rawItem.medical_medications);
console.log("diagnoses:", rawItem.diagnoses);
console.log("medications:", rawItem.medications);
