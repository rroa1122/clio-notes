const fs = require('fs');
const readline = require('readline');

async function extractCurrentConv() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/51345b3d-7948-4106-bf37-fef761d47bca/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const edits = [];
    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.type === 'PLANNER_RESPONSE') {
                const tcalls = data.tool_calls || [];
                tcalls.forEach(tc => {
                    if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
                        const args = tc.args || {};
                        if ((args.TargetFile || '').includes('Record.tsx')) {
                            edits.push({
                                type: tc.name === 'replace_file_content' ? 'single' : 'multi',
                                desc: args.Description || '',
                                target: args.TargetContent,
                                replacement: args.ReplacementContent,
                                chunks: (args.ReplacementChunks || []).map(c => ({
                                    target: c.TargetContent,
                                    replacement: c.ReplacementContent
                                }))
                            });
                        }
                    }
                });
            }
        } catch (e) {}
    }

    console.log(`Extracted ${edits.length} edits from current conversation.`);
    edits.forEach((e, idx) => console.log(`Edit ${idx + 1}: ${e.desc}`));
}

extractCurrentConv();
