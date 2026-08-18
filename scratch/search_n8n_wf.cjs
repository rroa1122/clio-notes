const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\autofill_assessment.json', 'utf8'));

console.log("wf type:", Array.isArray(wf) ? "array" : typeof wf);
console.log("wf keys:", Object.keys(wf));
const nodes = wf.nodes || (Array.isArray(wf) ? wf : wf.workflow?.nodes);
if (nodes) {
    console.log(`Found ${nodes.length} nodes:`);
    nodes.forEach(node => {
        console.log(`Node: "${node.name}" (${node.type})`);
        if (node.type === 'n8n-nodes-base.set' || node.type === 'n8n-nodes-base.aggregate') {
            console.log(`  Parameters:`, JSON.stringify(node.parameters, null, 2));
        }
    });
} else {
    console.log("Could not find nodes array.");
}
