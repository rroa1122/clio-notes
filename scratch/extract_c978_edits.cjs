const fs = require('fs');
const readline = require('readline');

async function inspectC978Edits() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/c9785a6c-54ee-4694-bc50-93e8f4f2213d/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (lineNum >= 680 && lineNum <= 770) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'PLANNER_RESPONSE') {
                    for (const tc of parsed.tool_calls || []) {
                        if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
                            console.log(`[c978 Line ${lineNum}] ${tc.args?.Description}`);
                            fs.writeFileSync(`scratch/c978_edit_${lineNum}.json`, JSON.stringify(tc, null, 2));
                        }
                    }
                }
            } catch (e) {}
        }
    }
}

inspectC978Edits();
