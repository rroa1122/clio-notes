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

const raw = JSON.parse(fs.readFileSync('scratch/execution_35532.json'));
const resolved = unflat(raw);

const rawItem = resolved.resultData.runData['Respond to Webhook'][0].data.main[0][0].json;
console.log("PATIENT:", rawItem.patient);
console.log("CONTACT:", rawItem.contact_information);
console.log("FAMILY:", rawItem.family_information);
console.log("INSURANCE:", rawItem.insurance);
