const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            searchDir(full);
        } else if (e.name === 'transcript_full.jsonl') {
            console.log(`Found transcript: ${full}`);
            const content = fs.readFileSync(full, 'utf8');
            if (content.includes('Total Lines: 3424') || content.includes('Compact Recorded Services Capsule Ribbon')) {
                console.log(`  MATCH IN: ${full}`);
            }
        }
    }
}

searchDir('C:/Users/REINIER/.gemini/antigravity/brain');
