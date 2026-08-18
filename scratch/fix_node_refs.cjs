const fs = require('fs');

const workflowFiles = [
  'scratch/tcm_workflow.json',
  'scratch/initial_home_visit_workflow.json',
  'scratch/assessment_workflow.json',
  'scratch/service_plan_workflow.json',
  'scratch/adult_certification_workflow.json'
];

for (const filePath of workflowFiles) {
  if (!fs.existsSync(filePath)) continue;
  let raw = fs.readFileSync(filePath, 'utf8');

  // Replace all references to old code nodes with $('Normalize & Prepare Context').item.json
  raw = raw
    .replace(/\$\('Code in JavaScript4'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
    .replace(/\$\('Code in JavaScript'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
    .replace(/\$\('Code in JavaScript2'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
    .replace(/\$\('Code in JavaScript3'\)\.item\.json/g, "$('Parse OpenAI Response').item.json");

  fs.writeFileSync(filePath, raw, 'utf8');
  console.log(`✅ Fixed references in ${filePath}`);
}
