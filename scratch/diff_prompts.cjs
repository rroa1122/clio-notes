const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('scratch/autofill_assessment.json', 'utf8'));
let originalPrompt = "";
for (const node of wf) {
    if (node.name === 'Message a model') {
        originalPrompt = node.parameters.responses.values[0].content;
        break;
    }
}

const currentPrompt = fs.readFileSync('scratch/prompt_autofill_assessment.txt', 'utf8');

if (originalPrompt === currentPrompt) {
    console.log("Prompts are identical!");
    process.exit(0);
}

console.log("Prompts differ! Comparing line-by-line...");
const origLines = originalPrompt.split('\n');
const currLines = currentPrompt.split('\n');

const max = Math.max(origLines.length, currLines.length);
for (let i = 0; i < max; i++) {
    const o = origLines[i] || '';
    const c = currLines[i] || '';
    if (o.trim() !== c.trim()) {
        console.log(`Line ${i + 1}:`);
        console.log(`- ${o}`);
        console.log(`+ ${c}`);
    }
}
