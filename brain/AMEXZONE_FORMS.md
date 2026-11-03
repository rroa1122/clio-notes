# Amexzone Forms / Intake and Consents (ARC Mental Health) — research for Clio

Read-only research, November 2026. No data was created or changed in Amexzone.

## 1. What the agency fills in at each opening (and again at each yearly recertification)

| Amexzone form template | id | When (forced date) | Segments |
|---|---|---|---|
| Intake TCM | 136 | Initial Home Visit date | personal_information, contact_information, residential_address + question segments (below) |
| Consents Initial HV TCM | 135 | IHV date | 13 consent segments (222, 299, 223, 225, 226, 227, 228, 300, 302, 301, 224 PCP, 224 PSYCH, 224 emergency contact) |
| Authorization for Use and Disclosure (TCM) | 79 | IHV date | 1 consent segment (224) — PCP |
| Coordination of Care | 61 | IHV date | 1 consent segment (301) — PCP |
| SP-Authorization for Use and Disclosure (TCM) | 78 | Service Plan signature date (IHV + ~4 days), x2 | 8 consent segments (224) each = 16 entities |

- Only one CM (Gisselle) uses Forms/Intake. Other CMs add the same consents directly (Consents module: `addConsentsToDestinatario`) without the Intake TCM form. Same legal result.
- Each signed consent segment also becomes a row in the patient's Consents list (11 fixed + ~20 authorizations per opening).
- Extra single Authorizations (79) appear during the year when a new provider is added.

## 2. Consent templates (empresas_consents, legal text fixed, bilingual parts in 223/300)

| id | Name | Fill-in fields |
|---|---|---|
| 222 | CONSENT FOR TREATMENT (TCM) | 2: client name; representative/guardian (empty) |
| 223 | No Duplicate Service Acknowledgement (TCM) | 1 |
| 224 | Authorization for Use and Disclosure of Confidential Information (TCM) | 3: entity to disclose to / request from; "Other" purpose; expiration (one year) |
| 225 | Client's Rights (TCM) | 0 |
| 226 | Mental Health Advance Directive Acknowledgement | 3: agent name, phone, relationship (I HAVE / I HAVE NOT) |
| 227 | Acknowledgement of Receipt of HIPAA Notice | 0 |
| 228 | ORIENTATION CHECKLIST (TCM) | 0 (checklist) |
| 229 | Client's Signature Verification Form (TCM) | 1 (not used in the packets seen) |
| 299 | ACCESS TO SERVICES IN AN EMERGENCY | 0 |
| 300 | Foreign Language Acknowledgement | 2 |
| 301 | Coordination of Care (TCM) | 6: physician name, PCP/specialist, address, zip-city-state, phone, fax |
| 302 | Behavioral Health Case Management (welcome letter) | 0 |
| 303 | Consent for Release and Request of Information (TCM) | 7 (not used in the packets seen) |

Templates are served by `GET /select2ConsentsTemplatesAjax?q=&emp_id=106&for=patients` (body HTML with `<textarea class="ql-custom-textarea">` placeholders). Amexzone stays the source of the legal text; Clio keeps only the variable fields.

## 3. Variable data per patient (what Clio must provide)

- Packet 135: client name, PCP name, PCP address (2 lines), PCP phone, PCP fax, PCP entity for the authorization, psychiatrist (name, credential), emergency contact (name + relationship).
- 79 / 61: PCP name, address, city/state/zip, phone, fax.
- 78 (x2): 16 entities from the Service Plan needs. Today typed by hand with typos ("Assurance Wireles", "Recreatinal Program"); common set: ADLs, recreational programs, housing/Section 8, LIHEAP/FPL, Assurance Wireless/Lifeline, donation programs, STS/handicap/DMV, Medicaid/Medicare/health plan, hurricane/Miami-Dade Emergency Management, sometimes SSA, DCF, OTC pharmacy.
- Intake TCM questions (cf = prefilled from the Amexzone patient custom field):
  - Other Information: religion (cf), employment status (cf: Employed FT/PT, Retired, Disabled, Homemaker, Student, Unemployed, NA)
  - Residential information: residential status (cf: Living alone / with relatives / with non-relatives / ALF / ... / Homeless), monthly family income (cf), main source of income (cf)
  - Legal guardian (Not Applicable / Yes)
  - Diagnosis and referral: referred by, phone, address, title, agency; *receiving CM from another provider (Yes/No, required); Eligibility Criteria (free text paragraph)
  - Insurance: Medicaid (cf) + MMA/LTC, Medicare (cf), health plan (cf), health plan ID (cf), other
  - School: 18 or older (Yes/No)
  - Immigration: country of birth (cf), year entered USA (cf), legal status (cf: Citizen/Resident/Other)
  - Current treating: psychiatrist name/phone/address (cf), PCP name/phone/address (cf), other provider name/address/phone
  - Special accommodations (Yes/No); Case Manager's notes (free text)
  - Personal/contact/address segments also include SSN, marital status, education, language, race, ethnicity, phones, email.

## 4. How a form is created, filled and signed in Amexzone

1. Staff creates the form for the patient: `addFormToDestinatario` (template_id, destinatario_id, open_to_edit) from the patient dashboard (CSRF session, no captcha).
2. Date: `updatePacienteFormNewFecha` (forced_date) — applies to the document date and its signatures. CMs set the IHV / SP date and often fill the forms days later.
3. Fill page: `/form/s/{form_token}/en` (Vue). Each consent segment has a "Sign Consent" button that applies the patient's saved signature (`firma_base`, an image in the patient's signatures folder) or a new one drawn on the canvas. One signature image is reused on every segment.
4. Save: `saveFormSentTemplate` (and drafts: `saveDraftFormSentTemplate`) — BOTH require a Google reCAPTCHA v2 checkbox (`grecaptcha.getResponse()`). Completed view: `/form/view/{form_token}/en`.

Consequence: the bot must not solve the reCAPTCHA. A person (the TCM) has to tick it and press Save. Everything before that step can be automated.

## 5. Implementation direction (to decide with the team)

- Clio builds the opening packet from the chart/TCM Social (IHV) and the SP authorizations from the Service Plan (fixed entity list per domain).
- Bot (server, Playwright, staff session): creates forms 136/135/79/61 with the IHV date and 78 x2 with the SP date; can update the patient custom fields in Amexzone so the Intake prefills.
- Final step in the TCM's own browser: open each pending form, Clio fills the text fields, the TCM checks the reCAPTCHA, presses Sign Consent (saved signature) and Save. Options: Clio Sync browser extension autofill, or a guided checklist with copy buttons.
- Patients without a saved signature (new clients) need it captured once (Amexzone canvas, or in Clio and uploaded).
