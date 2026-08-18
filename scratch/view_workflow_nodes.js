const { execSync } = require('child_process');

try {
    const cmd = `ssh -i C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "sqlite3 /root/n8n/database.sqlite \\"SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id';\\""`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    const nodes = JSON.parse(output);
    console.log("Nodes count:", nodes.length);
    nodes.forEach((node, idx) => {
        console.log(`Node ${idx}: Name="${node.name}", Type="${node.type}"`);
        if (node.type.includes('OpenAi') || node.type.includes('Model') || node.name.toLowerCase().includes('model') || node.name.toLowerCase().includes('prompt')) {
            console.log("Found model node:", JSON.stringify(node, null, 2));
        }
    });
} catch (e) {
    console.error("Error:", e.message);
}
