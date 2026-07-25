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

for (const exec_id of [35522, 35523]) {
    const raw = JSON.parse(fs.readFileSync(`scratch/execution_${exec_id}.json`));
    const resolved = unflat(raw);
    const item = resolved.resultData.runData.Webhook[0].data.main[0][0];
    console.log(`EXECUTION ${exec_id} body:`, item.json.body);
}
