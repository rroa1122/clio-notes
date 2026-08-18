const { execSync } = require('child_process');

try {
    const cmd = `ssh -i C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "sqlite3 /root/n8n/database.sqlite \\"SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id';\\""`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    const nodes = JSON.parse(output);
    const node = nodes.find(x => x.name === 'Message a model');
    if (node && node.parameters && node.parameters.messages && node.parameters.messages.messageValues) {
        node.parameters.messages.messageValues.forEach((msg, idx) => {
            console.log(`Message ${idx} (${msg.type}): length = ${msg.message.length}`);
            if (msg.type === 'system') {
                console.log("Saving system message to scratch/prompt_autofill_assessment.txt...");
                require('fs').writeFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\prompt_autofill_assessment.txt', msg.message, 'utf8');
            }
        });
    } else {
        console.log("No messages structure found.");
    }
} catch (e) {
    console.error("Error:", e.message);
}
