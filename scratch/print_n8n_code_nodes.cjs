const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\autofill_assessment.json', 'utf8'));

wf.forEach((node, idx) => {
    if (node.type === 'n8n-nodes-base.code') {
        console.log(`\n===================================`);
        console.log(`Node Index ${idx}: "${node.name}" (${node.type})`);
        console.log(`===================================`);
        console.log(node.parameters.jsCode);
    }
});
