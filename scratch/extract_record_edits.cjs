const fs = require('fs');
const readline = require('readline');

const transcriptPath = "C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\55313013-aeb9-40df-842b-659301b57b45\\.system_generated\\logs\\transcript_full.jsonl";

const rl = readline.createInterface({
    input: fs.createReadStream(transcriptPath),
    output: process.stdout,
    terminal: false
});

let lineNum = 0;
rl.on('line', (line) => {
    lineNum++;
    if (!line.trim()) return;
    try {
        const data = JSON.parse(line);
        if (data.type === 'PLANNER_RESPONSE') {
            const tcalls = data.tool_calls || [];
            tcalls.forEach(tc => {
                if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
                    const args = tc.args || {};
                    const argsStr = JSON.stringify(args);
                    if (argsStr.includes('Record.tsx')) {
                        console.log(`Line ${lineNum}: Tool ${tc.name}`);
                        console.log("--------------------------------------------------");
                        console.log(JSON.stringify(args, null, 2));
                        console.log("==================================================\n");
                    }
                }
            });
        }
    } catch (e) {
        // ignore
    }
});
