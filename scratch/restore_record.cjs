const fs = require('fs');
const readline = require('readline');

const transcriptPath = "C:\\Users\\REINIER\\.gemini\\antigravity\\brain\\55313013-aeb9-40df-842b-659301b57b45\\.system_generated\\logs\\transcript_full.jsonl";

const rl = readline.createInterface({
    input: fs.createReadStream(transcriptPath),
    output: process.stdout,
    terminal: false
});

const edits = [];

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const data = JSON.parse(line);
        if (data.type === 'PLANNER_RESPONSE') {
            const tcalls = data.tool_calls || [];
            tcalls.forEach(tc => {
                if (tc.name === 'replace_file_content') {
                    const args = tc.args || {};
                    const targetFile = args.TargetFile || '';
                    if (targetFile.includes('Record.tsx')) {
                        edits.push({
                            type: 'single',
                            description: args.Description || '',
                            target: args.TargetContent,
                            replacement: args.ReplacementContent,
                            startLine: args.StartLine,
                            endLine: args.EndLine
                        });
                    }
                } else if (tc.name === 'multi_replace_file_content') {
                    const args = tc.args || {};
                    const targetFile = args.TargetFile || '';
                    if (targetFile.includes('Record.tsx')) {
                        const chunks = args.ReplacementChunks || [];
                        edits.push({
                            type: 'multi',
                            description: args.Description || '',
                            chunks: chunks.map(c => ({
                                target: c.TargetContent,
                                replacement: c.ReplacementContent,
                                startLine: c.StartLine,
                                endLine: c.EndLine
                            }))
                        });
                    }
                }
            });
        }
    } catch (e) {
        // ignore
    }
});

rl.on('close', () => {
    console.log(`Found ${edits.length} edits targeting Record.tsx.`);
    const output = [];
    edits.forEach((edit, idx) => {
        output.push(`=== EDIT ${idx + 1}: ${edit.description} ===`);
        if (edit.type === 'single') {
            output.push(`Type: single`);
            output.push(`StartLine: ${edit.startLine}, EndLine: ${edit.endLine}`);
            output.push(`TargetContent:\n${edit.target}`);
            output.push(`----------------------------------`);
            output.push(`ReplacementContent:\n${edit.replacement}`);
        } else {
            output.push(`Type: multi`);
            edit.chunks.forEach((chunk, cIdx) => {
                output.push(`  Chunk ${cIdx + 1}: StartLine: ${chunk.startLine}, EndLine: ${chunk.endLine}`);
                output.push(`  TargetContent:\n${chunk.target}`);
                output.push(`  ----------------------------------`);
                output.push(`  ReplacementContent:\n${chunk.replacement}`);
            });
        }
        output.push(`==================================\n\n`);
    });
    
    fs.writeFileSync('scratch/all_record_edits.txt', output.join('\n'), 'utf8');
    console.log("Wrote all edits details to scratch/all_record_edits.txt");
});
