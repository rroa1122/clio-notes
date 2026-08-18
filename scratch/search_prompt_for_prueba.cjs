const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\prompt_autofill_assessment.txt', 'utf8');

const lines = content.split('\n');
console.log("Searching for 'prueba' or 'Reinaldo' in prompt_autofill_assessment.txt:");
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('prueba') || line.toLowerCase().includes('reinaldo') || line.toLowerCase().includes('hernandez')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
