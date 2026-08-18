const fs = require('fs');

for (let i = 10; i >= 1; i--) {
    if (fs.existsSync(`scratch/transcript_match_${i}.json`)) {
        const data = JSON.parse(fs.readFileSync(`scratch/transcript_match_${i}.json`, 'utf8'));
        console.log(`Match ${i}: type=${data.type}, source=${data.source}`);
        if (data.tool_calls) {
            console.log(`Tool calls in match ${i}:`, data.tool_calls.map(tc => tc.name || tc.function?.name));
        }
    }
}
