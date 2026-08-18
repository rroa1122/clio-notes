const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function searchAllBrains() {
    const root = 'C:/Users/REINIER/.gemini/antigravity/brain';
    const convs = fs.readdirSync(root);

    for (const conv of convs) {
        const logPath = path.join(root, conv, '.system_generated', 'logs', 'transcript_full.jsonl');
        if (!fs.existsSync(logPath)) continue;

        const fileStream = fs.createReadStream(logPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let lineIdx = 0;
        for await (const line of rl) {
            lineIdx++;
            if (line.includes('write_to_file') && line.includes('Record.tsx')) {
                try {
                    const parsed = JSON.parse(line);
                    for (const tc of parsed.tool_calls || []) {
                        if (tc.name === 'write_to_file' && (tc.args?.TargetFile || '').includes('Record.tsx')) {
                            const content = tc.args.CodeContent;
                            console.log(`FOUND write_to_file in conv ${conv} line ${lineIdx}, len: ${content.length}`);
                            fs.writeFileSync(`scratch/dump_record_${conv}_${lineIdx}.tsx`, content, 'utf8');
                        }
                    }
                } catch (e) {}
            }
        }
    }
}

searchAllBrains();
