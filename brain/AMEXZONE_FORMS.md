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

- CORRECTED 2026-11-02 (sweep of the 1,109 active ARC patients created May–Nov 2026, see §7): Forms/Intake is the agency standard (84%), not a Gisselle-only habit. The Consents module alone (`addConsentsToDestinatario`) is rare (2%) and used mostly for loose 224 authorizations.
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

## 6. Decisions (2026-11-02, pending implementation — do not build yet)

1. Investigate the path the other CMs use (Consents module, `addConsentsToDestinatario`) or uploading a document: check whether it avoids the reCAPTCHA before choosing between Forms and Consents.
2. Investigate whether a form can be left filled (all text fields) so the TCM only signs and saves.
3. Signatures stay in Amexzone. If the patient has no saved signature, the documents are created and left ready for the patient to sign there.
4. SSN stays only in Amexzone (not stored in Clio).
5. SP-Authorization entities: fixed list per domain.

## 7. Consents sweep (2026-11-02, read-only) — reference CM Claudia Leyva + whole agency

Active ARC patients with a CM, created 2026-05-01 → 2026-11-02: 1,109.

| Path | Patients | Notes |
|---|---|---|
| Forms/Intake (135/136, old 50) | 927 (84%) | 925 forms 135, 915 completed (99%). Same packet as Gisselle: 136 + 135 on IHV date, 78 on SP date, extra 79 when a provider is added. |
| Consents module only | 22 (2%) | 246 consents, 100% signed, 94% created by the CM's own user. 230/246 are 224 Authorizations; the full 11-consent set appears only once. |
| Nothing in Amexzone | 160 (14%) | 103 no visits yet, 23 only Case Assigned (pending IHV) → normal. ~35–45 already had their IHV and have NO consents, forms or upload (gap). |

By month the "nothing" bucket grows: Aug 34, Sep 38, Oct 67 (Oct mostly pending IHV).

Claudia Leyva (cm_trabajador_id 1038, 28 patients):
- Same Forms packet as Gisselle, usually 1× 78 (Gisselle 2×) + 1–3 extra 79. 21–24 consents per opening, all signed. Old patients: template 50 + 303.
- 2 patients with only 136 + 135 (no SP authorization).
- 9 patients with 0 forms / 0 consents (Orlando Martinez Velazquez, Marta Rodriguez, Esneldo Gomez Gomez, Beatriz Perez, Nieves Diaz, Rebeca Diaz, Raimundo Marquez Arocha, Nieve Murillo, Dolores Umaran Alonso). Their More Documents only hold IDs / eligibility / PCP-PSY records / auths (older ones a migrated "Intake and Progress Notes" .zip from April 2025). No scanned consent packet anywhere.
- Example Dolores Umaran Alonso (AMH7077): Case Assigned + First Home Visit 07/20/2026, the note says "All required admission forms were completed during the visit, and initial consents were signed", TCM Documentation has Assessment/SP/Certification, but Amexzone has no consents → documentation gap, not an alternative method.

Gap CMs (IHV done, nothing in Amexzone): Yasmay Casanas 5, Yuneisy Gil 3, Claudia Leyva (9 incl. older), plus 1 each for Aymee Travieso, Yudit Abreu, Sady Mora Gonzalez, Dailys Almeida, Pedro Alvarez, Yanet Milanes Teruel, Yisabel Viera, Yanisleidy Hernandez. GISSELLE QUINTERO CASTELLON 6 are transfers (monthly visits, opening done elsewhere).

Decision 1 status: nobody uses an upload path for consents, so "upload a document" is not the agency's alternative. The Consents module sends consents to the patient (`addConsentsToDestinatario`, optional email); the patient-side signing page and whether it needs reCAPTCHA is still unverified (needs one test on a test patient, e.g. Testthiago Six 27510, with permission).
