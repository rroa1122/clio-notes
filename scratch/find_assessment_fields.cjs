const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');
const lines = content.split('\n');

console.log("Locating filling calls after line 2200 of worker.js:");
for (let i = 2200; i < 2350; i++) {
    const line = lines[i];
    if (line.includes('fillInputById') || line.includes('selectOptionById') || line.includes('clickRadioById') || line.includes('setCheckboxById') || line.includes('table8')) {
        console.log(`${i+1}: ${line.trim()}`);
    }
}
