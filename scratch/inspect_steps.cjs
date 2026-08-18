const fs = require('fs');

for (const s of [1053, 1055, 1063]) {
    if (fs.existsSync(`scratch/step_${s}.json`)) {
        const d = JSON.parse(fs.readFileSync(`scratch/step_${s}.json`, 'utf8'));
        console.log(`Step ${s}:`, d.tool_calls);
    }
}
