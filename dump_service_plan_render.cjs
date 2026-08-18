const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\src\\pages\\PatientDetail.tsx', 'utf8');

const lines = content.split('\n');
const start = 4112;
const end = 4550;
const outputLines = [];
for (let i = start - 1; i < end; i++) {
    outputLines.push(`${i + 1}: ${lines[i]}`);
}
fs.writeFileSync('c:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\service_plan_output.txt', outputLines.join('\n'));
console.log("Done");
