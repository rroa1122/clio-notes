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
- Gisselle: #1 #2 on every opening service. Clio rule: #1 and #2 for the whole opening sequence (clioUtils OPENING_SEQUENCE_TEMPLATES).

## Outcome / Next Steps patterns
- Records: Outcome "TCM gathered and reviewed [Client]'s PCP and psychiatric records…"; Next "TCM will complete [Client]'s (Comprehensive Initial) Assessment" (incorporating the information).
- Assessment + Certification: Outcome "TCM completed/reviewed [Client]'s initial assessment and Medicaid certification…"; Next "TCM will develop the initial service plan…".
- SP development: Outcome "TCM developed [Client]'s Initial Service Plan based on the identified needs"; Next "TCM will meet with [Client] at [his/her] residence to discuss (and sign) the Initial Service Plan".
- SP discussion: Outcome "[Client] reviewed, understood and agreed with / signed the Initial Service Plan"; Next "TCM will begin coordinating the services established in [Client]'s Initial Service Plan".
- How records were obtained is usually not described (Gisselle: "initiated coordination with CareVantage to obtain…"). Clio must not invent a visit, call or fax.

## Clio fixes from the Severo test (2026-11-09)
1. Domains #1 #2 for records, assessment, certification, SP development and discussion.
2. Only records dated on or before the date of service (prompt rule "RECORD DATES vs DATE OF SERVICE").
3. Records: default modality NOT STATED (no visit/ID/thank-you unless the transcript says so).
4. Records Next Steps: complete the Comprehensive Initial Assessment (never "gather" what was just gathered).
5. SP discussion: never "all 0 service goals" (prompt + frontend guard).
6. Header age computed on the date of service.
Open: Clio has no Service Plan document for Severo, so SP development/discussion notes come out with [CONFIRM] for domains/goals; the Service Plan builder (fixed entity list per domain) is the next piece.
