const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

const lines = content.split('\n');
console.log("Searching for 'pregunta_' in worker.js L1700-2000:");
for (let i = 1700; i < 2000; i++) {
    const line = lines[i];
    if (line.includes('pregunta_')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
}
