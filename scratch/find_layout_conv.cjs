const fs = require('fs');
const path = require('path');

const root = 'C:/Users/REINIER/.gemini/antigravity/brain';
const convs = fs.readdirSync(root);

for (const conv of convs) {
    const p = path.join(root, conv, '.system_generated', 'logs', 'transcript_full.jsonl');
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    if (content.includes('layout_responsive_specialist') || content.includes('Responsive Layout Specialist')) {
        console.log(`Found layout specialist in conv: ${conv}`);
    }
}
