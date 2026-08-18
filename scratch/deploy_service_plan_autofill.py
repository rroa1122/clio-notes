import sqlite3
import json
import uuid
from datetime import datetime

db_path = '/root/n8n/database.sqlite'
wf_id = 'autofill-service-plan-wf-id'
name = 'AUTOFILL SERVICE PLAN WITH AI'
active = 1

now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%f')[:-3]

# Define the nodes JSON
nodes = [
  {
    "parameters": {
      "respondWith": "json",
      "responseBody": "={{ $json }}",
      "options": {
        "responseHeaders": {
          "entries": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Access-Control-Allow-Origin",
              "value": "*"
            },
            {
              "name": "Access-Control-Allow-Methods",
              "value": "POST, GET, OPTIONS"
            },
            {
              "name": "Access-Control-Allow-Headers",
              "value": "Content-Type, Authorization"
            }
          ]
        }
      }
    },
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.4,
    "position": [
      1008,
      -416
    ],
    "id": "respond-to-webhook-id",
    "name": "Respond to Webhook"
  },
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "autofill-service-plan",
      "responseMode": "responseNode",
      "options": {}
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2.1,
    "position": [
      -576,
      -416
    ],
    "id": "webhook-autofill-service-plan-id",
    "name": "Webhook",
    "webhookId": "6b8b4567-e89b-12d3-a456-426614174000"
  },
  {
    "parameters": {
      "jsCode": "for (const item of $input.all()) {\n  const b = item.json.body || {};\n  item.json.patient_full_name = b.full_name || '';\n  item.json.patient_dob = b.dob || '';\n  const dobStr = b.dob || '';\n  let age = '';\n  if (dobStr) {\n    const dob = new Date(dobStr);\n    const today = new Date();\n    age = today.getFullYear() - dob.getFullYear();\n    const m = today.getMonth() - dob.getMonth();\n    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {\n      age--;\n    }\n  }\n  item.json.patient_age = age;\n  item.json.patient_gender = b.gender || '';\n  item.json.patient_diagnoses = b.diagnoses || '';\n  item.json.patient_presenting_problems = b.presenting_problems || '';\n  item.json.patient_pcp_conditions = b.pcp_conditions || '';\n  item.json.patient_pcp_medications = b.pcp_medications || '';\n  item.json.patient_psych_conditions = b.psych_conditions || '';\n  item.json.patient_psych_medications = b.psych_medications || '';\n  item.json.patient_address = b.address || '';\n  item.json.patient_phone = b.phone || '';\n  item.json.patient_insurance_company = b.insurance_company || '';\n  item.json.patient_emergency_contact_name = b.emergency_contact_name || '';\n  item.json.patient_psych_name = b.psych_name || '';\n  item.json.patient_pcp_name = b.pcp_name || '';\n  const sn = b.tcm_social_needs || {};\n  item.json.patient_target_date = sn.service_plan_target_date || b.service_plan_target_date || '';\n  item.json.patient_plan_date = sn.service_plan_date || b.service_plan_date || '';\n  item.json.raw_body_json = JSON.stringify(b);\n}\nreturn $input.all();"
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
      -368,
      -416
    ],
    "id": "code-normalize-payload-id",
    "name": "Code in JavaScript"
  },
  {
    "parameters": {
      "modelId": {
        "__rl": True,
        "value": "gpt-4o-mini",
        "mode": "list",
        "cachedResultName": "GPT-4o-mini"
      },
      "responses": {
        "values": [
          {
            "content": "=You are a Targeted Case Management (TCM) Documentation Clerk. IMPORTANT SAFETY DISCLAIMER: This task is purely administrative and refers to case management coordination referrals. It does NOT involve diagnosing, prescribing, treating, or providing medical/psychiatric advice or therapy. Document only administrative coordination activities.\n\nYour task is to generate the patient's TCM Service Plan details based on their assessment and demographics.\nThe patient's name is: {{ $json.patient_full_name }}\nThe patient's gender is: {{ $json.patient_gender }}\nThe patient's date of birth is: {{ $json.patient_dob }}\nThe patient's age is: {{ $json.patient_age }} years old.\n\nYou MUST analyze the patient details and Social Needs details (contains active domain flags and sub-block options).\n\nFor each active domain or sub-block, you must generate these exact fields:\n- service_plan_date_[key] (e.g. 08/10/2026)\n- service_plan_description_[key] (clinical description of the service and why it is required for the client, personalized based on patient details)\n- service_plan_needs_[key] (clinical deficits or identified barriers for the client, personalized based on patient details)\n- service_plan_goal_[key] (derived from standard goal template below)\n- service_plan_obj1_[key] (derived from standard obj1 template below)\n- service_plan_obj1_date_[key] (target date for first objective, e.g. 08/10/2026)\n- service_plan_obj2_[key] (derived from standard obj2 template below)\n- service_plan_obj2_date_[key] (target date for second objective, e.g. 08/10/2026)\n- service_plan_obj3_[key] (derived from standard obj3 template below)\n- service_plan_obj3_date_[key] (target date for third objective, e.g. 08/10/2026)\n- service_plan_status_[key] (always set to 'New')\n\nReplace [key] with the corresponding active domain or sub-block keys:\n- domain_mental_health (if domain_mental_health is true)\n- domain_physical_health (if domain_physical_health is true)\n- domain_physical_health_otc (if medicaid_recipient is true)\n- domain_physical_health_alarm (if emergency_alarm_needed is true)\n- domain_housing (if domain_housing is true)\n- domain_financial (if domain_financial is true)\n- domain_basic_needs (if domain_basic_needs is true)\n- domain_daily_living (if domain_daily_living is true)\n- domain_recreational (if domain_recreational is true)\n- domain_transportation (if domain_transportation is true)\n- domain_transportation_sts (if sts_needed is true)\n- domain_transportation_dpp (if parking_permit_needed is true)\n\nAlso generate:\n- service_plan_discharge_criteria: Detailed clinical criteria for discharge (e.g. stability, compliance, completion of goals).\n- service_plan_client_agreement: Set to 'agreed'.\n\nCRITICAL REQUIREMENT: You MUST generate all 11 fields for EACH active domain and sub-block listed under 'Active domains and sub-blocks that MUST be generated' in the user message. Do NOT skip or omit any of them under any circumstances.\n\nCRITICAL RULE FOR GOALS AND OBJECTIVES: You MUST use the following standard templates as the baseline. Replace '[Client]' or 'Client' with the patient's name (\"{{ $json.patient_full_name }}\"), and replace slash-pronouns with correct gender pronouns ('he/his/him/himself' for males, 'she/her/herself' for females). Do NOT invent generic goals or objectives.\n\nSTANDARD TEMPLATES:\n1. domain_mental_health:\n   - Goal: \"I want to comply with my psychiatric treatment and appointments scheduled by my psychiatrist to avoid crisis and improve my mental condition.\" {{ $json.patient_full_name }} will receive psychiatric treatment to stabilize his/her mental condition and avoid hospitalizations.\n   - Obj1: {{ $json.patient_full_name }} will attend his/her psychiatrist's appointment as scheduled within the next six months to improve his/her level of functioning.\n   - Obj2: TCM will advocate on behalf of {{ $json.patient_full_name }} during psychiatrist appointments as needed and monitor clinic outcomes.\n   - Obj3: {{ $json.patient_full_name }}'s living environment, level of functioning, and compliance with medications will be monitored by the TCM.\n\n2. domain_physical_health:\n   - Goal: \"I don't feel able to control my physical symptoms if I don't comply with my PCP's appointments, medical treatment, and medical instructions.\" {{ $json.patient_full_name }} will receive medical treatment from his/her PCP and follow medical appointments to keep his/her medical conditions under control.\n   - Obj1: {{ $json.patient_full_name }} is committed to attending all of his/her scheduled primary care and specialist medical appointments.\n   - Obj2: {{ $json.patient_full_name }} will inform his/her PCP/specialist about any health progress and medication side effects.\n   - Obj3: TCM will monitor {{ $json.patient_full_name }}'s compliance with medical follow-up and treatment recommendations.\n\n3. domain_physical_health_otc:\n   - Goal: \"I want to obtain my OTC medicines every month.\" {{ $json.patient_full_name }} will be able to obtain his/her over-the-counter medications with the assistance of the Case Manager.\n   - Obj1: {{ $json.patient_full_name }} will be assisted by the TCM at the pharmacy in gathering information about his/her medication in the PCP office. TCM will visit the PCP office to obtain the application form on {{ $json.patient_full_name }}'s behalf.\n   - Obj2: {{ $json.patient_full_name }} will complete the OTC form with the TCM's assistance and will be able to submit his/her application form.\n   - Obj3: The TCM will monitor if {{ $json.patient_full_name }} receives his/her medication through the contact parties involved.\n\n4. domain_physical_health_alarm:\n   - Goal: {{ $json.patient_full_name }} stated, \"I want to have an emergency alarm system so I can feel safe at home.\" {{ $json.patient_full_name }} will obtain an Emergency Alarm System with the assistance of the Targeted Case Manager (TCM) to enhance safety, promote independence, and ensure quick access to emergency support.\n   - Obj1: {{ $json.patient_full_name }} will obtain information about emergency alarm systems and programs with the assistance of the TCM.\n   - Obj2: TCM will assist {{ $json.patient_full_name }} in completing and submitting the emergency alarm application forms.\n   - Obj3: TCM will coordinate linkage and monitor that the emergency alarm system is correctly installed and functioning.\n\n5. domain_recreational:\n   - Goal: \"I would like to participate in social and recreational activities to expand my support network and reduce isolation.\" {{ $json.patient_full_name }} will participate in social and recreational activities to expand his/her support network and reduce isolation.\n   - Obj1: {{ $json.patient_full_name }} will obtain information about libraries and senior community centers with the assistance of the TCM.\n   - Obj2: TCM will assist {{ $json.patient_full_name }} in obtaining membership applications and forms for community programs.\n   - Obj3: TCM will monitor {{ $json.patient_full_name }}'s social engagement and participation outcomes.\n\n6. domain_daily_living:\n   - Goal: \"I want to stay independent and make sure I don't lose my benefits or miss important appointments.\" {{ $json.patient_full_name }} will stay independent and make sure he/she doesn't lose his/her benefits or miss important appointments.\n   - Obj1: TCM will assist {{ $json.patient_full_name }} in completing and submitting utility, SNAP, or other community service applications.\n   - Obj2: TCM will provide monthly assistance reviewing provider correspondence, notifications, and letters.\n   - Obj3: TCM will coordinate referrals and linkage to additional community-based support services.\n\n7. domain_housing:\n   - Goal: \"I want to obtain a better and safe place to live according to my monthly income.\" {{ $json.patient_full_name }} will obtain a better and safe place to live according to his/her monthly income.\n   - Obj1: {{ $json.patient_full_name }} will obtain and fill out housing application forms for low-income housing programs.\n   - Obj2: TCM will link {{ $json.patient_full_name }} with housing programs and assist with gathering required documentation.\n   - Obj3: TCM will monitor the outcome of the housing application and update contact info as needed.\n\n8. domain_financial:\n   - Goal: \"I want to obtain assistance with utility bills and phone services to reduce my financial burden.\" {{ $json.patient_full_name }} will obtain assistance with utility bills and phone services to reduce his/her financial burden.\n   - Obj1: {{ $json.patient_full_name }} will obtain required documentation to complete LIHEAP utility assistance application.\n   - Obj2: {{ $json.patient_full_name }} will apply for and activate a lifeline cell phone to maintain communication with providers.\n   - Obj3: TCM will monitor application outcomes and coordinate with assistance offices.\n\n9. domain_basic_needs:\n   - Goal: \"I don't feel able to obtain the food, cleaning supplies, clothes, furniture, appliances, and personal care items that I need by myself.\" {{ $json.patient_full_name }} will obtain food donations, hot meals, and personal care items to cover some of his/her basic needs.\n   - Obj1: {{ $json.patient_full_name }} will receive assistance accessing food resources and pantry programs in the community.\n   - Obj2: TCM will link {{ $json.patient_full_name }} with food banks, churches, and charitable donation resources.\n   - Obj3: TCM will monitor {{ $json.patient_full_name }}'s food security and basic needs status.\n\n10. domain_transportation:\n    - Goal: \"I want reliable transportation so I can get to my medical appointments and take care of my needs.\" {{ $json.patient_full_name }} will obtain reliable transportation so he/she can get to his/her medical appointments and take care of his/her needs.\n    - Obj1: {{ $json.patient_full_name }} will be linked to community-based transportation services such as Freebee or SafeRide.\n    - Obj2: TCM will assist {{ $json.patient_full_name }} with account setup, registration, and scheduling procedures.\n    - Obj3: TCM will monitor transit access and resolve any transportation barriers.\n\n11. domain_transportation_sts:\n    - Goal: \"I want to obtain door-to-door paratransit mobility via Special Transportation Services (STS).\" {{ $json.patient_full_name }} will obtain Special Transportation Services (STS) to facilitate door-to-door paratransit mobility.\n    - Obj1: TCM will assist {{ $json.patient_full_name }} in obtaining, completing, and submitting the STS application form.\n    - Obj2: TCM will schedule required doctor verification appointment and coordinate transportation for the evaluation.\n    - Obj3: TCM will monitor STS application status and assist with scheduling rides once approved.\n\n12. domain_transportation_dpp:\n    - Goal: \"I aspire to obtain my parking permit for people with disabilities.\" {{ $json.patient_full_name }} will obtain a Handicap Parking Permit to facilitate accessible parking access.\n    - Obj1: TCM will assist {{ $json.patient_full_name }} in obtaining the disabled parking permit application form.\n    - Obj2: TCM will coordinate with PCP to complete the medical certification section of the DPP form.\n    - Obj3: TCM will submit the completed DPP application to the DMV and monitor permit delivery.\n\nCRITICAL KEY NAMING RULE: You MUST preserve the 'domain_' prefix in all generated keys. Do NOT strip it. For example, use 'service_plan_date_domain_mental_health', NOT 'service_plan_date_mental_health'. Use 'service_plan_description_domain_physical_health_otc', NOT 'service_plan_description_physical_health_otc'.\n\nIMPORTANT: Write in the third person, use professional clinical vocabulary, and customize all narratives to the patient's diagnoses and demographics. Do not write generic text. Use the patient's age ({{ $json.patient_age }} years old) in any narrative that mentions the patient's age. Do not calculate or guess any other age.\n\nCRITICAL: Return ONLY a valid JSON object. You are strictly prohibited from adding any comment lines, comment blocks, or slashes (like '//' or '/*') inside the JSON. Do not include markdown blocks. Output raw JSON text."
          }
        ]
      },
      "messages": {
        "messageValues": [
          {
            "type": "user",
            "message": "=Patient: {{ $json.patient_full_name }}\nPatient DOB: {{ $json.patient_dob }}\nPatient Gender: {{ $json.patient_gender }}\nPatient diagnoses details: {{ $json.patient_diagnoses }}\nPatient chief complaint: {{ $json.patient_presenting_problems }}\nMedical history: {{ $json.patient_pcp_conditions }}\nMedications: {{ $json.patient_pcp_medications }}\nPsychiatrist Name: {{ $json.patient_psych_name }}\nPsych Medications: {{ $json.patient_psych_medications }}\nActive domains and sub-blocks that MUST be generated:\n{{\n  (() => {\n    const active = [];\n    const b = JSON.parse($json.raw_body_json || '{}').tcm_social_needs || {};\n    if (b.domain_mental_health) active.push(\"domain_mental_health\");\n    if (b.domain_physical_health) active.push(\"domain_physical_health\");\n    if (b.medicaid_recipient === true || b.medicaid_recipient === \"Yes\") active.push(\"domain_physical_health_otc\");\n    if (b.emergency_alarm_needed === true || b.emergency_alarm_needed === \"Yes\") active.push(\"domain_physical_health_alarm\");\n    if (b.domain_housing) active.push(\"domain_housing\");\n    if (b.domain_financial) active.push(\"domain_financial\");\n    if (b.domain_basic_needs) active.push(\"domain_basic_needs\");\n    if (b.domain_daily_living) active.push(\"domain_daily_living\");\n    if (b.domain_recreational) active.push(\"domain_recreational\");\n    if (b.domain_transportation) active.push(\"domain_transportation\");\n    if (b.sts_needed === true || b.sts_needed === \"Yes\") active.push(\"domain_transportation_sts\");\n    if (b.parking_permit_needed === true || b.parking_permit_needed === \"Yes\") active.push(\"domain_transportation_dpp\");\n    return active.map(k => \"- \" + k).join(\"\\n\");\n  })()\n}}"
          }
        ]
      }
    },
    "type": "@n8n/n8n-nodes-langchain.openAi",
    "typeVersion": 2,
    "position": [
      480,
      -416
    ],
    "id": "message-a-model-id",
    "name": "Message a model",
    "credentials": {
      "openAiApi": {
        "id": "rs5I2HRPkABGxSc5",
        "name": "OpenAi account"
      }
    }
  },
  {
    "parameters": {
      "jsCode": "function extractJsonString(raw) {\n  if (raw == null) return null;\n  let s = String(raw).trim();\n  s = s.replace(/^```(?:json)?\\s*/i, \"\").replace(/\\s*```$/i, \"\").trim();\n  const firstBrace = s.indexOf(\"{\");\n  const lastBrace = s.lastIndexOf(\"}\");\n  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {\n    return s.slice(firstBrace, lastBrace + 1).trim();\n  }\n  return null;\n}\n\nlet patientName = \"Client\";\nlet pronHeShe = \"he/she\";\nlet pronHisHer = \"his/her\";\nlet pronHimHer = \"him/her\";\nlet pronHimselfHerself = \"himself/herself\";\nlet targetDate = \"\";\nlet planDate = \"\";\nlet intakeDate = \"\";\nlet recordsDate = \"\";\nlet assessmentDate = \"\";\nlet certDate = \"\";\n\ntry {\n  const inputJson = $('Code in JavaScript').item.json;\n  patientName = inputJson.patient_full_name || inputJson.full_name || \"Client\";\n  const gender = (inputJson.patient_gender || inputJson.gender || \"male\").toLowerCase();\n  pronHeShe = gender === \"female\" ? \"she\" : \"he\";\n  pronHisHer = gender === \"female\" ? \"her\" : \"his\";\n  pronHimHer = gender === \"female\" ? \"her\" : \"him\";\n  pronHimselfHerself = gender === \"female\" ? \"herself\" : \"himself\";\n  targetDate = inputJson.patient_target_date || \"\";\n  planDate = inputJson.patient_plan_date || \"\";\n  const rawBody = JSON.parse(inputJson.raw_body_json || '{}');\n  const sn = rawBody.tcm_social_needs || {};\n  intakeDate = sn.service_plan_intake_date || rawBody.service_plan_intake_date || \"\";\n  recordsDate = sn.service_plan_records_date || rawBody.service_plan_records_date || \"\";\n  assessmentDate = sn.service_plan_assessment_date || rawBody.service_plan_assessment_date || \"\";\n  certDate = sn.service_plan_certification_date || rawBody.service_plan_certification_date || \"\";\n} catch (e) {}\n\nconst today = new Date();\nconst formatAsMDY = (dateObj) => {\n  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');\n  const dd = String(dateObj.getDate()).padStart(2, '0');\n  const yyyy = dateObj.getFullYear();\n  return `${mm}/${dd}/${yyyy}`;\n};\n\nconst todayStr = planDate || formatAsMDY(today);\nconst targetDateStr = targetDate || (() => {\n  const future = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());\n  return formatAsMDY(future);\n})();\n\nfunction replacePronouns(val) {\n  if (typeof val !== \"string\") return val;\n  let res = val;\n  res = res.replace(/\\[Client\\]/g, patientName);\n  res = res.replace(/\\bClient\\b/g, patientName);\n  res = res.replace(/\\bclient\\b/g, patientName);\n  res = res.replace(/\\bhe\\/she\\b/gi, pronHeShe);\n  res = res.replace(/\\bhis\\/her\\b/gi, pronHisHer);\n  res = res.replace(/\\bhim\\/her\\b/gi, pronHimHer);\n  res = res.replace(/\\bhimself\\/herself\\b/gi, pronHimselfHerself);\n  return res;\n}\n\nreturn items.map((item) => {\n  const text = item.json?.output?.[0]?.content?.[0]?.text ?? item.json?.output?.[0]?.content?.find?.(c => c?.type === 'output_text')?.text ?? item.json?.content ?? item.json?.message?.content ?? item.json?.text;\n  try {\n    const rawObj = JSON.parse(extractJsonString(text));\n    const note = {\n      service_plan_intake_date: intakeDate,\n      service_plan_records_date: recordsDate,\n      service_plan_assessment_date: assessmentDate,\n      service_plan_certification_date: certDate\n    };\n    for (const key in rawObj) {\n      let val = rawObj[key];\n      if (typeof val === \"string\") {\n        val = replacePronouns(val);\n      }\n      if (key.startsWith('service_plan_date_domain_')) {\n        note[key] = todayStr;\n      } else if (key.startsWith('service_plan_obj') && key.includes('_date_')) {\n        note[key] = targetDateStr;\n      } else {\n        note[key] = val;\n      }\n    }\n    return {\n      json: {\n        ok: true,\n        ...note\n      }\n    };\n  } catch (e) {\n    return {\n      json: {\n        ok: false,\n        error: e.message,\n        raw_preview: text\n      }\n    };\n  }\n});"
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
      800,
      -416
    ],
    "id": "code-parse-json-id",
    "name": "Code in JavaScript3"
  }
]

