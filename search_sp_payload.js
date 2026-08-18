const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\src\\pages\\PatientDetail.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (idx >= 870 && idx <= 920) {
        console.log(`L${idx+1}: ${line.trim()}`);
    }
});
