const { execSync } = require('child_process');
const fs = require('fs');

try {
    const cmd = `ssh -i C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "sqlite3 /root/n8n/database.sqlite \\"SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id';\\""`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    const nodes = JSON.parse(output);
    const node = nodes.find(x => x.name === 'Message a model');
    if (node) {
        fs.writeFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\model_node.json', JSON.stringify(node, null, 2), 'utf8');
        console.log("Successfully saved model node to model_node.json.");
    } else {
        console.log("Model node not found.");
    }
} catch (e) {
    console.error("Error:", e.message);
}
