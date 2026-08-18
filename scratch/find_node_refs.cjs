const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('scratch/tcm_workflow.json', 'utf8'));
const msgNode = wf.nodes.find(n => n.name === 'Message a model');
console.log('msgNode params keys:', Object.keys(msgNode.parameters));
console.log('msgNode params:', JSON.stringify(msgNode.parameters, null, 2).substring(0, 500));
const str = JSON.stringify(msgNode);
const matches = str.match(/\$\('[^']+'\)/g) || [];
console.log('All node refs:', [...new Set(matches)]);
