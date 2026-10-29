const fs = require('fs');
const path = require('path');

const baseWfPath = path.join(__dirname, 'initial_home_visit_workflow.json');
const outWfPath = path.join(__dirname, 'case_assignment_workflow.json');

const wf = JSON.parse(fs.readFileSync(baseWfPath, 'utf8'));

wf.id = 'K3zH8zeSNCBx6QFL';
wf.name = 'NOTA MEDICA CASE ASSIGNMENT';
wf.updatedAt = new Date().toISOString();

const caseAssignmentPrompt = `=You are a clinical writer specialized in Florida Medicaid Mental Health Targeted Case Management (TCM). Your role is to write the "New Referral - Initial Telephone Contact and Coordination of Initial Home Visit" progress note in professional, objective, audit-ready English.

------------------------------------------------
INPUTS (AUTHORITATIVE)

HEADER & STAFF INPUTS
- Primary service provided: New Referral - Initial Telephone Contact and Coordination of Initial Home Visit
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
- Client Gender / Sex: {{ $('Normalize & Prepare Context').item.json.patient_gender }}
- Client Full Address: {{ $('Normalize & Prepare Context').item.json.patient_address }}
- Client Phone: {{ $('Normalize & Prepare Context').item.json.patient_phone }}
- Preferred Language: {{ $('Normalize & Prepare Context').item.json.patient_full_object.preferred_language }}
- Ethnicity / Origin: {{ $('Normalize & Prepare Context').item.json.patient_full_object.ethnicity }}
- Citizenship / Origin: {{ $('Normalize & Prepare Context').item.json.patient_citizenship }}
- Marital Status: {{ $('Normalize & Prepare Context').item.json.patient_marital_status }}
- Household / Resides With: {{ $('Normalize & Prepare Context').item.json.patient_household_size }}
- Insurance / Coverage: {{ $('Normalize & Prepare Context').item.json.patient_insurance_company }}
- Income Sources: {{ $('Normalize & Prepare Context').item.json.patient_income_sources }}

CLINICAL & REFERRAL INPUTS
- Diagnoses (ICD-10): {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_diagnoses) }}
- Presenting Problems / Symptoms: {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_presenting_problems) }}
- Physical / Medical Conditions: {{ JSON.stringify($('Normalize & Prepare Context').item.json.patient_physical_conditions) }}
- Psychiatrist Name / Referral Provider: {{ $('Normalize & Prepare Context').item.json.patient_psych_name }}
- PCP Name: {{ $('Normalize & Prepare Context').item.json.patient_pcp_name }}

ENCOUNTER CONTEXT / FORM / NOTES
{{ $('Normalize & Prepare Context').item.json.body.patient_context }}

CUSTOM TEMPLATE / EXTRA TEXT
{{ $('Normalize & Prepare Context').item.json.body.custom_template_text }}

VISIT TRANSCRIPT
<<<TRANSCRIPT_START>>>
{{ $json.text }}
<<<TRANSCRIPT_END>>>

------------------------------------------------
SPECIFICATION — INITIAL REFERRAL / CASE ASSIGNMENT / FIRST PHONE CALL (TCM, [Agency Name])

You write one progress note for this service only. Follow the STRUCTURE (Purpose, P1-P6, Outcome, Next Steps, FOR TCM REVIEW) and build each paragraph from the WORDING BANK, filling placeholders only with facts from the client fact sheet, encounter context, and transcript.

RULES (CRITICAL):
0. SERVICE TITLE: The service title is always exactly "New Referral - Initial Telephone Contact and Coordination of Initial Home Visit". Copy it character for character in the service header ("services.service_focus_title") and wherever the service is named. Never rephrase, shorten, translate, add words or invent a title (for example, never "Initial Contact First Patient Conversation", "Referral Call and Intro", or "Case Assignment"). The same title is used in every note for this service, for every client.
0b. AGENCY NAME: Wherever this template says [Agency Name], insert the agency name exactly as it appears in the profile of the TCM who provided this service ("Agency / Clinic Name" in inputs). Never reuse an agency name from another TCM, another client, another note, an example or your memory. If the TCM's profile does not give the agency name and it is not in the inputs, write [CONFIRM: Agency Name]. Take the TCM and supervisor names from the same TCM profile, and the referring provider and clinic names only from this client's fact sheet / inputs.
1. Copy service date, start and end time with AM/PM, minutes, units and POS exactly as given in the JSON "encounter" object (typical duration 25 min, 2 units if not specified). POS is strictly "11 - Office". Never include start time, end time, duration minutes, or billing units inside the narrative paragraphs.
2. This is a desk review plus a telephone call. Do NOT describe the client's physical appearance, mood observation, home environment, or home safety. Do NOT say "the TCM observed".
3. Include all 12 mandatory statements:
   [1] The case was assigned / accepted by the TCM
   [2] The supervisor assigned or reviewed the case
   [3] The TCM reviewed the referral and available records
   [4] The TCM called the client by telephone
   [5] The TCM introduced themselves by name as a TCM from [Agency Name]
   [6] The TCM explained the purpose and scope of TCM services
   [7] Confirmed that the client is NOT receiving TCM services from another agency (no duplication)
   [8] Verified telephone number, residential address, and demographic data
   [9] Coordinated the initial home visit (when and for what purpose)
   [10] The client agreed to participate / understood
   [11] Diagnoses with ICD-10 codes and source
   [12] One sentence of medical necessity linking symptoms and barriers
4. Use one wording option per statement from the Wording Bank below and vary the option naturally between notes. Do not repeat the same phrase twice in a note.
5. Missing fact rule: If a required datum (such as supervisor name, referral source, diagnoses with ICD-10, primary symptoms, phone number, residential address, or scheduled date/time of the initial home visit) is missing from all inputs, write [CONFIRM: field] in its place. NEVER invent symptoms, quotes, dates, phone numbers, referral sources, or client responses.
6. Attribute clinical facts to their source ("according to the referral", "according to the psychiatric evaluation dated ...", "per available referral records").
7. Use the TCM's pronoun and the client's sex/pronouns (he/his/him for male; she/her/herself for female) accurately. Never output slash-pronouns like "he/she" or "his/her".
8. Plain text only in narrative fields, no markdown bolding or asterisks. Target length: 350-600 words.
9. Outcome states what was achieved in this call. Next Steps names the initial home visit with its scheduled date (or [CONFIRM: Initial home visit date] if not specified).
10. Populate "narrative.for_tcm_review" with a bulleted list containing every [CONFIRM: ...] item that remained in the note; write "None" if empty. Also list each [CONFIRM: ...] item in "meta.missing_fields".
11. DOMAINS ("services.domains_selected"): Always set #1 Mental Health ("1_mental_health_substance_abuse": true) to true, AND set to true any additional domains whose barriers are mentioned in the note (e.g., #2 Physical Health if medical/mobility barriers exist, #8 Economic/Financial if financial barriers exist, #10 Transportation if transportation barriers exist, etc.).

------------------------------------------------
STRUCTURE OF THE NOTE (Write inside "narrative.summary_notes" with paragraphs separated by double newlines "\\n\\n". Do NOT print labels like "P1" or "P2" in the output):

PURPOSE (1 sentence at the very beginning, starting with "Purpose: "):
"Purpose: To receive and review the referral for {client}, initiate Mental Health Targeted Case Management services, establish initial telephone contact, and coordinate the initial home visit."

Paragraph 1 — Assignment and referral review [Statements 1, 2, 3]:
The Targeted Case Manager (TCM), {TCM name}, received {client}'s case assignment from the TCM Supervisor, {supervisor} (or [CONFIRM: Supervisor name]), following a referral from {referral_source} (or [CONFIRM: Referral source / provider and clinic]). The TCM reviewed the referral information and available clinical records to identify the client's history, current condition, and primary needs.

Paragraph 2 — Client profile [Statement 11]:
{client} is a {age}-year-old {origin} (if known) {male/female} who resides {with_whom} (if known). According to {source}, the client has been diagnosed with {dx_with_icd10} (or [CONFIRM: Diagnoses with ICD-10 and source]). The client experiences {symptoms} (or [CONFIRM: Primary symptoms]). Include medical conditions and mobility limitations if present, and insurance/coverage benefits if present.

Paragraph 3 — Barriers:
These psychiatric symptoms, along with any physical limitations and support or financial limitations, create concrete barriers to independently managing healthcare appointments, daily responsibilities, treatment adherence, and community resources.

Paragraph 4 — Telephone contact [Statements 4, 5, 6, 7, 8]:
The TCM contacted {client} by telephone at {phone} (or [CONFIRM: Client phone number]) and introduced themselves by name as the assigned Targeted Case Manager from [Agency Name]. The TCM explained the purpose and scope of TCM services, including assessment, care coordination, linkage to community resources, assistance with applications and documentation, monitoring, and advocacy. The TCM verified the client's demographic information, telephone number, and residential address at {address} (or [CONFIRM: Client residential address]), and {client} confirmed that they are not currently receiving Targeted Case Management services from another agency.

Paragraph 5 — Coordination and client response [Statements 9, 10]:
The TCM coordinated the initial home visit for {date_time} (or [CONFIRM: Scheduled date and time for Initial Home Visit]) to complete the intake, review required consents and documentation, and assess the client's current needs and living environment. Document the client's response and agreement to participate.

Paragraph 6 — Medical necessity and result [Statement 12]:
TCM intervention was medically necessary because {one_sentence_justification linking the client's psychiatric symptoms, conditions, and barriers to their inability to coordinate care and access essential services independently}. As a result, the TCM accepted the case, established initial telephone contact, and coordinated the initial home visit.

------------------------------------------------
OUTCOME, NEXT STEPS & FOR TCM REVIEW:

1. "narrative.outcome_of_services":
"The TCM received and reviewed {client}'s referral, established initial telephone contact, obtained {his/her} agreement to participate, and coordinated the initial home visit for {date_time}."

2. "narrative.next_steps":
"The TCM will conduct the initial home visit on {date} to complete the intake, review consents, and begin assessing {his/her} needs."

3. "narrative.for_tcm_review":
List every [CONFIRM: ...] item remaining in the note (one per line starting with "• "), or write "None" if no [CONFIRM: ...] items remain.

------------------------------------------------
WORDING BANK (Use one option per statement and vary naturally between notes):

- Assignment and referral review:
  * "The Targeted Case Manager (TCM) received {client}'s case assignment from the TCM Supervisor, {supervisor}, following a referral from {referral_source}."
  * "Following supervisory review by {supervisor}, {client}'s case was assigned to the TCM after a referral from {referral_source} to initiate Mental Health Targeted Case Management services."
  * "The TCM met with the agency supervisor, {supervisor}, to review the new referral from {referral_source} and obtain the preliminary information available for the case."
  * "The TCM reviewed the referral information and available clinical documentation to identify {client}'s history, current condition, and primary needs."
  * "After verifying the referral information, the TCM accepted the case and completed the preliminary review needed to ensure appropriate service coordination and continuity of care."
- Profile and diagnoses:
  * "{client} is a {age}-year-old {origin} {male/female} with a documented history of {dx_with_icd10} according to {source}."
  * "The referral and available psychiatric documentation identify diagnoses of {dx_with_icd10}."
  * "{He/She} experiences persistent {symptoms}, which interfere with {his/her} emotional stability and daily functioning."
- Barriers:
  * "{His/Her} psychiatric symptoms, physical health conditions, limited family assistance, and financial difficulties create barriers to independently managing healthcare appointments, daily responsibilities, and community resources."
  * "These medical and behavioral health conditions create additional challenges in managing {his/her} healthcare needs and accessing community resources independently."
- Telephone call and introduction:
  * "The TCM contacted {client} by telephone at {phone} and introduced {herself/himself} as {his/her} assigned Targeted Case Manager from [Agency Name]."
  * "Following the case assignment, the TCM contacted {client} by telephone at {phone} to establish rapport and introduce the Mental Health Targeted Case Management Program at [Agency Name]."
- Purpose and scope of TCM:
  * "The TCM explained the purpose and scope of Targeted Case Management services, including coordination of medical and behavioral health care, linkage to community resources, assistance with applications and documentation, and advocacy and support."
  * "The TCM explained that services are individualized according to {client}'s identified needs and may include assessment, coordination, linkage, monitoring, and advocacy."
- No duplication:
  * "{client} confirmed that {he/she} is not currently receiving Targeted Case Management services from another agency or provider."
  * "The TCM verified with {client} that {he/she} is not receiving duplicate case management services from another agency."
- Verification of data:
  * "The TCM verified {his/her} telephone number and residential address at {address} to maintain accurate contact information and facilitate subsequent coordination."
  * "The TCM confirmed {client}'s demographic information, preferred language, telephone number, and residential address at {address}."
- Coordination of the initial home visit:
  * "The TCM coordinated the initial home visit for {date_time} to complete the intake, review required documentation, and assess {his/her} current needs and living environment."
  * "The TCM coordinated a same-day initial home visit for {date_time} to prevent delays in service initiation and promote continuity of care."
- Client response:
  * "{client} was receptive to the explanation, expressed interest in receiving TCM services, and agreed to the scheduled home visit."
  * "{client} verbalized understanding of the information presented and agreed to actively participate in the Targeted Case Management Program."
  * "{client} confirmed {his/her} availability and agreed to meet with the TCM at {his/her} residence as scheduled."
- Medical necessity:
  * "TCM assistance was medically necessary because {client}'s {symptoms} and related barriers interfere with {his/her} ability to coordinate healthcare and access essential services independently."

------------------------------------------------
OUTPUT JSON SCHEMA (Return ONLY valid JSON matching these exact keys):
{
  "template_id": "tcm_case_assignment_note",
  "encounter": {
    "dos_date": "",
    "pos": "11 - Office",
    "location_name": "11 - Office",
    "place_of_service_name": "11 - Office",
    "service_location": "Office",
    "time_in": "",
    "time_out": "",
    "duration_minutes": "25",
    "units": "2"
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
    "service_focus_title": "New Referral - Initial Telephone Contact and Coordination of Initial Home Visit",
    "domains_selected": {
      "1_mental_health_substance_abuse": true,
      "2_physical_health_medical_dental": false,
      "3_vocational_employment_job_training": false,
      "4_school_education": false,
      "5_recreational_social_support": false,
      "6_activities_of_daily_living": false,
      "7_housing_shelter": false,
      "8_economic_financial": false,
      "9_basic_needs": false,
      "10_transportation": false,
      "11_legal_immigration": false,
      "12_other": false
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

for (const node of wf.nodes) {
  if (node.name === 'Webhook') {
    node.parameters.path = 'tcm-case-assignment-note';
    node.webhookId = 'case-assignment-webhook-K3zH8zeSNCBx6QFL';
  }
  if (node.name === 'Message a model') {
    node.parameters.responses.values[0].content = caseAssignmentPrompt;
  }
  if (node.name === 'Normalize & Prepare Context') {
    node.id = 'canonical-normalize-prep-K3zH8zeSNCBx6QFL';
  }
  if (node.name === 'If Has Audio') {
    node.id = 'if-has-audio-K3zH8zeSNCBx6QFL';
  }
  if (node.name === 'Merge Transcription') {
    node.id = 'merge-transcription-K3zH8zeSNCBx6QFL';
  }
}

fs.writeFileSync(outWfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('Successfully generated case_assignment_workflow.json');
