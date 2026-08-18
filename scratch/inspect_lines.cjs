const fs = require('fs');

for (const l of [1320, 1321, 1322, 1323, 1324]) {
    const fn = `scratch/transcript_line_${l}.json`;
    if (fs.existsSync(fn)) {
        const d = JSON.parse(fs.readFileSync(fn, 'utf8'));
        console.log(`=== Line ${l} (${d.type}) ===`);
        if (d.content) console.log(`Content len: ${d.content.length}, preview: ${d.content.substring(0, 300)}`);
        if (d.tool_calls) console.log(`Tool calls:`, JSON.stringify(d.tool_calls).substring(0, 300));
    }
}
