const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

// Find all matches for "assessment" or "TCM_ASSESSMENT" or "fillInputById" in relation to assessment
const lines = content.split('\n');
console.log("Analyzing worker.js for assessment-specific filling logic:");
let inAssessmentSection = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('isServicePlan') || line.includes("docType === 'assessment'")) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
    if (line.includes('//') && line.toLowerCase().includes('assessment') && line.toLowerCase().includes('field')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
}

// Let's print around line 1300 to 1700 of worker.js
console.log("\nPrinting worker.js L1250-1350 lines containing filling calls:");
for (let i = 1250; i < 1350; i++) {
    if (lines[i]) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
