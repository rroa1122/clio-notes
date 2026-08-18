const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\amexzone-notes-bot\\worker.js', 'utf8');
const lines = content.split('\n');

console.log("Locating where isServicePlan condition branches:");
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('if (isServicePlan)') || line.includes('const isServicePlan =')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
}

// Search for the end of the Service Plan block (find "else")
// Let's search for "else" in the range of line 1800 to 2500
console.log("\nSearching for 'else' around line 2000:");
for (let i = 1800; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('} else {') || line.includes('else {')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
}
