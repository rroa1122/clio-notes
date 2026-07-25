import { execSync } from 'child_process';

const cmd = `ssh -i C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "sqlite3 /root/n8n/database.sqlite \\"SELECT data FROM execution_data WHERE executionId = 35561;\\""`;
try {
    const stdout = execSync(cmd, { maxBuffer: 50 * 1024 * 1024 }).toString();
    
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

    const raw = JSON.parse(stdout);
    const resolved = unflat(raw);

    const runData = resolved.resultData.runData;
    const aiNode = runData['Message a model'];
    if (aiNode && aiNode[0] && aiNode[0].data && aiNode[0].data.main && aiNode[0].data.main[0]) {
        const responseJson = aiNode[0].data.main[0][0].json;
        import('fs').then(fs => {
            fs.writeFileSync('scratch/temp_response.json', JSON.stringify(responseJson, null, 2));
            console.log("Saved AI response to scratch/temp_response.json");
        });
    }
} catch (err) {
    console.error("Error executing inspect:", err.message);
}
