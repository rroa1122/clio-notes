const fs = require('fs');
const readline = require('readline');

async function findRecordWrites() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let found = [];
    let lineIdx = 0;
    for await (const line of rl) {
        lineIdx++;
        if (line.includes('write_to_file') && line.includes('Record.tsx')) {
            console.log(`write_to_file at line ${lineIdx}`);
            found.push(lineIdx);
            try {
                const parsed = JSON.parse(line);
                if (parsed.tool_calls) {
                    for (const tc of parsed.tool_calls) {
                        const args = tc.args || tc.parameters || (tc.function && tc.function.arguments);
                        const codeContent = typeof args === 'string' ? JSON.parse(args).CodeContent : args?.CodeContent;
                        if (codeContent) {
                            fs.writeFileSync(`scratch/record_write_${lineIdx}.tsx`, codeContent);
                            console.log(`Saved scratch/record_write_${lineIdx}.tsx (length ${codeContent.length})`);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
}

findRecordWrites();
