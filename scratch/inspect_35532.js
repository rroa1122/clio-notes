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

const pdfTextNode = resolved.resultData.runData['Upload PDF to OpenAI'];
if (pdfTextNode && pdfTextNode[0] && pdfTextNode[0].data && pdfTextNode[0].data.main && pdfTextNode[0].data.main[0]) {
    const item = pdfTextNode[0].data.main[0][0];
    console.log("FILENAME:", item.json.filename);
} else {
    print("Upload node not found");
}
