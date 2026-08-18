const fs = require('fs');

const canonicalPreprocessorCode = `// Canonical preprocessor for clinical note workflows
const results = [];

for (const item of items) {
  const j = item.json ?? {};
  const outerBody = j.body ?? {};

  let inner = {};
  if (typeof outerBody.body === "string") {
    try {
      inner = JSON.parse(outerBody.body);
    } catch (e) {
      inner = {};
    }
  } else if (typeof outerBody.body === "object" && outerBody.body) {
    inner = outerBody.body;
  }

  // Combined body parameters
  const body = {
    ...outerBody,
    ...inner,
  };

  // Safely parse patient_clinical_context if present
  let patientData = {};
  const contextString = body.patient_clinical_context || j.patient_clinical_context;
  if (contextString) {
    try {
      patientData = typeof contextString === "string" ? JSON.parse(contextString) : contextString;
    } catch (e) {
      patientData = {};
    }
  }

  // Check binary audio presence
  const hasAudio = Boolean(item.binary && (item.binary.audio || item.binary.audio0 || item.binary.data));

  // Build clean root properties
  const normalizedJson = {
    ...j,
    body: body,
    // Client provided text/transcript fallback
    text: j.text ?? body.text ?? body.transcript ?? body.transcription ?? body.context ?? "",
    // Patient Fields
    patient_full_name: patientData.full_name || body.patient_name || body.name || "",
    patient_first_name: patientData.first_name || "",
    patient_last_name: patientData.last_name || "",
    patient_dob: patientData.dob || body.dob || "",
    patient_gender: patientData.gender || "",
    patient_phone: patientData.phone || "",
    patient_email: patientData.email || "",
    patient_ssn: patientData.ssn || "",
    patient_emr_id: patientData.emr_id || body.emr_id || "",
    patient_address: patientData.address || "",
    patient_citizenship: patientData.citizenship || "",
    // Coordination & Insurance
    patient_case_manager: patientData.case_manager || body.case_manager || "",
    patient_insurance_company: patientData.insurance_company || body.insurance || "",
    patient_diagnoses: patientData.diagnoses || body.diagnoses || [],
    patient_presenting_problems: patientData.presenting_problems || [],
    // PCP
    patient_pcp_name: patientData.pcp_name || "",
    patient_pcp_phone: patientData.pcp_phone || "",
    patient_pcp_address: patientData.pcp_address || "",
    patient_pcp_conditions: patientData.pcp_conditions || [],
    patient_pcp_medications: patientData.pcp_medications || [],
    // Psych
    patient_psych_name: patientData.psych_name || "",
    patient_psych_phone: patientData.psych_phone || "",
    patient_psych_address: patientData.psych_address || "",
    patient_psych_conditions: patientData.psych_conditions || [],
    patient_psych_medications: patientData.psych_medications || [],
    // Pharmacy
    patient_pharmacy_name: patientData.pharmacy_name || "",
    patient_pharmacy_phone: patientData.pharmacy_phone || "",
    patient_pharmacy_fax: patientData.pharmacy_fax || "",
    patient_pharmacy_address: patientData.pharmacy_address || "",
    // Full object
    patient_full_object: patientData,
    // Audio flag
    has_audio: hasAudio,
  };

  // Ensure audio metadata is valid if binary exists
  const binaryObj = item.binary ? { ...item.binary } : {};
  if (binaryObj.audio0) {
    binaryObj.audio0.fileName = binaryObj.audio0.fileName || "recording.webm";
    binaryObj.audio0.mimeType = binaryObj.audio0.mimeType || "audio/webm";
  } else if (binaryObj.audio) {
    binaryObj.audio0 = {
      ...binaryObj.audio,
      fileName: binaryObj.audio.fileName || "recording.webm",
      mimeType: binaryObj.audio.mimeType || "audio/webm",
    };
  }

  results.push({
    json: normalizedJson,
    binary: binaryObj,
  });
}

return results;
`;

const mergeTranscriptCode = `// Merge transcription text while preserving all patient context from Normalize node
const normalized = $('Normalize & Prepare Context').item.json;
const transcriptionText = items[0]?.json?.text || '';

return [{
  json: {
    ...normalized,
    text: transcriptionText || normalized.text || ''
  }
}];
`;

const workflowFiles = [
  'scratch/tcm_workflow.json',
  'scratch/initial_home_visit_workflow.json',
  'scratch/assessment_workflow.json',
  'scratch/service_plan_workflow.json',
  'scratch/adult_certification_workflow.json'
];

