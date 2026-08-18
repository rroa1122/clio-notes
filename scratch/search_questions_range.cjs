const fs = require('fs');
const filepath = 'C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\all_vue_questions.json';
const questions = JSON.parse(fs.readFileSync(filepath, 'utf8'));

console.log("Questions between ID 220 and 238:");
questions.forEach(q => {
    if (q.id >= 220 && q.id <= 238) {
        console.log(`ID: ${q.id}, Tipo: ${q.tipo}, Name: "${q.name_en}"`);
    }
});
