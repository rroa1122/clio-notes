const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');

console.log("Does worker.js contain '238'?");
console.log(content.includes('238'));

// Let's search all bot files for "238" to see if there is any script referencing it
const files = fs.readdirSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot');
console.log("Files referencing '238':");
files.forEach(f => {
    if (f.endsWith('.js') || f.endsWith('.cjs')) {
        const c = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\' + f, 'utf8');
        if (c.includes('238')) {
            console.log(`- ${f}`);
        }
    }
});