# Define connections
connections = {
  "Webhook": {
    "main": [
      [
        {
          "node": "Code in JavaScript",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Code in JavaScript": {
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
          "node": "Code in JavaScript3",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Code in JavaScript3": {
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
}

nodes_str = json.dumps(nodes)
connections_str = json.dumps(connections)
settings_str = json.dumps({"executionOrder": "v1"})
meta_str = json.dumps({"templateCredsSetupCompleted": True})

db = sqlite3.connect(db_path)
cursor = db.cursor()

# Get parentFolderId, triggerCount
cursor.execute("SELECT parentFolderId, triggerCount FROM workflow_entity LIMIT 1")
row = cursor.fetchone()
parent_folder_id = row[0] if row else None
trigger_count = row[1] if row else 0

# Check if exists
cursor.execute("SELECT 1 FROM workflow_entity WHERE id = ?", (wf_id,))
exists = cursor.fetchone()

if exists:
    print(f"Workflow {wf_id} already exists. Updating...")
    cursor.execute("""
        UPDATE workflow_entity
        SET name = ?, nodes = ?, connections = ?, settings = ?, meta = ?, updatedAt = ?, versionId = ?
        WHERE id = ?
    """, (name, nodes_str, connections_str, settings_str, meta_str, now, str(uuid.uuid4()), wf_id))
else:
    print(f"Creating new workflow {wf_id}...")
    cursor.execute("""
        INSERT INTO workflow_entity (
            id, name, active, nodes, connections, settings, staticData, pinData,
            versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
            isArchived, versionCounter, description, activeVersionId
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 0, 1, '', NULL)
    """, (
        wf_id, name, active, nodes_str, connections_str, settings_str,
        str(uuid.uuid4()), trigger_count, meta_str, parent_folder_id, now, now
    ))

# Register webhook path
cursor.execute("""
    INSERT OR REPLACE INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength)
    VALUES (?, ?, ?, ?, ?, ?)
""", (wf_id, 'autofill-service-plan', 'POST', 'Webhook', '6b8b4567-e89b-12d3-a456-426614174000', None))

# Register shared workflow
cursor.execute("""
    INSERT OR REPLACE INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
""", (wf_id, 'I0peieOmzRZFMir9', 'workflow:owner', now, now))

db.commit()
db.close()
print("Workflow AUTOFILL SERVICE PLAN WITH AI deployed successfully in n8n!")
