const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\prompt_autofill_assessment.txt', 'utf8');

const lines = content.split('\n');
console.log("Searching for 'visit' in prompt_autofill_assessment.txt:");
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('visit') || line.toLowerCase().includes('conducted')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
