const fs = require('fs');

const files = [
    'scratch/tcm_workflow.json',
    'scratch/initial_home_visit_workflow.json',
    'scratch/assessment_workflow.json',
    'scratch/service_plan_workflow.json',
    'scratch/adult_certification_workflow.json',
    'scratch/workflow_extract.json'
];

for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log(`\n==========================================`);
    console.log(`Workflow: ${f} (ID: ${data.id}, Name: ${data.name})`);
    const nodes = data.nodes || [];
    console.log(`Nodes (${nodes.length}):`);
    for (const n of nodes) {
        console.log(`  - ${n.name} [${n.type}] (id: ${n.id})`);
    }
    console.log(`Connections:`);
    const connections = data.connections || {};
    for (const [src, targets] of Object.entries(connections)) {
        console.log(`  ${src} ->`, JSON.stringify(targets));
    }
}
