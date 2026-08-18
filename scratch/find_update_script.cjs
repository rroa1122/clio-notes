const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern, results = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === '.agents') continue;
        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (e) {
            continue;
        }
        if (stat.isDirectory()) {
            searchDir(fullPath, pattern, results);
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.toLowerCase().includes(pattern.toLowerCase())) {
                    results.push(fullPath);
                }
            } catch (e) {}
        }
    }
    return results;
}

console.log("Files containing 'update_':");
console.log(searchDir('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot', 'update_'));
console.log("Files containing 'database.sqlite':");
console.log(searchDir('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot', 'database.sqlite'));
