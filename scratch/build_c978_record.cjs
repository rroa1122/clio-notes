const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

async function buildRecordFromC978() {
    const fileStream = fs.createReadStream('C:/Users/REINIER/.gemini/antigravity/brain/c9785a6c-54ee-4694-bc50-93e8f4f2213d/.system_generated/logs/transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const edits = [];
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
                                desc: args.Description || '',
                                target: args.TargetContent,
                                replacement: args.ReplacementContent
                            });
                        }
                    } else if (tc.name === 'multi_replace_file_content') {
                        const args = tc.args || {};
                        if ((args.TargetFile || '').includes('Record.tsx')) {
                            edits.push({
                                type: 'multi',
                                desc: args.Description || '',
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

    console.log(`Extracted ${edits.length} edits from c978.`);

    execSync('git checkout src/notes-module/pages/Record.tsx');
    let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8').replace(/\r\n/g, '\n');

    let applied = 0;
    let failed = 0;
    for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        if (edit.type === 'single') {
            const target = edit.target.replace(/\r\n/g, '\n');
            const replacement = edit.replacement.replace(/\r\n/g, '\n');
            if (code.includes(target)) {
                code = code.replace(target, replacement);
                applied++;
            } else {
                console.log(`Failed edit ${i + 1}: ${edit.desc}`);
                failed++;
            }
        } else {
            let canApply = true;
            for (const c of edit.chunks) {
                if (!code.includes(c.target.replace(/\r\n/g, '\n'))) {
                    canApply = false;
                    break;
                }
            }
            if (canApply) {
                for (const c of edit.chunks) {
                    code = code.replace(c.target.replace(/\r\n/g, '\n'), c.replacement.replace(/\r\n/g, '\n'));
                }
                applied++;
            } else {
                console.log(`Failed multi edit ${i + 1}: ${edit.desc}`);
                failed++;
            }
        }
    }

    console.log(`Result -> Applied: ${applied}, Failed: ${failed}`);
    fs.writeFileSync('src/notes-module/pages/Record.tsx', code, 'utf8');
}

buildRecordFromC978();
