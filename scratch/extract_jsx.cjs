const fs = require('fs');

const content = fs.readFileSync('scratch/all_record_edits.txt', 'utf8');

// Find all occurrences of "=== EDIT 13:"
const edit10Match = content.match(/=== EDIT 10:[\s\S]*?=== EDIT 11:/);
const edit13Match = content.match(/=== EDIT 13:[\s\S]*?=== EDIT 14:/);
const edit14Match = content.match(/=== EDIT 14:[\s\S]*?=== EDIT 15:/);

const output = [];
if (edit10Match) {
    output.push("=== EDIT 10 ===");
    output.push(edit10Match[0]);
}
if (edit13Match) {
    output.push("=== EDIT 13 ===");
    output.push(edit13Match[0]);
}
if (edit14Match) {
    output.push("=== EDIT 14 ===");
    output.push(edit14Match[0]);
}

fs.writeFileSync('scratch/extracted_jsx.txt', output.join('\n\n'), 'utf8');
console.log("Wrote JSX blocks to scratch/extracted_jsx.txt");
