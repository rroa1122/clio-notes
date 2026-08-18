const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

const lines = content.split('\n');
console.log("Searching for 'visit' or 'conducted' or 'home' in worker.js L2000-3352:");
for (let i = 2000; i < 3352; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('visit') || line.toLowerCase().includes('conducted') || line.toLowerCase().includes('home')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
}
