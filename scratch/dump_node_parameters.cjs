const { execSync } = require('child_process');

try {
    const cmd = `ssh -i C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "sqlite3 /root/n8n/database.sqlite \\"SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id';\\""`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    const nodes = JSON.parse(output);
    const node = nodes.find(x => x.name === 'Message a model');
    if (node) {
        console.log("Parameters:", JSON.stringify(node.parameters, null, 2));
    } else {
        console.log("Model node not found.");
    }
} catch (e) {
    console.error("Error:", e.message);
}
