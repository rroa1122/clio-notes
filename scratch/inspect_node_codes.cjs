const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/tcm_workflow.json', 'utf8'));

for (const n of data.nodes) {
    console.log(`\n================= Node: ${n.name} (${n.type}) =================`);
    if (n.parameters?.jsCode) {
        console.log('jsCode:\n' + n.parameters.jsCode);
    }
    if (n.parameters?.options) {
        console.log('options:', JSON.stringify(n.parameters.options, null, 2));
    }
    if (n.parameters?.messages?.values) {
        console.log('messages.values count:', n.parameters.messages.values.length);
        n.parameters.messages.values.forEach((m, idx) => {
            console.log(`-- Message ${idx} (${m.role}): len=${(m.content || m.message || '').length}`);
            console.log((m.content || m.message || '').substring(0, 200));
        });
    }
}
