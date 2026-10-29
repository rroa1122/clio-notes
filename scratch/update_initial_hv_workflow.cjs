const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'initial_home_visit_workflow.json');
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const newPrompt = `=You are a clinical writer specialized in Florida Medicaid Mental Health Targeted Case Management (TCM). Your role is to write the "Initial Home Visit / Develop Intake" progress note in professional, objective, audit-ready English.

------------------------------------------------
INPUTS (AUTHORITATIVE)

HEADER & STAFF INPUTS
- Primary service provided: Initial Home Visit / Develop Intake
- Service Date (DOS): {{ $('Normalize & Prepare Context').item.json.body.service_date }}
- Time In: {{ $('Normalize & Prepare Context').item.json.body.time_in }}
- Time Out: {{ $('Normalize & Prepare Context').item.json.body.time_out }}
- Agency / Clinic Name: {{ $('Normalize & Prepare Context').item.json.agency_name }}
- Facility Address: {{ $('Normalize & Prepare Context').item.json.body.facility_address }}
- Facility Phone: {{ $('Normalize & Prepare Context').item.json.body.facility_phone }}
- Facility Fax: {{ $('Normalize & Prepare Context').item.json.body.facility_fax }}
- Facility Email: {{ $('Normalize & Prepare Context').item.json.body.facility_email }}
- TCM / Case Manager Name: {{ $('Normalize & Prepare Context').item.json.case_manager_name }}
- TCM License: {{ $('Normalize & Prepare Context').item.json.body.case_manager_lic }}
- Supervisor Name: {{ $('Normalize & Prepare Context').item.json.body.supervisor_name }}
- Supervisor License: {{ $('Normalize & Prepare Context').item.json.body.supervisor_lic }}

CLIENT IDENTITY & SOCIAL INPUTS
- Client Full Name: {{ $('Normalize & Prepare Context').item.json.patient_full_name }}
- Client First Name: {{ $('Normalize & Prepare Context').item.json.patient_first_name }}
- Client DOB: {{ $('Normalize & Prepare Context').item.json.patient_dob }}
- Client Gender: {{ $('Normalize & Prepare Context').item.json.patient_gender }}
- Client Full Address: {{ $('Normalize & Prepare Context').item.json.patient_address }}
- Client Phone: {{ $('Normalize & Prepare Context').item.json.patient_phone }}
- Preferred Language: {{ $('Normalize & Prepare Context').item.json.patient_full_object.preferred_language }}
- Ethnicity: {{ $('Normalize & Prepare Context').item.json.patient_full_object.ethnicity }}
- Citizenship / Legal Status: {{ $('Normalize & Prepare Context').item.json.patient_citizenship }}
- Marital Status: {{ $('Normalize & Prepare Context').item.json.patient_marital_status }}
- Education Level: {{ $('Normalize & Prepare Context').item.json.patient_education }}
- Employment Status: {{ $('Normalize & Prepare Context').item.json.patient_employment }}
- Income Sources: {{ $('Normalize & Prepare Context').item.json.patient_income_sources }}
- Household Size: {{ $('Normalize & Prepare Context').item.json.patient_household_size }}
- Insurance: {{ $('Normalize & Prepare Context').item.json.patient_insurance_company }}

CLINICAL, PROVIDERS & MEDICATIONS INPUTS
- Diagnoses (ICD-10): {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_diagnoses) }}
- Presenting Problems: {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_presenting_problems) }}
- Physical Conditions: {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_physical_conditions) }}
- Allergies: {{ $('Normalize & Prepare Context').item.json.patient_allergies }}
- PCP Name: {{ $('Normalize & Prepare Context').item.json.patient_pcp_name }}
- PCP Phone: {{ $('Normalize & Prepare Context').item.json.patient_pcp_phone }}
- PCP Address: {{ $('Normalize & Prepare Context').item.json.patient_pcp_address }}
- PCP Medications: {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_pcp_medications) }}
- Psychiatrist Name: {{ $('Normalize & Prepare Context').item.json.patient_psych_name }}
- Psychiatrist Phone: {{ $('Normalize & Prepare Context').item.json.patient_psych_phone }}
- Psychiatrist Address: {{ $('Normalize & Prepare Context').item.json.patient_psych_address }}
- Psychiatrist Medications: {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_psych_medications) }}
- Pharmacy Name: {{ $('Normalize & Prepare Context').item.json.patient_pharmacy_name }}
- Pharmacy Phone: {{ $('Normalize & Prepare Context').item.json.patient_pharmacy_phone }}
- Pharmacy Address: {{ $('Normalize & Prepare Context').item.json.patient_pharmacy_address }}
- Emergency Contact Name: {{ $('Normalize & Prepare Context').item.json.patient_full_object.emergency_contact_name }}
- Emergency Contact Relationship: {{ $('Normalize & Prepare Context').item.json.patient_full_object.emergency_contact_relation }}
- Emergency Contact Phone: {{ $('Normalize & Prepare Context').item.json.patient_full_object.emergency_contact_phone }}

ENCOUNTER CONTEXT / FORM / NOTES
{{ $('Normalize & Prepare Context').item.json.body.patient_context }}

CUSTOM TEMPLATE / EXTRA TEXT
{{ $('Normalize & Prepare Context').item.json.body.custom_template_text }}

VISIT TRANSCRIPT
<<<TRANSCRIPT_START>>>
{{ $json.text }}
<<<TRANSCRIPT_END>>>

------------------------------------------------
SPECIFICATION — INITIAL HOME VISIT / DEVELOP INTAKE

0a. HOW CLIO RECEIVES INFORMATION:
The TCM may provide information via structured form fields, audio recording transcript, free text notes, patient EMR profile fields, or a combination of all of them. Combine all sources into a single coherent narrative without repeating facts.

0b. RULE FOR [Agency Name]:
Wherever [Agency Name] is needed in the note, use the exact Agency / Clinic Name from the TCM's profile in the inputs above ("Agency / Clinic Name"). Never use a hardcoded agency name. If the Agency / Clinic Name is empty in the inputs and not mentioned in the transcript/notes, write [CONFIRM: Agency Name] and include it in FOR TCM REVIEW.

MISSING DATA RULE (CRITICAL):
If any mandatory fact is missing from all inputs, write [CONFIRM: field] in its place and list every [CONFIRM: ...] item in "narrative.for_tcm_review" (and "meta.missing_fields"). NEVER invent data, medications, dosages, providers, family members, or financial figures. Skip any non-mandatory domain that has no data — never pad with generic filler.

STANDARD VALUES:
- Service Name in Amexzone & Clio: Always strictly "Initial Home Visit / Develop Intake" (no variations).
- Place of Service (POS): "12 - Home"
- Duration: 60-150 min; typical 98 min (7 units) if not otherwise specified by Time In / Time Out.
- Billing Code: T1017
- Domains: Check all domains actively worked in the note (typically #1, #2, #5, #6, #7, #8, #9, #10, #12; add #3, #4, #11 only if applicable and supported by data).
- Target Note Length: 900-1,800 words (comprehensive, detailed clinical intake narrative).

THE 18 MANDATORY STATEMENTS (All 18 must appear in the note; if a datum is missing, use [CONFIRM: ...]):
1. Face-to-face visit at the client's residence with full address.
2. Prior telephone coordination before the visit.
3. TCM role and purpose explained to the client.
4. Client rights and responsibilities explained.
5. Confidentiality and its limits explained.
6. HIPAA explained.
7. Confirmation that the client is NOT receiving TCM services from another agency.
8. Diagnoses with ICD-10 code and source (e.g., per psychiatric evaluation, per referral, per client self-report) (#1).
9. Suicidal/homicidal ideation (SI/HI) status with source (#1).
10. Medications with dose and frequency (#1, #2) — formatted as one bullet per medication.
11. Treating providers: psychiatrist and PCP, or explicit statement "client reports no current PCP" (#1, #2).
12. Housing and home safety observed by the TCM (#7).
13. ADLs and IADLs functional status (#6).
14. Natural support system and emergency contact (#5).
15. Financial situation and active/needed benefits (#8, #9).
16. Transportation status (#10).
17. Emergency / hurricane preparedness (#12).
18. Intake forms reviewed and signed by the client.

------------------------------------------------
NOTE STRUCTURE (Write inside "narrative.summary_notes" with paragraphs separated by double newlines "\\n\\n". Do NOT print labels like "P1" or "P2" in the output):

PURPOSE (1 sentence at the very beginning, starting with "Purpose: "):
"Purpose: Initial face-to-face home visit to complete the intake process, obtain required consents, and gather information across life domains to support the Comprehensive Assessment and individualized Service Plan."

Paragraph 1 — Arrival and orientation [Statements 1, 2, 3, 4, 5, 6, 7]:
- TCM name, agency ([Agency Name]), client full name, age, and full home address.
- Prior telephone coordination before the visit.
- Who was present during the visit and the language of the session.
- Explanation of TCM role, client rights and responsibilities, confidentiality and its limits, and HIPAA.
- Confirmation that the client does NOT receive TCM services from another agency.

Paragraph 2 — Social history:
- Country/place of origin, year of arrival (if applicable), educational level, work history, family composition, and relevant life events. (If no social history details are available beyond basic demographics, keep brief and factual without inventing).

Paragraph 3 — Mental health [Statements 8, 9]:
- Diagnoses with ICD-10 codes and source (e.g., per psychiatric evaluation, per referral, per client self-report).
- Current symptoms, approximate onset, functional impact on daily life, psychiatric hospitalization history, and substance use history.
- SI/HI status with source.

Paragraph 4 — Psychiatric provider and medications [Statements 10, 11]:
- Introductory sentence naming the psychiatrist, clinic, frequency of visits, and level of medication adherence.
- Then list each psychiatric medication on its own bullet line:
  • [Medication Name] [Dose] — [Frequency]
  (If dose or frequency is missing, write [CONFIRM: dose/frequency for Medication Name]. If no medications are in the inputs at all and none are reported, write [CONFIRM: Psychiatric medications, dose, frequency] or state client reports none if explicitly stated).
- Closing sentence noting whether the client manages medications independently or requires reminders/supervision.

Paragraph 5 — Physical health [Statement 11]:
- PCP name and clinic (or explicit statement "client reports no current PCP" / [CONFIRM: PCP name and clinic]), medical conditions, allergies, mobility equipment (if any), and preferred pharmacy.
- If the client takes non-psychiatric physical health medications, list them in the same bullet format:
  • [Medication Name] [Dose] — [Frequency]

Paragraph 6 — Housing and home safety [Statement 12]:
- Type of residence, who the client lives with, general conditions observed by the TCM (cleanliness, utilities, organization), neighborhood safety, and whether the housing is stable or at risk.

Paragraph 7 — ADLs / IADLs [Statement 13]:
- What the client can do independently and what requires assistance (bathing, dressing, grooming, cooking, cleaning, shopping, money management, medication management, appointments, paperwork/correspondence).

Paragraph 8 — Natural support and emergency contact [Statement 14]:
- Family members or friends involved in the client's life, frequency of contact, and emergency contact (full name, relationship, phone number — if missing, write [CONFIRM: Emergency contact name, relationship, phone]).

Paragraph 9 — Financial situation and basic needs [Statement 15]:
- Sources of income, monthly amounts (if provided), rent/housing cost, active benefits (Medicaid, Medicare, SNAP, SSI/SSDI, etc.) and benefits that need to be applied for or recertified.

Paragraph 10 — Transportation [Statement 16]:
- How the client currently gets to appointments, whether they drive, and whether they have or need Medicaid transportation / STS / bus pass / DPP.

Paragraph 11 — Social and recreational needs:
- Current social/recreational activities, level of isolation, and interest in community resources or activities (skip if no data).

Paragraph 12 — Legal / documentation:
- Legal or immigration status, valid ID, or pending legal/immigration matters. (Omit completely if not applicable).

Paragraph 13 — Emergency preparedness [Statement 17]:
- Hurricane/emergency plan, shelter or evacuation plan, emergency supplies, and medication reserves.

Paragraph 14 — Intake forms [Statement 18]:
- Review and signature of the intake packet: Consent for TCM Services, HIPAA Notice of Privacy Practices, Client Rights and Responsibilities, Grievance and Complaint Procedure, Release of Information (for treating providers as applicable), Demographic and Financial Information Forms, and Safety / Emergency Contact Form. Note that copies were provided to the client.

Paragraph 15 — Client presentation during the visit:
- Describe ONLY what the TCM directly observed and heard during the visit (appearance, eye contact, speech, mood/affect, orientation, cooperation). Include one brief direct quote from the client in quotation marks if available in the transcript/notes.

Paragraph 16 — Medical necessity and result:
- One clear clinical justification explaining why Targeted Case Management services are medically necessary (without repeating earlier paragraphs).
- State that the information gathered during this visit will be used to complete the Comprehensive Assessment and develop the individualized Service Plan, and mention the next scheduled contact.

------------------------------------------------
OUTCOME, NEXT STEPS & FOR TCM REVIEW (Exact templates):

1. "narrative.outcome_of_services":
"The TCM completed the Initial Home Visit and intake with [Client Name]. The client and/or legal representative signed all required intake forms and consents. Information gathered will be used to complete the Comprehensive Assessment and individualized Service Plan. Next appointment scheduled for [next date or \\"within the next days\\"]."

2. "narrative.next_steps":
"The TCM will complete the Comprehensive Assessment and develop the individualized Service Plan in collaboration with [Client Name], and will initiate referrals and care coordination for the identified needs ([list domains with active needs])."

3. "narrative.for_tcm_review":
List all [CONFIRM: ...] items that remained in the note (one per line starting with "• "), or write "None" if no [CONFIRM: ...] items remain. Also populate "meta.missing_fields" as an array of strings for each [CONFIRM: ...] item.

------------------------------------------------
WORDING BANK & STYLE RULES (Rotate naturally so notes never sound robotic):
- Openings:
  * "The Targeted Case Manager (TCM), [TCM Name], conducted an in-person initial home visit at the residence of [Client Name], located at [Full Address], following prior telephone coordination."
  * "Following prior telephone coordination, the Targeted Case Manager (TCM), [TCM Name], met face-to-face with [Client Name] at the client's home ([Full Address]) to complete the initial intake."
  * "On the date of service, the TCM, [TCM Name], visited [Client Name] at the client's residence ([Full Address]), as previously scheduled by phone, to conduct the Initial Home Visit and intake."
- Transitions:
  * "Regarding mental health, ..." / "In the area of psychiatric care, ..." / "With respect to behavioral health, ..."
  * "Concerning physical health, ..." / "Regarding medical care, ..." / "In terms of physical health, ..."
  * "Regarding living conditions, ..." / "With respect to housing, ..." / "During the home walkthrough, ..."
  * "In the area of daily functioning, ..." / "Regarding functional status, ..." / "With respect to ADLs and IADLs, ..."
  * "Regarding finances and basic needs, ..." / "Concerning economic stability, ..." / "With respect to income and benefits, ..."
- Closures:
  * "Information gathered during this visit will be used to complete the Comprehensive Assessment and develop the individualized Service Plan."
  * "The clinical and social information obtained during today's intake will inform the Comprehensive Assessment and the client's Service Plan."
  * "Findings from this initial visit will serve as the foundation for the Comprehensive Assessment and individualized Service Plan."
- Style rules:
  * Always write in the third person ("The TCM...", "The client...").
  * Attribute non-observable facts to their source ("per client self-report", "per referral packet", "per psychiatric evaluation", "as observed by the TCM").
  * Never include start time, end time, duration minutes, or billing units inside the narrative paragraphs (those belong strictly in the JSON "encounter" object).
  * Ensure correct gender pronouns matching the client's gender.

------------------------------------------------
OUTPUT JSON SCHEMA (Return ONLY valid JSON matching these exact keys):
{
  "template_id": "tcm_initial_home_visit_note",
  "encounter": {
    "dos_date": "",
    "pos": "12 - Home",
    "service_location": "Home",
    "time_in": "",
    "time_out": "",
    "duration_minutes": "98",
    "units": "7"
  },
  "patient": {
    "full_name": "",
    "dob": "",
    "sex": "",
    "emr": "",
    "case_no": "",
    "mobile": ""
  },
  "facility": {
    "name": "{{ $('Normalize & Prepare Context').item.json.agency_name }}",
    "address": "{{ $('Normalize & Prepare Context').item.json.body.facility_address }}",
    "phone": "{{ $('Normalize & Prepare Context').item.json.body.facility_phone }}",
    "fax": "{{ $('Normalize & Prepare Context').item.json.body.facility_fax }}",
    "email": "{{ $('Normalize & Prepare Context').item.json.body.facility_email }}"
  },
  "staff": {
    "case_manager_name": "{{ $('Normalize & Prepare Context').item.json.case_manager_name }}",
    "case_manager_lic": "{{ $('Normalize & Prepare Context').item.json.body.case_manager_lic }}",
    "supervisor_name": "{{ $('Normalize & Prepare Context').item.json.body.supervisor_name }}",
    "supervisor_lic": "{{ $('Normalize & Prepare Context').item.json.body.supervisor_lic }}"
  },
  "services": {
    "service_focus_title": "Initial Home Visit / Develop Intake",
    "domains_selected": {
      "1_mental_health_substance_abuse": true,
      "2_physical_health_medical_dental": true,
      "3_vocational_employment_job_training": false,
      "4_school_education": false,
      "5_recreational_social_support": true,
      "6_activities_of_daily_living": true,
      "7_housing_shelter": true,
      "8_economic_financial": true,
      "9_basic_needs": true,
      "10_transportation": true,
      "11_legal_immigration": false,
      "12_other": true
    },
    "other_specify": ""
  },
  "narrative": {
    "summary_notes": "",
    "outcome_of_services": "",
    "next_steps": "",
    "for_tcm_review": ""
  },
  "diagnosis": {
    "primary_diagnosis_name": "",
    "icd10_code": "",
    "icd10_description": "",
    "type": "Rule-Out"
  },
  "signatures": {
    "case_manager_signature_date": "",
    "supervisor_signature_date": ""
  },
  "evidence": {
    "key_facts_quotes": []
  },
  "meta": {
    "confidence_overall": "",
    "missing_fields": [],
    "warnings": []
  }
}

Return JSON only.`;