for (const filePath of workflowFiles) {
  if (!fs.existsSync(filePath)) continue;
  const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`\nOptimizing workflow: ${filePath} (${wf.name})`);

  // Remove redundant Code nodes (Code in JavaScript, Code in JavaScript2, Code in JavaScript4)
  // Keep Code in JavaScript3 (Parse OpenAI Response)
  const keptNodes = wf.nodes.filter(n => 
    n.name !== 'Code in JavaScript' && 
    n.name !== 'Code in JavaScript2' && 
    n.name !== 'Code in JavaScript4'
  );

  // 1. Add Normalize & Prepare Context Node
  const normalizeNode = {
    parameters: {
      jsCode: canonicalPreprocessorCode
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-350, -416],
    id: "canonical-normalize-prep-" + wf.id,
    name: "Normalize & Prepare Context"
  };

  // 2. Add If: Has Audio? Node
  const ifHasAudioNode = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "strict",
          version: 2
        },
        conditions: [
          {
            id: "audio-check-" + wf.id,
            leftValue: "={{ $json.has_audio }}",
            rightValue: true,
            operator: {
              type: "boolean",
              operation: "true",
              singleValue: true
            }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [-100, -416],
    id: "if-has-audio-" + wf.id,
    name: "If Has Audio"
  };

  // 3. Add Merge Transcription Node
  const mergeNode = {
    parameters: {
      jsCode: mergeTranscriptCode
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [350, -500],
    id: "merge-transcription-" + wf.id,
    name: "Merge Transcription"
  };

  // 4. Update Transcribe a recording position and settings
  const transcribeNode = keptNodes.find(n => n.name === 'Transcribe a recording');
  if (transcribeNode) {
    transcribeNode.position = [150, -500];
    transcribeNode.parameters.binaryPropertyName = "audio0";
    transcribeNode.retryOnFail = true;
    transcribeNode.maxTries = 3;
    transcribeNode.waitBetweenTries = 2000;
  }

  // 5. Update Message a model node with retries
  const messageNode = keptNodes.find(n => n.name === 'Message a model');
  if (messageNode) {
    messageNode.position = [550, -416];
    messageNode.retryOnFail = true;
    messageNode.maxTries = 3;
    messageNode.waitBetweenTries = 2000;

    // Normalize prompt expressions to refer to $json or Normalize node directly
    const msgValues = messageNode.parameters?.messages?.values || [];
    for (const m of msgValues) {
      if (typeof m.content === 'string') {
        m.content = m.content
          .replace(/\$\('Code in JavaScript4'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
          .replace(/\$\('Code in JavaScript'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
          .replace(/\$\('Code in JavaScript2'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json");
      }
      if (typeof m.message === 'string') {
        m.message = m.message
          .replace(/\$\('Code in JavaScript4'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
          .replace(/\$\('Code in JavaScript'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json")
          .replace(/\$\('Code in JavaScript2'\)\.item\.json/g, "$('Normalize & Prepare Context').item.json");
      }
    }
  }

  // 6. Update Code in JavaScript3 (Parse Response)
  const parseNode = keptNodes.find(n => n.name === 'Code in JavaScript3');
  if (parseNode) {
    parseNode.position = [800, -416];
    parseNode.name = "Parse OpenAI Response";
  }

  // 7. Update Respond to Webhook
  const respondNode = keptNodes.find(n => n.name === 'Respond to Webhook');
  if (respondNode) {
    respondNode.position = [1050, -416];
  }

  // Combine all nodes
  wf.nodes = [
    ...keptNodes.filter(n => n.name !== 'Code in JavaScript3'),
    normalizeNode,
    ifHasAudioNode,
    mergeNode,
    parseNode
  ];

  // Re-build clean Connections
  wf.connections = {
    "Webhook": {
      "main": [
        [
          {
            "node": "Normalize & Prepare Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Normalize & Prepare Context": {
      "main": [
        [
          {
            "node": "If Has Audio",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If Has Audio": {
      "main": [
        [
          {
            "node": "Transcribe a recording",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Message a model",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Transcribe a recording": {
      "main": [
        [
          {
            "node": "Merge Transcription",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Merge Transcription": {
      "main": [
        [
          {
            "node": "Message a model",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Message a model": {
      "main": [
        [
          {
            "node": "Parse OpenAI Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse OpenAI Response": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf8');
  console.log(`✅ ${filePath} updated successfully with canonical architecture.`);
}

// Also sanitize workflow_extract.json
if (fs.existsSync('scratch/workflow_extract.json')) {
  const extWf = JSON.parse(fs.readFileSync('scratch/workflow_extract.json', 'utf8'));
  const httpNode = extWf.nodes?.find(n => n.name === 'OpenAI Responses API');
  if (httpNode && httpNode.parameters?.headerParameters?.parameters) {
    for (const p of httpNode.parameters.headerParameters.parameters) {
      if (p.name === 'Authorization' && p.value?.includes('Bearer sk-')) {
        p.value = '=Bearer {{ $env.OPENAI_API_KEY }}';
        console.log('✅ Replaced hardcoded API key with env variable in workflow_extract.json');
      }
    }
  }
  fs.writeFileSync('scratch/workflow_extract.json', JSON.stringify(extWf, null, 2), 'utf8');
}
