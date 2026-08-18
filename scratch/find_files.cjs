const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern, results = []) {
    try {
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
                if (file.toLowerCase().includes(pattern.toLowerCase())) {
                    results.push(fullPath);
                } else {
                    // Check file content
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes(pattern)) {
                            results.push(fullPath);
                        }
                    } catch (e) {}
                }
            }
        }
    } catch (e) {}
    return results;
}

console.log("Searching for worker.js:");
console.log(searchDir('C:\\Users\\REINIER\\.gemini\\antigravity', 'worker.js'));

console.log("\nSearching for enjoyable_activities:");
console.log(searchDir('C:\\Users\\REINIER\\.gemini\\antigravity', 'enjoyable_activities'));
