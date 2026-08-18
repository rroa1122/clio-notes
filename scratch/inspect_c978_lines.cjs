const fs = require('fs');

for (const l of [702, 719, 721, 764, 765]) {
    const fn = `scratch/c978_line_${l}.json`;
    if (fs.existsSync(fn)) {
        const d = JSON.parse(fs.readFileSync(fn, 'utf8'));
        console.log(`=== c978 Line ${l} (${d.type}) ===`);
        if (d.tool_calls) console.log(`Tool calls:`, JSON.stringify(d.tool_calls).substring(0, 400));
        if (d.content) console.log(`Content preview:`, d.content.substring(0, 300));
    }
}
