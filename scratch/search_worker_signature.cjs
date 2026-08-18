const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

const lines = content.split('\n');
console.log("Searching for home visit or signature selectors in worker.js:");
lines.forEach((line, idx) => {
    if (line.includes('1638') || line.includes('home_visit') || line.includes('home-visit') || line.includes('conducted') || line.includes('237') || line.includes('124')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
