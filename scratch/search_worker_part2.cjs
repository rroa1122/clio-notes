const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');
const lines = content.split('\n');

console.log("Searching for assessment handling blocks in worker.js L1350-2500:");
for (let i = 1350; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('} else {') && lines[i+1] && lines[i+1].includes('// Auto-llenado de EVALUACION')) {
        console.log(`Found around line ${i+1}:`);
        for (let j = i; j < i + 100 && j < lines.length; j++) {
            console.log(`${j+1}: ${lines[j]}`);
        }
        break;
    }
    // Also look for "else" or "assessment"
    if (line.includes('// Auto-llenado de') || line.includes('// Llenado de') || line.includes('// Llenar campos de la evaluación')) {
        console.log(`Found comment at line ${i+1}: ${line.trim()}`);
        for (let j = i; j < i + 100 && j < lines.length; j++) {
            console.log(`${j+1}: ${lines[j]}`);
        }
        break;
    }
}
