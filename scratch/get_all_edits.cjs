const fs = require('fs');
const readline = require('readline');

async function getAllEdits() {
    const transcripts = [
        "C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\55313013-aeb9-40df-842b-659301b57b45\\.system_generated\\logs\\transcript_full.jsonl",
        "C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\51345b3d-7948-4106-bf37-fef761d47bca\\.system_generated\\logs\\transcript_full.jsonl"
    ];

    const edits = [];

    for (const tPath of transcripts) {
        if (!fs.existsSync(tPath)) continue;
        const fileStream = fs.createReadStream(tPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const data = JSON.parse(line);
                if (data.type === 'PLANNER_RESPONSE') {
                    const tcalls = data.tool_calls || [];
                    tcalls.forEach(tc => {
                        if (tc.name === 'replace_file_content') {
                            const args = tc.args || {};
                            if ((args.TargetFile || '').includes('Record.tsx')) {
                                edits.push({
                                    type: 'single',
                                    description: args.Description || '',
                                    target: args.TargetContent,
                                    replacement: args.ReplacementContent
                                });
                            }
                        } else if (tc.name === 'multi_replace_file_content') {
                            const args = tc.args || {};
                            if ((args.TargetFile || '').includes('Record.tsx')) {
                                const chunks = args.ReplacementChunks || [];
                                edits.push({
                                    type: 'multi',
                                    description: args.Description || '',
                                    chunks: chunks.map(c => ({
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
    }

    console.log(`Total edits across transcripts: ${edits.length}`);
    fs.writeFileSync('scratch/all_edits_combined.json', JSON.stringify(edits, null, 2));
}

getAllEdits();