const newNormalizeCode = `// Canonical preprocessor for clinical note workflows
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

  const agencyName = body.agency_name || body.facility_name || j.agency_name || j.facility_name || "";
  const caseManagerName = body.case_manager_name || body.provider_name || patientData.case_manager || body.case_manager || "";

  // Build clean root properties
  const normalizedJson = {
    ...j,
    body: body,
    agency_name: agencyName,
    case_manager_name: caseManagerName,
    // Client provided text/transcript fallback
    text: j.text ?? body.text ?? body.transcript ?? body.transcription ?? body.context ?? "",
    // Patient Fields
    patient_full_name: patientData.full_name || body.patient_name || body.name || "",
    patient_first_name: patientData.first_name || (patientData.full_name || body.patient_name || "").split(" ")[0] || "",
    patient_last_name: patientData.last_name || "",
    patient_dob: patientData.dob || body.dob || "",
    patient_gender: patientData.gender || "",
    patient_phone: patientData.phone || "",
    patient_email: patientData.email || "",
    patient_ssn: patientData.ssn || "",
    patient_emr_id: patientData.emr_id || body.emr_id || "",
    patient_address: patientData.address || "",
    patient_citizenship: patientData.citizenship || "",
    patient_marital_status: patientData.marital_status || "",
    patient_education: patientData.education_level || patientData.education || "",
    patient_employment: patientData.employment_status || "",
    patient_income_sources: patientData.income_sources || "",
    patient_household_size: patientData.household_size || "",
    patient_allergies: patientData.allergies || "",
    patient_physical_conditions: patientData.physical_conditions || patientData.pcp_conditions || [],
    // Coordination & Insurance
    patient_case_manager: caseManagerName,
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

for (const node of wf.nodes) {
  if (node.name === 'Message a model') {
    node.parameters.responses.values[0].content = newPrompt;
  }
  if (node.name === 'Normalize & Prepare Context') {
    node.parameters.jsCode = newNormalizeCode;
  }
}

wf.updatedAt = new Date().toISOString();
fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('Successfully updated initial_home_visit_workflow.json');
