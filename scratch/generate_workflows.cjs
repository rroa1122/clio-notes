const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const baseWorkflowPath = path.resolve(__dirname, 'tcm_workflow.json');
const promptAssessmentPath = path.resolve(__dirname, 'prompt_assessment.txt');
const promptServicePlanPath = path.resolve(__dirname, 'prompt_service_plan.txt');
const promptInitialHomeVisitPath = path.resolve(__dirname, 'prompt_initial_home_visit.txt');

const outAssessmentPath = path.resolve(__dirname, 'assessment_workflow.json');
const outServicePlanPath = path.resolve(__dirname, 'service_plan_workflow.json');
const outInitialHomeVisitPath = path.resolve(__dirname, 'initial_home_visit_workflow.json');

// Read files
const workflow = JSON.parse(fs.readFileSync(baseWorkflowPath, 'utf8'));
let promptAssessment = fs.readFileSync(promptAssessmentPath, 'utf8');
let promptServicePlan = fs.readFileSync(promptServicePlanPath, 'utf8');
let promptInitialHomeVisit = fs.readFileSync(promptInitialHomeVisitPath, 'utf8');

// Ensure prompts start with '=' for n8n expressions
if (!promptAssessment.startsWith('=')) {
    promptAssessment = '=' + promptAssessment;
}
if (!promptServicePlan.startsWith('=')) {
    promptServicePlan = '=' + promptServicePlan;
}
if (!promptInitialHomeVisit.startsWith('=')) {
    promptInitialHomeVisit = '=' + promptInitialHomeVisit;
}

// Helper to clone object
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ----------------------------------------------------
// 1. GENERATE ASSESSMENT WORKFLOW
// ----------------------------------------------------
const assessmentWf = clone(workflow);

// Use the specific ID we already created so n8n overwrites it
assessmentWf.id = 'GppDFTdj19n9o3Q2';
assessmentWf.versionId = crypto.randomUUID();
delete assessmentWf.versionCounter;
delete assessmentWf.shared; // remove sharing link
assessmentWf.name = "NOTA MEDICA ASSESSMENT";

// Update Webhook path
const assessmentWebhook = assessmentWf.nodes.find(n => n.name === 'Webhook');
if (assessmentWebhook) {
    assessmentWebhook.parameters.path = "tcm-assessment-note";
} else {
    console.error("Warning: Webhook node not found in assessment");
}

// Update Message a model prompt
const assessmentModel = assessmentWf.nodes.find(n => n.name === 'Message a model');
if (assessmentModel) {
    assessmentModel.parameters.responses.values[0].content = promptAssessment;
} else {
    console.error("Warning: Message a model node not found in assessment");
}

fs.writeFileSync(outAssessmentPath, JSON.stringify(assessmentWf, null, 2), 'utf8');
console.log(`Generated: ${outAssessmentPath}`);


// ----------------------------------------------------
// 2. GENERATE SERVICE PLAN WORKFLOW
// ----------------------------------------------------
const servicePlanWf = clone(workflow);

// Use the specific ID we already created so n8n overwrites it
servicePlanWf.id = 'RvtViS0iE8lV67ye';
servicePlanWf.versionId = crypto.randomUUID();
delete servicePlanWf.versionCounter;
delete servicePlanWf.shared;
servicePlanWf.name = "NOTA MEDICA SERVICE PLAN";

// Update Webhook path
const servicePlanWebhook = servicePlanWf.nodes.find(n => n.name === 'Webhook');
if (servicePlanWebhook) {
    servicePlanWebhook.parameters.path = "tcm-service-plan-note";
} else {
    console.error("Warning: Webhook node not found in service plan");
}

// Update Message a model prompt
const servicePlanModel = servicePlanWf.nodes.find(n => n.name === 'Message a model');
if (servicePlanModel) {
    servicePlanModel.parameters.responses.values[0].content = promptServicePlan;
} else {
    console.error("Warning: Message a model node not found in service plan");
}

fs.writeFileSync(outServicePlanPath, JSON.stringify(servicePlanWf, null, 2), 'utf8');
console.log(`Generated: ${outServicePlanPath}`);


// ----------------------------------------------------
// 3. GENERATE INITIAL HOME VISIT WORKFLOW
// ----------------------------------------------------
const initialHomeVisitWf = clone(workflow);

// Use a unique ID for Initial Home Visit
initialHomeVisitWf.id = 'K3aJ8zeSNCBx6QFL';
initialHomeVisitWf.versionId = crypto.randomUUID();
delete initialHomeVisitWf.versionCounter;
delete initialHomeVisitWf.shared;
initialHomeVisitWf.name = "NOTA MEDICA INITIAL HOME VISIT";

// Update Webhook path
const ihvWebhook = initialHomeVisitWf.nodes.find(n => n.name === 'Webhook');
if (ihvWebhook) {
    ihvWebhook.parameters.path = "tcm-initial-home-visit-note";
} else {
    console.error("Warning: Webhook node not found in initial home visit");
}

// Update Message a model prompt
const ihvModel = initialHomeVisitWf.nodes.find(n => n.name === 'Message a model');
if (ihvModel) {
    ihvModel.parameters.responses.values[0].content = promptInitialHomeVisit;
} else {
    console.error("Warning: Message a model node not found in initial home visit");
}

fs.writeFileSync(outInitialHomeVisitPath, JSON.stringify(initialHomeVisitWf, null, 2), 'utf8');
console.log(`Generated: ${outInitialHomeVisitPath}`);
