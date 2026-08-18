const { execSync } = require('child_process');
const fs = require('fs');

try {
    const cmd = `ssh -i C:\\Users\\REINIER\\.ssh\\id_rsa_clinicflow -o StrictHostKeyChecking=no root@clinicflow.dev "sqlite3 /root/n8n/database.sqlite \\"SELECT nodes FROM workflow_entity WHERE id = 'autofill-assessment-wf-id';\\""`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    const nodes = JSON.parse(output);
    const node = nodes.find(x => x.name === 'Message a model');
    if (node && node.parameters && node.parameters.prompt) {
        fs.writeFileSync('C:\\Users\\REINIER\\.gemini\\antigravity\\scratch\\clio-dashboard\\scratch\\prompt_autofill_assessment.txt', node.parameters.prompt, 'utf8');
        console.log("Successfully wrote prompt to scratch/prompt_autofill_assessment.txt. Length:", node.parameters.prompt.length);
    } else {
        console.log("No prompt found in model node.");
    }
} catch (e) {
    console.error("Error:", e.message);
}
