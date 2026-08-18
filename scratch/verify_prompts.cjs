const fs = require('fs');

const promptFiles = [
  'scratch/tcm_prompt.md',
  'scratch/prompt_assessment.txt',
  'scratch/prompt_adult_certification.txt',
  'scratch/prompt_initial_home_visit.txt',
  'scratch/prompt_service_plan.txt'
];

for (const f of promptFiles) {
  const content = fs.readFileSync(f, 'utf8');
  console.log('=== File: ' + f + ' ===');
  console.log('  Length:', content.length);
  console.log('  has Normalize & Prepare Context:', content.includes('Normalize & Prepare Context'));
  console.log('  has Code in JavaScript:', content.includes('Code in JavaScript'));
  console.log('  has type "Rule-Out":', content.includes('"type": "Rule-Out"'));
  console.log('  has Return JSON only:', content.includes('Return JSON only.'));
  console.log('  has anti-hallucination clarification:', content.includes('Default stability applies ONLY to mental status and general safety observations'));
  console.log('  has hardcoded Claudia Leyva:', content.includes('Claudia Leyva'));
  console.log('  has hardcoded ARC MENTAL HEALTH constants:', content.includes('contact@arcmentalhealth.com'));
  console.log('  has location_name (legacy):', content.includes('"location_name"'));
  console.log('  has place_of_service_name (legacy):', content.includes('"place_of_service_name"'));
}
