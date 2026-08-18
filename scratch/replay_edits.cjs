const fs = require('fs');
const { execSync } = require('child_process');

// Reset Record.tsx from git
execSync('git checkout src/notes-module/pages/Record.tsx');
let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8').replace(/\r\n/g, '\n');

const edits = JSON.parse(fs.readFileSync('scratch/all_edits_combined.json', 'utf8'));

let appliedCount = 0;
let failedCount = 0;

for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    console.log(`Applying edit ${i + 1}/${edits.length}: ${edit.description}`);

    if (edit.type === 'single') {
        const target = edit.target.replace(/\r\n/g, '\n');
        const replacement = edit.replacement.replace(/\r\n/g, '\n');
        if (code.includes(target)) {
            code = code.replace(target, replacement);
            appliedCount++;
        } else {
            console.warn(`  FAILED single edit ${i + 1}`);
            failedCount++;
        }
    } else if (edit.type === 'multi') {
        let allChunksFound = true;
        for (const chunk of edit.chunks) {
            const target = chunk.target.replace(/\r\n/g, '\n');
            if (!code.includes(target)) {
                allChunksFound = false;
                break;
            }
        }
        if (allChunksFound) {
            for (const chunk of edit.chunks) {
                const target = chunk.target.replace(/\r\n/g, '\n');
                const replacement = chunk.replacement.replace(/\r\n/g, '\n');
                code = code.replace(target, replacement);
            }
            appliedCount++;
        } else {
            console.warn(`  FAILED multi edit ${i + 1}`);
            failedCount++;
        }
    }
}

console.log(`Applied: ${appliedCount}, Failed: ${failedCount}`);
fs.writeFileSync('src/notes-module/pages/Record.tsx', code, 'utf8');

// Also run update_record_popovers if needed
if (fs.existsSync('scratch/update_record_popovers.cjs')) {
    try {
        require('./update_record_popovers.cjs');
    } catch (e) {}
}
