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

const raw = JSON.parse(fs.readFileSync('scratch/execution_35528.json'));
const resolved = unflat(raw);

if (resolved.resultData && resolved.resultData.runData) {
    const respondNode = resolved.resultData.runData['Respond to Webhook'];
    if (respondNode && respondNode[0] && respondNode[0].data && respondNode[0].data.main && respondNode[0].data.main[0]) {
        const item = respondNode[0].data.main[0][0];
        console.log(JSON.stringify(item.json, null, 2));
    } else {
        console.log("Respond node not found or empty");
    }
}
