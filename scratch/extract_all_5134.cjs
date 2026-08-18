const fs = require('fs');
const readline = require('readline');

async function extractAll5134() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const writes = [];
    const edits = [];
    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.type === 'PLANNER_RESPONSE') {
                const tcalls = data.tool_calls || [];
                tcalls.forEach(tc => {
                    if (tc.name === 'write_to_file' && (tc.args?.TargetFile || '').includes('Record.tsx')) {
                        writes.push({ line: lineNum, file: tc.args.TargetFile, content: tc.args.CodeContent });
                    }
                    if (tc.name === 'replace_file_content' && (tc.args?.TargetFile || '').includes('Record.tsx')) {
                        edits.push({ line: lineNum, desc: tc.args.Description, target: tc.args.TargetContent, replacement: tc.args.ReplacementContent });
                    }
                    if (tc.name === 'multi_replace_file_content' && (tc.args?.TargetFile || '').includes('Record.tsx')) {
                        edits.push({ line: lineNum, desc: tc.args.Description, chunks: tc.args.ReplacementChunks });
                    }
                });
            }
        } catch (e) {}
    }

    console.log(`Writes: ${writes.length}, Edits: ${edits.length}`);
    edits.forEach(e => console.log(`[Line ${e.line}] ${e.desc}`));
    if (writes.length > 0) {
        writes.forEach(w => {
            console.log(`[Write at Line ${w.line}] len: ${w.content.length}`);
            fs.writeFileSync(`scratch/saved_record_line_${w.line}.tsx`, w.content);
        });
    }
}

extractAll5134();
