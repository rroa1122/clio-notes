const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\prompt_autofill_assessment.txt', 'utf8');

const lines = content.split('\n');
console.log("Printing L280-305 of prompt_autofill_assessment.txt:");
for (let i = 280; i < 305; i++) {
    if (lines[i]) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
