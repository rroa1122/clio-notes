# Case opening pattern (ARC Mental Health, Amexzone) — research 2026-11-09

Sources: Gisselle Rosales Martinez openings (Laura Hernandez, Digna Prieto, Olga Otero, Esther Alvarez, Pedro Placencia, and May/July cases) + 146 opening services from 40 other CMs (patients created 2026-09-01 → 10-20).

## Sequence (consecutive business days, usually first hour of the day)
| Day | Services (one encounter) | POS | Typical length |
|---|---|---|---|
| 1 | New Referral / PC + Initial Home Visit / Develop Intake | 11 Office + 12 Home | 2–2.5 h |
| 2 | Gather Info PCP + Gather Info Psychiatry | 11 Office + 11 Office | ~90 min |
| 3 | (Initial) Assessment + Medicaid/Adult Certification | 12 Home + 11 Office | ~2 h 20 min |
| 4 | Develop Initial Service Plan | 11 Office | ~85 min |
| 5 | Discuss (and sign) Initial Service Plan | 12 Home (Gisselle sometimes Office) | ~70 min |
Then the plan needs start (LIHEAP, Assurance Wireless, DCF/SSA letters, housing...).

## Domains checked (other CMs, frequency)
- Records: #1 #2 (28/43). Assessment: #1 (10), #1 #2 (8), or all plan domains (~9). Certification: #1 #2 (10), #1 (7), all plan domains (~9). SP development/discussion: #1 #2 most common, then all plan domains.
- Gisselle: #1 #2 on every opening service.
- Larger bank (2026-11-10, domains read from the checkbox labels: the summary view only lists the patient's plan domains, so position-based reading is wrong): ~370 cases opened Sep 22-Oct 30, first 4 service days, ~100 CMs. Most common domains per service:
  - New Referral: #1 (81/122), #1 #2 (33). IHV/Intake: #1 (85/191), #1 #2 (78).
  - Psychiatric records: #1 only (129/151). PCP records: #2 only (90/128).
  - Emergency Contact: #1 #2 (30/64), #1 (23).
  - Assessment: #1 (76/178), #1 #2 (48). Certification: #1 (81/202), #1 #2 (69).
- Clio rule now: #1 #2 for referral, IHV, emergency contact, assessment, certification and SP notes; psych records #1; PCP records #2 (clioUtils OPENING_SEQUENCE_TEMPLATES).

## Outcome / Next Steps patterns
- Records: Outcome "TCM gathered and reviewed [Client]'s PCP and psychiatric records…"; Next "TCM will complete [Client]'s (Comprehensive Initial) Assessment" (incorporating the information).
- Assessment + Certification: Outcome "TCM completed/reviewed [Client]'s initial assessment and Medicaid certification…"; Next "TCM will develop the initial service plan…".
- SP development: Outcome "TCM developed [Client]'s Initial Service Plan based on the identified needs"; Next "TCM will meet with [Client] at [his/her] residence to discuss (and sign) the Initial Service Plan".
- SP discussion: Outcome "[Client] reviewed, understood and agreed with / signed the Initial Service Plan"; Next "TCM will begin coordinating the services established in [Client]'s Initial Service Plan".
- How records were obtained is usually not described (Gisselle: "initiated coordination with CareVantage to obtain…"). Clio must not invent a visit, call or fax.

## Clio fixes from the Severo test (2026-11-09)
1. Domains #1 #2 for assessment, certification, SP development and discussion (records corrected 2026-11-10: psych #1, PCP #2).
2. Only records dated on or before the date of service (prompt rule "RECORD DATES vs DATE OF SERVICE").
3. Records: default modality NOT STATED (no visit/ID/thank-you unless the transcript says so).
4. Records Next Steps: complete the Comprehensive Initial Assessment (never "gather" what was just gathered).
5. SP discussion: never "all 0 service goals" (prompt + frontend guard).
6. Header age computed on the date of service.
Open: Clio has no Service Plan document for Severo, so SP development/discussion notes come out with [CONFIRM] for domains/goals; the Service Plan builder (fixed entity list per domain) is the next piece.
7. Service Plan notes (development/discussion): domains = #1 #2 + every domain with goals in the Service Plan document (servicePlanGuide.applyServicePlanDomains). The Service Plan document comes from the patient's TCM Social "Services Needed" flags + plan date/target date; Severo has none set yet, so his SP notes show [CONFIRM] for goals.

## Week after the opening (Gisselle Rosales Martinez, Amexzone, 2026 notes)
- Food donation: "Food Donation Center new + update" / "Link food donation program", 11 Office, ~44 min (3u); lists named distribution sites with addresses. Clio: Food: Gather Info / Obtain.
- Medicaid online account: "Assisting in opening an online Medicaid account", 11 Office (often at the client's medical center), 69-85 min (5-6u); Florida Medicaid Member Portal, step-by-step, verify eligibility/coverage. Clio has no dedicated service: closest is Insurance Eligibility Verification (54 min default).
- OTC: Obtain OTC list/form (11 Office ~40 min, 3u) -> Complete OTC form (Home ~75 min or Office ~55) -> Submit/deliver at the pharmacy (11 Office ~54 min, 4u). Clio: OTC Catalog & Balance / Complete Order / Submit Order / Monitor.
- Free phone: "Obtaining the Assurance Wireless application form online" (11 Office ~39-44 min, 3u) -> DCF/TPQY letter -> complete -> submit (post office). Clio: Free Phone: Obtain / Apply / Monitor.
- Gisselle's domains on these services are inconsistent (often #2-#7 together); Clio keeps the service's own domains (food #9, OTC #2, phone #8 #9, insurance #2 #8).
