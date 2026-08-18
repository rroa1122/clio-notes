const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

const lines = content.split('\n');
console.log("Searching for '238' in worker.js:");
lines.forEach((line, idx) => {
    if (line.includes('238')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
