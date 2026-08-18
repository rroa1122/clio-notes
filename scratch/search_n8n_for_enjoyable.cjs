const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\autofill_assessment.json', 'utf8');
console.log("Does autofill_assessment.json contain 'enjoyable_activities'?");
console.log(content.includes('enjoyable_activities'));
