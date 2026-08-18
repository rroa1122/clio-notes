const fs = require('fs');
// Let's check if there is an EMR dump of Vue structure
const filepath = 'C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\all_vue_questions.json';
const questions = JSON.parse(fs.readFileSync(filepath, 'utf8'));

// Find question 233 and print it
const q = questions.find(x => x.id === 233);
console.log("Question 233 in all_vue_questions.json:", q);

// Let's search inside autofill_assessment.json if there are any other details
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\autofill_assessment.json', 'utf8');
const regex = /233/g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(`Found '233' at index ${match.index}:`, content.slice(match.index - 50, match.index + 50));
}
