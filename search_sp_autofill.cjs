const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\src\\pages\\PatientDetail.tsx', 'utf8');

const lines = content.split('\n');
const start = 1110;
const end = 1270;
for (let i = start - 1; i < end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
