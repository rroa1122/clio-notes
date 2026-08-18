const fs = require('fs');

for (let i = 1350; i <= 1360; i++) {
    if (fs.existsSync(`scratch/transcript_line_${i}.json`)) {
        const d = JSON.parse(fs.readFileSync(`scratch/transcript_line_${i}.json`, 'utf8'));
        console.log(`Line ${i}:`, d.tool_calls || d.content);
    }
}
