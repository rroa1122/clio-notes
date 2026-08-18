const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

// Let's find approvedBlocks definition and parse descriptions/needs
const startIdx = content.indexOf('const approvedBlocks = {');
const endIdx = content.indexOf('// 6. Section IV'); // worker.js Section IV is usually next
const blockText = content.slice(startIdx, endIdx);

// Regex search for all domains
const lines = blockText.split('\n');
let currentDomain = '';
lines.forEach(line => {
    if (line.includes('domain_') && line.includes(': [')) {
        currentDomain = line.trim().split(':')[0];
        console.log(`\n=== ${currentDomain} ===`);
    }
    if (line.includes('name:') || line.includes('description:') || line.includes('needs:')) {
        console.log(line.trim());
    }
});
