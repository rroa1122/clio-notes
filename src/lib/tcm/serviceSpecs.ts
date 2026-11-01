/**
 * TCM v2 service specifications (beyond the initial-case templates).
 *
 * Built from the agency's real Amexzone notes (October 2026: 10,839 encounters / 16,796 services,
 * grouped by service family). Every spec feeds ONE generic n8n workflow (`tcm-v2-service-note`)
 * that applies the shared documentation standards (A-U) plus the service-specific points below.
 *
 * Common structure the CMs use for task services (the workflow enforces it):
 *   1. Opening "To ..." purpose sentence + why TCM help is needed (diagnosis/symptoms -> barrier, Service Plan goal).
 *   2. What the TCM did: where (place + address) or how (phone/online), who was contacted, TCM introduced as the
 *      client's TCM from [Agency Legal Name], purpose explained.
 *   3. Step by step what happened (forms, documents, representative's instructions, confirmation numbers, dates).
 *   4. Client education / understanding and reaction.
 *   5. Outcome (concrete result) and Next Step(s) (next phase of the same need).
 */

export type ServiceSpec = {
    id: string;
    group: string;
    title: string;            // canonical service title (Clio, note and Amexzone)
    label?: string;           // short label in the selector (defaults to title)
    desc: string;             // selector description
    pos: '11 - Office' | '12 - Home';
    minutes: number;          // agency median for the service
    domains: number[];        // TCM domains always checked
    visit?: boolean;          // face-to-face visit with the client (by-exception visit statements apply)
    purpose: string;          // opening sentence pattern
    must: string[];           // mandatory statements for this service
    sources?: string;         // where the data comes from
    essential?: string[];     // items that get a grouped [CONFIRM] when missing
    outcome: string;          // CM Outcome formula
    next: string;             // CM Next Step(s) formula
    words?: [number, number]; // target length of the narrative
};

export type ServiceGroup = { id: string; category: string; iconName: string; specs: ServiceSpec[] };

export const unitsForMinutes = (m: number) => Math.floor(m / 15) + (m % 15 >= 8 ? 1 : 0);

const NEED = 'why TCM assistance is needed (the client\'s diagnosis and symptoms that create the barrier, linked to the Service Plan goal)';

// ---------- helpers for multi-step services ----------
type StepDef = { key: string; title: string; label?: string; desc: string; pos?: ServiceSpec['pos']; minutes: number; visit?: boolean; purpose: string; must: string[]; outcome: string; next: string; essential?: string[] };
const steps = (group: string, base: { domains: number[]; sources?: string; words?: [number, number] }, defs: StepDef[]): ServiceSpec[] =>
    defs.map(d => ({
        id: `tcm_v2_${group}_${d.key}`,
        group,
        title: d.title,
        label: d.label,
        desc: d.desc,
        pos: d.pos || '11 - Office',
        minutes: d.minutes,
        domains: base.domains,
        visit: d.visit,
        purpose: d.purpose,
        must: d.must,
        sources: base.sources,
        essential: d.essential,
        outcome: d.outcome,
        next: d.next,
        words: base.words || [220, 380],
    }));

// ---------- Monthly follow-up ----------
const MONITORING: ServiceSpec[] = [
    {
        id: 'tcm_v2_mhv', group: 'monitoring', title: 'Monthly Home Visit', label: 'Monthly Home Visit (MHV)',
        desc: 'Monthly face-to-face follow-up at home (98 min / 7u)', pos: '12 - Home', minutes: 98, domains: [1, 2, 6], visit: true,
        purpose: '"To conduct [Client First Name]\'s scheduled monthly home visit to monitor [his/her] psychiatric condition, medical status, medication compliance, home environment, safety, and overall functioning, and to review progress toward the Service Plan goals."',
        must: [
            'Opening: the client\'s diagnoses and persistent symptoms that continue to affect daily functioning and why TCM services remain medically necessary.',
            'Home visit at the client\'s residence with full address.',
            'Presentation on arrival (by exception: alert, oriented, appropriately dressed and groomed, cooperative); symptoms reported or observed only from the transcript.',
            'Safety: by-exception SI/HI statement; psychiatric crisis or safety concerns only if reported.',
            'Psychiatric and medical treatment: current psychiatrist and PCP (names and clinics from the chart), upcoming or recent appointments if known; TCM reinforced keeping appointments and reporting changes.',
            'Medications: the current regimen from the chart (names and doses), adherence as reported, TCM reinforced adherence and reporting side effects.',
            'Home environment (by exception: clean, organized, adequately maintained, no visible hazards, utilities working, food available).',
            'Services provided since the last visit and progress toward each active Service Plan goal (from the transcript and the Service Plan document); any new need identified.',
            'Additional assistance given during the visit if the TCM reports it (correspondence reviewed, donation delivered, forms, education).',
            'Client\'s understanding and agreement with the next actions.',
        ],
        sources: 'Diagnoses, PSYCHIATRIC and MEDICAL tabs (providers, medications), Service Plan document (active goals), transcript.',
        essential: ['client address'],
        outcome: '"TCM completed [Client First Name]\'s monthly home visit, monitored [his/her] psychiatric and medical condition, medication compliance, home safety, and daily functioning[, and assisted with ... when reported]."',
        next: '"TCM will continue monitoring [Client First Name]\'s psychiatric and medical stability, treatment compliance, medication management, and home safety, and will [next service for the active need] according to the Service Plan."',
        words: [500, 900],
    },
    {
        id: 'tcm_v2_mhv_coordination_call', group: 'monitoring', title: 'Phone Call to Coordinate Monthly Home Visit', label: 'Coordinate MHV by Phone',
        desc: 'Short call to schedule the monthly home visit (15 min / 1u)', pos: '11 - Office', minutes: 15, domains: [1],
        purpose: '"To contact [Client First Name] by telephone to coordinate [his/her] monthly home visit."',
        must: ['Telephone call to the client (phone number from the chart).', 'Brief check on how the client is doing, only as reported.', 'Date and time agreed for the home visit (from the transcript; otherwise [CONFIRM] with an e.g. guide).'],
        outcome: '"TCM contacted [Client First Name] and coordinated [his/her] monthly home visit for [date/time]."',
        next: '"TCM will conduct [Client First Name]\'s monthly home visit as scheduled."',
        words: [80, 160],
    },
    {
        id: 'tcm_v2_phone_coordination', group: 'monitoring', title: 'Phone Call - Coordination of Services', label: 'Phone Call / Coordination of Services',
        desc: 'Telephone contact to follow up or coordinate services (30 min / 2u)', pos: '11 - Office', minutes: 30, domains: [1],
        purpose: '"To contact [Client First Name] by telephone to follow up on [his/her] identified needs and coordinate the services in [his/her] Service Plan."',
        must: ['Who was called (client or provider/agency) and the number.', 'What the client reported or requested (transcript only).', 'What the TCM coordinated, explained or agreed during the call.', 'Client\'s understanding.'],
        outcome: '"TCM contacted [Client First Name] by telephone and coordinated [what was coordinated]."',
        next: '"TCM will [next service agreed during the call]."',
        words: [150, 280],
    },
    {
        id: 'tcm_v2_staffing_pcp', group: 'monitoring', title: 'Staffing with PCP', desc: 'Case staffing with the primary care provider (41 min / 3u)', pos: '11 - Office', minutes: 41, domains: [2, 1],
        purpose: '"To conduct a staffing with [Client First Name]\'s primary care provider\'s office to review [his/her] medical treatment, medication compliance, and continuity of care."',
        must: ['Client\'s symptoms and medical conditions (chart) and why coordination is needed.', 'PCP name, clinic and how the staffing happened (in person or by phone).', 'What was reviewed with the provider/assistant: recent visits, medications, recommendations, upcoming appointments (records/transcript only).', 'Agreements for coordination.'],
        outcome: '"TCM conducted a staffing with [Client First Name]\'s PCP office to review [his/her] medication compliance and continuity of medical care."',
        next: '"TCM will continue to monitor [Client First Name]\'s medical follow-up and medication compliance during the monthly home visits."',
    },
    {
        id: 'tcm_v2_staffing_psy', group: 'monitoring', title: 'Staffing with Psychiatrist', desc: 'Case staffing with the psychiatric provider (41 min / 3u)', pos: '11 - Office', minutes: 41, domains: [1],
        purpose: '"To conduct a staffing with [Client First Name]\'s psychiatric provider to review [his/her] psychiatric treatment, medication compliance, and last appointment."',
        must: ['Client\'s psychiatric symptoms and diagnoses (chart).', 'Psychiatrist name, clinic and how the staffing happened.', 'What was reviewed: last appointment, medications, recommendations, next appointment (records/transcript only).', 'Agreements for coordination.'],
        outcome: '"TCM conducted a staffing with [Client First Name]\'s psychiatric provider to review [his/her] treatment, medications, and last appointment."',
        next: '"TCM will monitor [Client First Name]\'s psychiatric follow-up and medication compliance during the monthly home visits."',
    },
];

// ---------- Medical care ----------
const MEDICAL: ServiceSpec[] = [
    ...steps('medical', { domains: [2], sources: 'MEDICAL / PSYCHIATRIC tabs (providers, conditions), transcript (specialty, provider, date and time).' }, [
        {
            key: 'referral', title: 'Obtain Medical Referral', desc: 'Obtain a referral from the PCP for a specialist (45 min / 3u)', minutes: 45,
            purpose: '"To obtain a referral from [Client First Name]\'s primary care provider for [specialty] to ensure access to specialized medical care."',
            must: ['Medical need behind the referral and ' + NEED + '.', 'PCP office contacted or visited (name, address/phone), TCM introduced as the client\'s TCM.', 'What was requested and the result (referral obtained, sent to specialist, pending).'],
            essential: ['specialty or provider of the referral'],
            outcome: '"TCM obtained [Client First Name]\'s referral for [specialty] from [his/her] PCP."',
            next: '"TCM will coordinate [Client First Name]\'s [specialty] appointment."',
        },
        {
            key: 'appointment', title: 'Coordinate Medical Appointment', desc: 'Schedule a PCP, specialist, dental or vision appointment (53 min / 4u)', minutes: 53,
            purpose: '"To coordinate [Client First Name]\'s [specialty] appointment with [provider] to ensure continuity of [his/her] medical care."',
            must: ['Medical need and ' + NEED + '.', 'Provider contacted (name, address, phone), TCM introduced and explained the purpose.', 'Appointment date and time obtained (transcript; otherwise [CONFIRM] with an e.g. guide), preparation instructions.', 'Transportation needs reviewed; client informed and verbalized understanding.'],
            essential: ['provider or specialty', 'appointment date and time'],
            outcome: '"[Client First Name] obtained a confirmed [specialty] appointment with [provider] for [date], supporting [his/her] continued access to medical care."',
            next: '"TCM will follow up with [Client First Name] regarding the scheduled appointment and coordinate transportation as needed."',
        },
        {
            key: 'followup', title: 'Follow-up on Medical Appointment', desc: 'Check attendance, results and recommendations (40 min / 3u)', minutes: 40,
            purpose: '"To follow up on [Client First Name]\'s [specialty] appointment to verify attendance, results, and recommendations."',
            must: ['Which appointment and why follow-up is needed.', 'How the TCM followed up (client, provider office) and what was learned (attendance, results, new orders, next appointment) only as reported.', 'Education and coordination provided.'],
            outcome: '"TCM followed up on [Client First Name]\'s [specialty] appointment and confirmed [result]."',
            next: '"TCM will coordinate the recommended follow-up care and monitor [Client First Name]\'s medical needs."',
        },
        {
            key: 'accompany', title: 'Accompany Client to Medical Appointment', desc: 'TCM present at the appointment to advocate (90 min / 6u)', minutes: 90,
            purpose: '"To accompany [Client First Name] to [his/her] [specialty] appointment with [provider] and advocate on [his/her] behalf."',
            must: ['Medical need and ' + NEED + '.', 'Provider, place and address.', 'What the TCM did at the appointment (check-in, communication with staff, advocacy, clarifying instructions) and the provider\'s instructions only as reported.', 'Client\'s understanding of the plan.'],
            outcome: '"[Client First Name] attended [his/her] [specialty] appointment with TCM advocacy and received [instructions/orders]."',
            next: '"TCM will coordinate the follow-up recommended by [provider] and monitor [Client First Name]\'s compliance."',
        },
    ]),
    ...steps('pharmacy', { domains: [2, 1], sources: 'PSYCHIATRIC / MEDICAL medications, pharmacy in the chart, transcript.' }, [
        {
            key: 'refill', title: 'Medication Refill / Pharmacy Coordination', desc: 'Refills, claim medication, pharmacy update (44 min / 3u)', minutes: 44,
            purpose: '"To coordinate [Client First Name]\'s medication refill with [pharmacy] to prevent interruptions in [his/her] treatment."',
            must: ['Why continuity of medication matters for this client (symptoms/conditions).', 'Pharmacy or prescriber contacted (name, address/phone).', 'Medications involved (from the chart) and what was resolved (refill ready, prior authorization, pharmacy updated).', 'Client informed and verbalized understanding.'],
            outcome: '"TCM coordinated [Client First Name]\'s medication refill with [pharmacy] to support continuity of treatment."',
            next: '"TCM will monitor [Client First Name]\'s timely access to [his/her] prescribed medications."',
        },
        {
            key: 'medlist', title: 'Update Medication List', desc: 'Review and update the current medication list (40 min / 3u)', minutes: 40,
            purpose: '"To review and update [Client First Name]\'s current medication list to support safe medication management and coordination among [his/her] providers."',
            must: ['Source used (bottles at home, pharmacy, provider records).', 'Current medications with doses (chart/transcript); changes found only as reported.', 'Education on adherence and keeping an updated list.'],
            outcome: '"TCM updated [Client First Name]\'s medication list and reinforced medication adherence."',
            next: '"TCM will share the updated list with [Client First Name]\'s providers as needed and monitor compliance."',
        },
    ]),
    ...steps('vaccine', { domains: [2], sources: 'MEDICAL tab, transcript (vaccine, pharmacy, date).' }, [
        {
            key: 'educate', title: 'Vaccine Education and Locations', label: 'Educate / Gather Vaccine Locations', desc: 'Educate on seasonal vaccines and gather locations (53 min / 4u)', minutes: 53,
            purpose: '"To educate [Client First Name] about the [flu/pneumonia/RSV/shingles] vaccine and identify accessible vaccination locations."',
            must: ['Why the vaccine is recommended for this client (age, conditions).', 'Information gathered (pharmacies, requirements, coverage).', 'Client\'s decision and understanding.'],
            outcome: '"TCM educated [Client First Name] about the [vaccine] and identified accessible vaccination locations."',
            next: '"TCM will coordinate [Client First Name]\'s [vaccine] appointment."',
        },
        {
            key: 'coordinate', title: 'Coordinate Vaccine Appointment', desc: 'Schedule the vaccine at a pharmacy (53 min / 4u)', minutes: 53,
            purpose: '"To coordinate [Client First Name]\'s [vaccine] appointment at [pharmacy]."',
            must: ['Pharmacy contacted (name, address/phone), insurance coverage verified if done.', 'Date and time (transcript; otherwise [CONFIRM] with an e.g. guide).', 'Client informed.'],
            outcome: '"TCM coordinated [Client First Name]\'s [vaccine] appointment at [pharmacy] for [date]."',
            next: '"TCM will assist [Client First Name] in obtaining the [vaccine] as scheduled."',
        },
        {
            key: 'assist', title: 'Assist Client to Obtain Vaccine', desc: 'Assist during vaccine administration (68 min / 5u)', minutes: 68,
            purpose: '"To assist [Client First Name] in obtaining [his/her] [vaccine] at [pharmacy]."',
            must: ['Pharmacy and address.', 'Steps at the pharmacy (forms, ID, insurance) and the vaccine administered only as reported.', 'Post-vaccine education (side effects, next dose).'],
            outcome: '"[Client First Name] obtained [his/her] [vaccine] with TCM assistance."',
            next: '"TCM will monitor [Client First Name]\'s health and keep [his/her] immunization record updated."',
        },
    ]),
];

// ---------- Transportation ----------
const TRANSPORT: ServiceSpec[] = [
    {
        id: 'tcm_v2_transport_coordinate', group: 'transportation', title: 'Coordinate Transportation for Appointment', label: 'Coordinate Transportation',
        desc: 'Medicaid / plan transportation, Freebee or group therapy rides (53 min / 4u)', pos: '11 - Office', minutes: 53, domains: [10],
        purpose: '"To coordinate transportation for [Client First Name]\'s [appointment/program] on [date] to ensure [his/her] attendance."',
        must: ['Appointment or program the ride is for and ' + NEED + ' (mobility, does not drive).', 'Transportation provider contacted (health plan / Modivcare / Freebee / adult day care), phone, member ID verified.', 'Pick-up date, time and confirmation number (transcript; otherwise [CONFIRM] with an e.g. guide).', 'Client informed of pick-up instructions.'],
        essential: ['appointment date and time'],
        outcome: '"TCM coordinated [Client First Name]\'s transportation for [his/her] [appointment] on [date]."',
        next: '"TCM will confirm [Client First Name]\'s attendance and continue coordinating transportation for [his/her] appointments."',
        words: [180, 320],
    },
    ...steps('sts', { domains: [10, 2], sources: 'MEDICAL tab (PCP), TCM Social (drives, special accommodations), transcript.' }, [
        { key: 'obtain', title: 'Obtain STS Application', desc: 'Get the Special Transportation Service application (45 min / 3u)', minutes: 45, purpose: '"To obtain the Special Transportation Service (STS) application for [Client First Name] to support [his/her] access to door-to-door paratransit."', must: ['Mobility limitations and ' + NEED + '.', 'Where/how the application was obtained.', 'Application explained to the client.'], outcome: '"TCM obtained [Client First Name]\'s STS application."', next: '"TCM will assist [Client First Name] in completing the STS application."' },
        { key: 'complete', title: 'Complete STS Application', desc: 'Complete the applicant sections with the client (45 min / 3u)', minutes: 45, purpose: '"To assist [Client First Name] in completing the applicant sections of [his/her] Special Transportation Service (STS) application."', must: ['Sections completed with the client and documents attached.', 'Medical verification section to be completed by the PCP.', 'Client understanding.'], outcome: '"TCM assisted [Client First Name] in completing the applicant sections of [his/her] STS application."', next: '"TCM will deliver the STS application to [Client First Name]\'s PCP for the medical verification."' },
        { key: 'pcp', title: 'Collect STS Certification from PCP', desc: 'Deliver to or collect the signed form at the PCP (45 min / 3u)', minutes: 45, purpose: '"To coordinate the completion of the medical verification section of [Client First Name]\'s STS application with [his/her] primary care provider."', must: ['PCP office, address, staff spoken to.', 'Form delivered or collected; status as reported.'], outcome: '"TCM coordinated the medical verification of [Client First Name]\'s STS application with [his/her] PCP."', next: '"TCM will submit [Client First Name]\'s completed STS application."' },
        { key: 'submit', title: 'Submit STS Application', desc: 'Submit the completed STS package (45 min / 3u)', minutes: 45, purpose: '"To submit [Client First Name]\'s completed Special Transportation Service (STS) application package."', must: ['Where/how it was submitted (Paratransit office address, fax, mail) and confirmation.', 'Next steps explained (eligibility interview, decision letter).'], outcome: '"TCM submitted [Client First Name]\'s completed STS application package."', next: '"TCM will monitor the status of [Client First Name]\'s STS application."' },
        { key: 'monitor', title: 'Monitor STS Application', desc: 'Follow up on status, notices or eligibility (40 min / 3u)', minutes: 40, purpose: '"To monitor the status of [Client First Name]\'s Special Transportation Service (STS) application."', must: ['How the status was checked and the result or notice received (as reported).', 'Actions needed and explained to the client.'], outcome: '"TCM monitored [Client First Name]\'s STS application and confirmed [status]."', next: '"TCM will continue following up on [Client First Name]\'s STS application until a decision is received."' },
    ]),
    ...steps('dpp', { domains: [10, 2], sources: 'MEDICAL tab (PCP), transcript.' }, [
        { key: 'obtain', title: 'Obtain Disabled Parking Permit Application', label: 'Obtain DPP Application', desc: 'Get the DPP form at the Tag Agency or online (44 min / 3u)', minutes: 44, purpose: '"To obtain the Disabled Parking Permit (DPP) application for [Client First Name] to improve [his/her] accessibility to essential services."', must: ['Mobility limitations and ' + NEED + '.', 'Where it was obtained (Tag Agency address or website).'], outcome: '"TCM obtained [Client First Name]\'s Disabled Parking Permit application."', next: '"TCM will assist [Client First Name] in completing the DPP application."' },
        { key: 'complete', title: 'Complete Disabled Parking Permit Application', label: 'Complete DPP Application', desc: 'Complete the client sections (44 min / 3u)', minutes: 44, purpose: '"To assist [Client First Name] in completing the applicant section of [his/her] Disabled Parking Permit application."', must: ['Information completed and reviewed with the client.', 'Medical certification pending from the PCP.'], outcome: '"TCM assisted [Client First Name] in completing the applicant section of [his/her] DPP application."', next: '"TCM will submit the DPP form to [Client First Name]\'s PCP for medical certification."' },
        { key: 'pcp', title: 'Submit DPP Form to PCP', desc: 'Deliver or collect the certification at the PCP (42 min / 3u)', minutes: 42, purpose: '"To submit [Client First Name]\'s Disabled Parking Permit form to [his/her] primary care provider for medical certification."', must: ['PCP office, address, staff; form checked for accuracy.', 'Status (left for signature, ready for pickup) as reported.'], outcome: '"The DPP form was submitted to [Client First Name]\'s PCP clinic for medical certification."', next: '"TCM will follow up on the DPP certification and submit the form to the Tag Agency."' },
        { key: 'submit', title: 'Submit DPP at Tag Agency', desc: 'Submit the certified form and obtain the permit (44 min / 3u)', minutes: 44, purpose: '"To submit [Client First Name]\'s certified Disabled Parking Permit application at the Tag Agency."', must: ['Tag Agency address, steps, fees and permit issued or pending (as reported).'], outcome: '"TCM assisted [Client First Name] in submitting [his/her] certified DPP application at the Tag Agency."', next: '"TCM will monitor the issuance of [Client First Name]\'s disabled parking permit."' },
    ]),
    ...steps('transitpass', { domains: [10, 8], sources: 'TCM Social (drives), transcript.' }, [
        { key: 'info', title: 'Gather Information - Golden Passport / EASY Card', label: 'Golden Passport: Gather Info', desc: 'Discount transit pass requirements (57 min / 4u)', minutes: 57, purpose: '"To gather information about the Golden Passport / EASY Card discount transit program for [Client First Name] to support [his/her] independent mobility."', must: ['Transportation barrier and ' + NEED + '.', 'Requirements and documents found, office or website.', 'Information explained to the client.'], outcome: '"TCM gathered information about the Golden Passport program and discussed the requirements with [Client First Name]."', next: '"TCM will assist [Client First Name] in completing the Golden Passport application."' },
        { key: 'apply', title: 'Complete and Submit Golden Passport Application', label: 'Golden Passport: Apply', desc: 'Complete/submit or renew the pass (69 min / 5u)', minutes: 69, purpose: '"To assist [Client First Name] in completing and submitting [his/her] Golden Passport / EASY Card application."', must: ['Office address or website, documents presented, steps completed.', 'Card issued, renewed or pending (as reported).'], outcome: '"TCM assisted [Client First Name] in completing and submitting [his/her] Golden Passport application."', next: '"TCM will monitor the issuance of [Client First Name]\'s Golden Passport card."' },
    ]),
];

// ---------- Housing, benefits and finances ----------
const HOUSING_BENEFITS: ServiceSpec[] = [
    ...steps('housing', { domains: [7, 8], sources: 'TCM Social (housing type, rent, Section 8, income), transcript (complex, office, documents).', words: [220, 400] }, [
        { key: 'obtain', title: 'Obtain Housing Application', desc: 'Get the application for an affordable housing complex (60 min / 4u)', minutes: 60, purpose: '"To obtain the housing application for [complex/program] for [Client First Name] to support [his/her] access to affordable and stable housing."', must: ['Housing need (income, current living situation) and ' + NEED + '.', 'Complex/program, address or website, how the application was obtained, requirements.', 'Application and required documents explained to the client.'], essential: ['housing complex or program'], outcome: '"TCM obtained the [complex] housing application for [Client First Name]."', next: '"TCM will assist [Client First Name] in completing the housing application."' },
        { key: 'documents', title: 'Gather Housing Supporting Documents', desc: 'Bank statements, DCF/SSA letters for the package (55 min / 4u)', minutes: 55, purpose: '"To obtain the supporting documents required for [Client First Name]\'s [complex] housing application package."', must: ['Documents required and where each was obtained (bank, DCF, SSA online or in person).', 'Documents added to the package.'], outcome: '"TCM assisted [Client First Name] in obtaining [documents] for [his/her] housing application package."', next: '"TCM will assist [Client First Name] in completing and submitting the housing application."' },
        { key: 'complete', title: 'Complete Housing Application', desc: 'Complete the application with the client (78 min / 5u)', minutes: 78, pos: '12 - Home', visit: true, purpose: '"To assist [Client First Name] in completing [his/her] housing application for [complex]."', must: ['Where it was completed (home address / online) and sections completed with the client.', 'Documents attached; information verified with the client.', 'Client understanding.'], outcome: '"TCM assisted [Client First Name] in completing [his/her] [complex] housing application."', next: '"TCM will assist [Client First Name] in submitting the housing application."' },
        { key: 'submit', title: 'Submit Housing Application', desc: 'Submit at the office, online, by mail or fax (68 min / 5u)', minutes: 68, purpose: '"To assist [Client First Name] in submitting [his/her] completed housing application to [complex]."', must: ['Office address or method; representative reviewed the packet; confirmation or receipt.', 'Next steps explained (waiting list, interview, notices).'], outcome: '"[Client First Name]\'s housing application for [complex] was submitted and accepted with all documents."', next: '"TCM will monitor the status of [Client First Name]\'s housing application."' },
        { key: 'monitor', title: 'Monitor Housing Application', desc: 'Follow up on waiting list, notices, updates (55 min / 4u)', minutes: 55, purpose: '"To monitor the status of [Client First Name]\'s housing application with [complex]."', must: ['How the status was checked and the result (as reported).', 'Letters or updates handled with the client.'], outcome: '"TCM monitored [Client First Name]\'s housing application and confirmed [status]."', next: '"TCM will continue following up on [Client First Name]\'s housing application."' },
        { key: 'recert', title: 'Housing Recertification Assistance', desc: 'Annual recertification of housing benefits (68 min / 5u)', minutes: 68, purpose: '"To assist [Client First Name] with the annual recertification of [his/her] housing benefits to keep them active."', must: ['Notice received and documents required.', 'Documents gathered/submitted, interview if any (as reported).'], outcome: '"TCM assisted [Client First Name] with [his/her] housing recertification requirements."', next: '"TCM will monitor the outcome of [Client First Name]\'s housing recertification."' },
    ]),
    ...steps('energy', { domains: [8], sources: 'TCM Social (income, benefits), transcript (FPL bill, letters, program).' }, [
        { key: 'documents', title: 'Gather LIHEAP / EEAP Documents', desc: 'FPL bill, DCF and SSA letters for energy assistance (56 min / 4u)', minutes: 56, purpose: '"To obtain the documents required for [Client First Name]\'s Low Income Home Energy Assistance Program (LIHEAP) application."', must: ['Utility burden and ' + NEED + '.', 'Each document and where it was obtained (FPL account, DCF, SSA, online or in person).'], outcome: '"TCM assisted [Client First Name] in obtaining [documents] for [his/her] LIHEAP application."', next: '"TCM will assist [Client First Name] in completing and submitting the LIHEAP application."' },
        { key: 'submit', title: 'Complete and Submit LIHEAP / EEAP Application', desc: 'Complete and submit energy assistance (55 min / 4u)', minutes: 55, purpose: '"To assist [Client First Name] in completing and submitting [his/her] LIHEAP application to reduce [his/her] electricity costs."', must: ['Office or website (Miami-Dade Community Action and Human Services), documents attached, entries reviewed with the client.', 'Confirmation saved; next steps explained.'], outcome: '"TCM completed and submitted [Client First Name]\'s LIHEAP application with all required documents."', next: '"TCM will monitor the status of [Client First Name]\'s LIHEAP application."' },
        { key: 'monitor', title: 'Monitor LIHEAP / EEAP Application', desc: 'Follow up on the energy credit (45 min / 3u)', minutes: 45, purpose: '"To monitor the status of [Client First Name]\'s LIHEAP application."', must: ['How the status was checked and the result or credit applied (as reported).'], outcome: '"TCM monitored [Client First Name]\'s LIHEAP application and confirmed [status]."', next: '"TCM will continue following up until [Client First Name]\'s energy credit is applied."' },
    ]),
    ...steps('phone', { domains: [8, 9], sources: 'TCM Social (benefits), transcript (provider: Assurance, Airtalk, SafeLink).' }, [
        { key: 'obtain', title: 'Obtain Free Phone Application / Benefits Letter', label: 'Free Phone: Obtain', desc: 'Lifeline application or benefits letter (55 min / 4u)', minutes: 55, purpose: '"To obtain the documents required for [Client First Name]\'s free phone (Lifeline) application with [provider]."', must: ['Communication need and ' + NEED + '.', 'Application or eligibility letter obtained and how.'], outcome: '"TCM obtained [Client First Name]\'s [document] for the free phone application."', next: '"TCM will assist [Client First Name] in completing and submitting the free phone application."' },
        { key: 'submit', title: 'Complete and Submit Free Phone Application', label: 'Free Phone: Apply', desc: 'Complete and submit the Lifeline application (55 min / 4u)', minutes: 55, purpose: '"To assist [Client First Name] in completing and submitting [his/her] free phone application with [provider]."', must: ['Website or office, eligibility document attached, entries reviewed, confirmation.'], outcome: '"[Client First Name] completed and submitted [his/her] [provider] application with TCM assistance."', next: '"TCM will monitor the application and assist with activating the phone."' },
        { key: 'monitor', title: 'Monitor Free Phone Application', label: 'Free Phone: Monitor / Activate', desc: 'Follow up, activate and educate on the phone (45 min / 3u)', minutes: 45, purpose: '"To monitor [Client First Name]\'s free phone application and assist with activation."', must: ['Status checked or phone received; activation steps and education (as reported).'], outcome: '"TCM monitored [Client First Name]\'s free phone application and [result]."', next: '"TCM will continue monitoring [Client First Name]\'s phone service."' },
    ]),
    ...steps('dcf', { domains: [8, 9], sources: 'TCM Social (food stamps amount/since), transcript.' }, [
        { key: 'letter', title: 'Obtain DCF Benefits Letter', desc: 'Eligibility letter online (MyACCESS) or at DCF (68 min / 5u)', minutes: 68, purpose: '"To obtain [Client First Name]\'s DCF benefits eligibility letter for [purpose]."', must: ['Why the letter is needed and ' + NEED + '.', 'MyACCESS account or DCF office (address); letter obtained and benefits verified.'], outcome: '"TCM assisted [Client First Name] in obtaining [his/her] DCF benefits letter."', next: '"TCM will use the letter to [next step for the application it supports]."' },
        { key: 'office', title: 'DCF Interview / Notice Assistance', desc: 'Accompany to DCF or respond to a notice (69 min / 5u)', minutes: 69, purpose: '"To assist [Client First Name] with the DCF notice requiring [interview/verification] to maintain [his/her] benefits."', must: ['Notice received and what it required.', 'DCF office address or phone; interview or documents provided; result (as reported).'], outcome: '"[Client First Name] completed the DCF [interview/verification] and [his/her] benefits were [confirmed/pending]."', next: '"TCM will monitor [Client First Name]\'s benefits and assist with future DCF requirements."' },
        { key: 'snap', title: 'SNAP Recertification', desc: 'Food assistance renewal (68 min / 5u)', minutes: 68, purpose: '"To assist [Client First Name] with the recertification of [his/her] SNAP benefits to prevent an interruption in food assistance."', must: ['Renewal notice/due date and ' + NEED + '.', 'MyACCESS or DCF office, information updated, documents uploaded, confirmation.'], outcome: '"TCM assisted [Client First Name] in completing [his/her] SNAP recertification."', next: '"TCM will monitor the outcome of [Client First Name]\'s SNAP recertification."' },
    ]),
    ...steps('ssa', { domains: [8], sources: 'TCM Social (SSI/SSA amounts), transcript.' }, [
        { key: 'letter', title: 'Obtain SSA Benefits Letter', desc: 'Benefit verification letter (my Social Security or office) (65 min / 4u)', minutes: 65, purpose: '"To obtain [Client First Name]\'s Social Security benefit verification letter for [purpose]."', must: ['Why the letter is needed.', 'my Social Security account or SSA office (address); letter obtained.'], outcome: '"TCM assisted [Client First Name] in obtaining [his/her] Social Security benefit verification letter."', next: '"TCM will use the letter to [next step]."' },
        { key: 'info', title: 'Social Security Benefits Information', desc: 'COLA, notices, benefit questions (54 min / 4u)', minutes: 54, purpose: '"To gather and explain information about [Client First Name]\'s Social Security benefits regarding [topic]."', must: ['Client concern and ' + NEED + '.', 'Information verified (source) and explained; client understanding.'], outcome: '"TCM gathered and explained information about [Client First Name]\'s Social Security benefits."', next: '"TCM will follow up with [Client First Name] on any action needed for [his/her] benefits."' },
    ]),
    {
        id: 'tcm_v2_insurance_eligibility', group: 'insurance', title: 'Insurance Eligibility Verification', desc: 'Verify coverage, benefits or plan changes (54 min / 4u)', pos: '11 - Office', minutes: 54, domains: [2, 8],
        purpose: '"To verify [Client First Name]\'s health insurance eligibility and benefits with [plan] to maintain [his/her] access to care."',
        must: ['Reason for the verification and ' + NEED + '.', 'Plan contacted (phone/portal), member ID, coverage or benefit confirmed (as reported).', 'Information explained to the client.'],
        outcome: '"TCM verified [Client First Name]\'s insurance eligibility and benefits with [plan]."', next: '"TCM will monitor [Client First Name]\'s coverage and coordinate the benefits identified."',
    },
    {
        id: 'tcm_v2_bank_documents', group: 'finances', title: 'Obtain Bank Statement', desc: 'Bank statements for applications (56 min / 4u)', pos: '11 - Office', minutes: 56, domains: [8],
        purpose: '"To assist [Client First Name] in obtaining [his/her] bank statements for [application]."',
        must: ['Why the statements are needed.', 'Bank branch (address) or online banking; statements obtained.'],
        outcome: '"TCM assisted [Client First Name] in obtaining [his/her] bank statements for [application]."', next: '"TCM will add the statements to [Client First Name]\'s [application] package."',
    },
    {
        id: 'tcm_v2_financial_skills', group: 'finances', title: 'Financial Management Education', label: 'Bills / Online Banking Education', desc: 'Pay bills online, budgeting, ADL financial skills (68 min / 5u)', pos: '11 - Office', minutes: 68, domains: [6, 8],
        purpose: '"To educate [Client First Name] on [paying bills online / online banking / budgeting] to increase [his/her] independence in managing [his/her] finances."',
        must: ['Barrier and ' + NEED + '.', 'Where it took place and what was taught step by step.', 'Client\'s practice and understanding.'],
        outcome: '"TCM educated [Client First Name] on [skill] and assisted [him/her] in [task]."', next: '"TCM will continue assisting [Client First Name] to improve [his/her] financial management skills."',
    },
    {
        id: 'tcm_v2_documents_id', group: 'legal', title: 'Obtain Identification / Legal Documents', label: 'ID / Police Record / Passport / USCIS', desc: 'State ID, police record, passport, USCIS status (68 min / 5u)', pos: '11 - Office', minutes: 68, domains: [11],
        purpose: '"To assist [Client First Name] in obtaining [document] needed for [purpose]."',
        must: ['Why the document is needed and ' + NEED + '.', 'Office or website (DMV, police, USPS, USCIS), requirements and documents presented.', 'Result: document obtained, appointment made or case status (as reported).'],
        essential: ['document requested'],
        outcome: '"TCM assisted [Client First Name] in [obtaining/requesting] [document]."', next: '"TCM will follow up on [Client First Name]\'s [document] until it is received."',
    },
];

// ---------- Basic needs: donations ----------
const DONATION_TYPES: Array<{ key: string; name: string; items: string }> = [
    { key: 'food', name: 'Food', items: 'food (fresh, canned and dry goods)' },
    { key: 'cleaning', name: 'Cleaning Supply', items: 'cleaning and household supplies' },
    { key: 'clothing', name: 'Clothing', items: 'clothing and shoes' },
    { key: 'hygiene', name: 'Hygiene / Personal Care', items: 'personal care and hygiene products' },
];
const DONATIONS: ServiceSpec[] = DONATION_TYPES.flatMap(t => steps(`donation_${t.key}`, { domains: [9], sources: 'TCM Social (income, benefits, household), transcript (organization, address, items).' }, [
    { key: 'gather', title: `Gather ${t.name} Donation Information`, label: `${t.name}: Gather Info`, desc: `Search community resources for ${t.items} (55 min / 4u)`, minutes: 55, purpose: `"To gather information about community resources providing ${t.items} donations for [Client First Name] and link [him/her] to an available resource."`, must: ['Basic need (income, benefits) and ' + NEED + '.', 'Resources found (names, addresses, days, requirements) and the one selected.', 'Information discussed with the client.'], outcome: `"TCM gathered information about ${t.items} donation resources and discussed them with [Client First Name]."`, next: `"TCM will assist [Client First Name] in obtaining the ${t.name.toLowerCase()} donation."` },
    { key: 'obtain', title: `Obtain ${t.name} Donation`, label: `${t.name}: Obtain`, desc: `Obtain the donation at the organization (57 min / 4u)`, minutes: 57, purpose: `"To assist [Client First Name] in obtaining a ${t.items} donation."`, must: ['Organization and address, registration form or ID requested.', 'Items received (as reported).', 'Client informed.'], essential: ['organization'], outcome: `"[Client First Name] obtained the ${t.name.toLowerCase()} donation with TCM assistance."`, next: `"TCM will monitor [Client First Name]'s ongoing need for ${t.items} and continue linking [him/her] with community resources."` },
    { key: 'update', title: `Update ${t.name} Donation`, label: `${t.name}: Update / Monitor`, desc: `Follow up on the donation resource (45 min / 3u)`, minutes: 45, purpose: `"To update the information on ${t.items} donations available to [Client First Name] and monitor [his/her] need."`, must: ['What was updated (dates, new events, eligibility) and discussed with the client.'], outcome: `"TCM updated the ${t.items} donation information and discussed it with [Client First Name]."`, next: `"TCM will assist [Client First Name] in obtaining the next ${t.name.toLowerCase()} donation."` },
]));
DONATIONS.push({
    id: 'tcm_v2_donation_provide', group: 'donation_provide', title: 'Provide Donation During Home Visit', label: 'MHV + Deliver Donation',
    desc: 'Deliver donated items at home + monitoring (83 min / 6u)', pos: '12 - Home', minutes: 83, domains: [9, 1, 2], visit: true,
    purpose: '"To deliver the donated [items] to [Client First Name] at [his/her] residence and monitor [his/her] mental health, medications, and correspondence."',
    must: ['Home address; items delivered.', 'By-exception presentation, safety and home statements.', 'Mental health check, medication check and correspondence assistance (as reported).'],
    outcome: '"TCM delivered the [items] donation to [Client First Name] and monitored [his/her] mental health, medications, and correspondence."',
    next: '"TCM will continue monitoring [Client First Name]\'s needs according to [his/her] Service Plan."',
    words: [250, 450],
});

// ---------- OTC ----------
const OTC: ServiceSpec[] = steps('otc', { domains: [2], sources: 'Insurance (plan), MEDICAL tab, pharmacy, transcript (balance, items, confirmation).' }, [
    { key: 'catalog', title: 'Obtain OTC Catalog and Balance', label: 'OTC: Catalog & Balance', desc: 'Verify the OTC benefit and get the catalog (55 min / 4u)', minutes: 55, purpose: '"To verify [Client First Name]\'s over-the-counter (OTC) benefit balance with [plan] and obtain the OTC catalog."', must: ['Need for OTC items and ' + NEED + '.', 'Plan portal/phone or pharmacy, balance and catalog obtained (as reported).'], outcome: '"TCM verified [Client First Name]\'s OTC benefit and obtained the catalog."', next: '"TCM will assist [Client First Name] in selecting [his/her] OTC items."' },
    { key: 'complete', title: 'Complete OTC Item Selection', label: 'OTC: Complete Order', desc: 'Select eligible items with the client (55 min / 4u)', minutes: 55, pos: '12 - Home', visit: true, purpose: '"To assist [Client First Name] in selecting [his/her] OTC items and completing the order form."', must: ['Items selected within the balance (as reported) and form completed.', 'Client understanding.'], outcome: '"TCM assisted [Client First Name] in completing [his/her] OTC order form."', next: '"TCM will submit [Client First Name]\'s OTC order."' },
    { key: 'submit', title: 'Submit OTC Order', label: 'OTC: Submit Order', desc: 'Submit the order online, by phone or at the pharmacy (43 min / 3u)', minutes: 43, purpose: '"To submit [Client First Name]\'s OTC order to [plan/pharmacy]."', must: ['How and where it was submitted, confirmation or items obtained (as reported).'], outcome: '"TCM submitted [Client First Name]\'s OTC order."', next: '"TCM will monitor the delivery of [Client First Name]\'s OTC items."' },
    { key: 'monitor', title: 'Monitor OTC Order', label: 'OTC: Monitor / Obtain Items', desc: 'Follow up delivery or pick up items (41 min / 3u)', minutes: 41, purpose: '"To monitor [Client First Name]\'s OTC order and confirm receipt of the items."', must: ['Status checked or items received (as reported).'], outcome: '"[Client First Name] obtained [his/her] OTC items with TCM assistance."', next: '"TCM will continue to assist [Client First Name] with [his/her] OTC benefit and monitor [his/her] health."' },
]);

// ---------- Community and social support ----------
const COMMUNITY: ServiceSpec[] = steps('recreation', { domains: [5], sources: 'TCM Social (religion, support), transcript (program, address).' }, [
    { key: 'info', title: 'Gather Recreational / Community Program Information', label: 'Recreation: Gather Info', desc: 'Senior/recreational centers, museum pass, library (57 min / 4u)', minutes: 57, purpose: '"To gather information about recreational and community programs for [Client First Name] to reduce [his/her] social isolation."', must: ['Isolation/symptoms and ' + NEED + '.', 'Programs found (names, addresses, requirements) and discussed with the client.'], outcome: '"TCM gathered information about recreational programs and discussed them with [Client First Name]."', next: '"TCM will assist [Client First Name] in applying to the selected program."' },
    { key: 'apply', title: 'Complete and Submit Recreational Program Application', label: 'Recreation: Apply / Register', desc: 'Apply or register (library card, museum pass, center) (57 min / 4u)', minutes: 57, purpose: '"To assist [Client First Name] in applying to [program]."', must: ['Office or website, documents, registration completed (as reported).'], outcome: '"TCM assisted [Client First Name] in applying to [program]."', next: '"TCM will monitor [Client First Name]\'s enrollment and participation."' },
    { key: 'link', title: 'Link Client to Recreational Program', label: 'Recreation: Link / Monitor', desc: 'Linkage and participation follow-up (57 min / 4u)', minutes: 57, purpose: '"To link [Client First Name] to [program] and monitor [his/her] participation."', must: ['Program, schedule, client\'s participation and response (as reported).'], outcome: '"[Client First Name] was linked to [program]."', next: '"TCM will monitor [Client First Name]\'s participation and emotional well-being."' },
]);

// ---------- Emergency preparedness ----------
const PREPAREDNESS: ServiceSpec[] = steps('eep', { domains: [12], sources: 'MEDICAL tab (conditions, dialysis, oxygen), TCM Social (special accommodations), transcript.' }, [
    { key: 'educate', title: 'Hurricane Season Education', desc: 'Hurricane / storm preparedness education (53 min / 4u)', minutes: 53, purpose: '"To provide [Client First Name] with hurricane season preparedness education and review [his/her] emergency needs."', must: ['Vulnerabilities (conditions, mobility, medications, living alone).', 'Education: supplies, medications, evacuation zones/shelters, emergency contacts, 911 (language used).', 'Client understanding.'], outcome: '"Hurricane preparedness education was provided to [Client First Name], who verbalized understanding."', next: '"TCM will follow up on [Client First Name]\'s emergency supplies and preparedness during the season."' },
    { key: 'obtain', title: 'Obtain Emergency Evacuation Plan Form', label: 'EEP: Obtain Form', desc: 'Miami-Dade Emergency Evacuation Assistance Program form (53 min / 4u)', minutes: 53, purpose: '"To obtain the Miami-Dade Emergency Evacuation Assistance Program form for [Client First Name]."', must: ['Why the client needs evacuation assistance.', 'Where the form was obtained and explained.'], outcome: '"TCM obtained [Client First Name]\'s Emergency Evacuation Assistance Program form."', next: '"TCM will assist [Client First Name] in completing the form with [his/her] PCP."' },
    { key: 'pcp', title: 'Complete Emergency Evacuation Plan with PCP', label: 'EEP: PCP Section', desc: 'Medical section completed by the PCP (53 min / 4u)', minutes: 53, purpose: '"To coordinate the completion of the medical section of [Client First Name]\'s Emergency Evacuation Assistance Program form with [his/her] PCP."', must: ['PCP office, staff, form status (as reported).'], outcome: '"TCM coordinated the medical section of [Client First Name]\'s EEP form with [his/her] PCP."', next: '"TCM will submit [Client First Name]\'s Emergency Evacuation Assistance Program form."' },
    { key: 'submit', title: 'Submit Emergency Evacuation Plan', label: 'EEP: Submit', desc: 'Submit the EEAP registration (53 min / 4u)', minutes: 53, purpose: '"To submit [Client First Name]\'s Emergency Evacuation Assistance Program registration to Miami-Dade Emergency Management."', must: ['How it was submitted and confirmation; client informed.'], outcome: '"TCM submitted [Client First Name]\'s Emergency Evacuation Assistance Program registration."', next: '"TCM will monitor the confirmation of [Client First Name]\'s registration."' },
]);

// ---------- Service plan follow-up and discharge ----------
const PLAN: ServiceSpec[] = [
    ...steps('sp', { domains: [1], sources: 'Service Plan document, TCM Social, transcript (new need).' }, [
        { key: 'addendum', title: 'Develop Service Plan Addendum', desc: 'Addendum for a newly identified need (55 min / 4u)', minutes: 55, purpose: '"To develop a Service Plan Addendum to address [Client First Name]\'s newly identified need for [need]."', must: ['New need identified and why (source).', 'Domain, long-term goal (client\'s words if given) and objectives added; target date.'], essential: ['newly identified need'], outcome: '"TCM developed a Service Plan Addendum based on [Client First Name]\'s need for [need]."', next: '"TCM will discuss the Service Plan Addendum with [Client First Name] for review and signature."' },
        { key: 'addendum_sign', title: 'Discuss and Sign Service Plan Addendum', desc: 'Review and sign the addendum with the client (84 min / 6u)', minutes: 84, pos: '12 - Home', visit: true, purpose: '"To review and discuss the Service Plan Addendum developed to address [Client First Name]\'s need for [need]."', must: ['Home address; addendum explained; client\'s questions; agreement and signature (agency standard unless the transcript says otherwise); copy provided.'], outcome: '"TCM reviewed the Service Plan Addendum with [Client First Name], who agreed and signed it."', next: '"TCM will initiate the interventions added in the Service Plan Addendum."' },
        { key: 'review', title: 'Develop Service Plan Review', desc: 'Six-month review of goals and objectives (55 min / 4u)', minutes: 55, purpose: '"To develop [Client First Name]\'s Service Plan Review and evaluate progress toward [his/her] goals and objectives."', must: ['Each goal: progress, status (achieved, continued, revised) from the Service Plan document and transcript.', 'New needs and updated target dates.'], outcome: '"TCM developed [Client First Name]\'s Service Plan Review with the progress of each goal."', next: '"TCM will discuss the Service Plan Review with [Client First Name] for signature."' },
        { key: 'review_sign', title: 'Discuss and Sign Service Plan Review', desc: 'Review and sign at home (84 min / 6u)', minutes: 84, pos: '12 - Home', visit: true, purpose: '"To review the Service Plan Review with [Client First Name] and obtain [his/her] agreement and signature."', must: ['Home address; goal-by-goal discussion; agreement, signature and copy (agency standard unless the transcript says otherwise).'], outcome: '"TCM reviewed the Service Plan Review with [Client First Name], who agreed and signed it."', next: '"TCM will continue the interventions according to the updated Service Plan."' },
    ]),
    ...steps('discharge', { domains: [1], sources: 'Service Plan document (goals), transcript (reason for discharge).' }, [
        { key: 'summary', title: 'Develop Discharge Summary', desc: 'Discharge summary of services provided (41 min / 3u)', minutes: 41, purpose: '"To develop [Client First Name]\'s Discharge Summary documenting the services provided, goals achieved, and the reason for discharge."', must: ['Reason for discharge (goals achieved, client request, moved, ineligible) from the transcript; otherwise [CONFIRM] with an e.g. guide.', 'Goals achieved or pending (Service Plan document).', 'Referrals and linkages in place for continuity of care.'], essential: ['reason for discharge'], outcome: '"TCM developed [Client First Name]\'s Discharge Summary."', next: '"TCM will meet with [Client First Name] to review the discharge and close the case."' },
        { key: 'visit', title: 'Home Visit for Case Closing', desc: 'Closing visit with the client (55 min / 4u)', minutes: 55, pos: '12 - Home', visit: true, purpose: '"To conduct a home visit with [Client First Name] to review the discharge from Targeted Case Management services and ensure continuity of care."', must: ['Home address; discharge explained; resources and contacts provided; client\'s agreement (as reported).'], outcome: '"TCM reviewed the discharge with [Client First Name] and provided resources for continuity of care."', next: '"TCM will close [Client First Name]\'s case."' },
    ]),
];

export const SERVICE_SPEC_GROUPS: ServiceGroup[] = [
    { id: 'monitoring', category: 'Monthly Follow-up & Coordination', iconName: 'ClipboardList', specs: MONITORING },
    { id: 'medical', category: 'Medical Care, Medications & Vaccines', iconName: 'Stethoscope', specs: MEDICAL },
    { id: 'transportation', category: 'Transportation & Mobility', iconName: 'Car', specs: TRANSPORT },
    { id: 'housing_benefits', category: 'Housing, Benefits & Finances', iconName: 'Building2', specs: HOUSING_BENEFITS },
    { id: 'basic_needs', category: 'Basic Needs & Donations', iconName: 'Package', specs: DONATIONS },
    { id: 'otc', category: 'OTC Benefit Assistance', iconName: 'Pill', specs: OTC },
    { id: 'community', category: 'Recreational & Community Support', iconName: 'Users', specs: COMMUNITY },
    { id: 'preparedness', category: 'Hurricane & Emergency Preparedness', iconName: 'Wind', specs: PREPAREDNESS },
    { id: 'plan', category: 'Service Plan Follow-up & Discharge', iconName: 'ClipboardList', specs: PLAN },
];

export const SERVICE_SPECS: ServiceSpec[] = SERVICE_SPEC_GROUPS.flatMap(g => g.specs);
export const SERVICE_SPECS_BY_ID: Record<string, ServiceSpec> = Object.fromEntries(SERVICE_SPECS.map(s => [s.id, s]));
export const SERVICE_SPECS_BY_TITLE: Record<string, ServiceSpec> = Object.fromEntries(SERVICE_SPECS.map(s => [s.title, s]));

/** Old Clio selector names that now use a v2 spec. */
export const LEGACY_TITLE_TO_SPEC: Record<string, string> = {
    'Monthly Home Visit': 'tcm_v2_mhv', 'MHV': 'tcm_v2_mhv',
    'TCM Update Vaccine Record': 'tcm_v2_vaccine_educate', 'TCM Coordinate Vaccine Appointment': 'tcm_v2_vaccine_coordinate', 'TCM Assist Vaccine Administration': 'tcm_v2_vaccine_assist',
    'TCM OTC Obtain Form': 'tcm_v2_otc_catalog', 'TCM OTC Complete Items': 'tcm_v2_otc_complete', 'TCM OTC Submit Order': 'tcm_v2_otc_submit',
    'TCM Complete STS Application': 'tcm_v2_sts_complete', 'TCM Collect STS from PCP': 'tcm_v2_sts_pcp', 'TCM Submit STS': 'tcm_v2_sts_submit',
    'TCM Obtain Disabled Parking Permit': 'tcm_v2_dpp_obtain', 'TCM Complete Disabled Parking Permit': 'tcm_v2_dpp_complete', 'TCM Submit DPP to PCP': 'tcm_v2_dpp_pcp',
    'Coordinate Transportation': 'tcm_v2_transport_coordinate', 'Obtain Supply Donation': 'tcm_v2_donation_food_obtain', 'TCM MHV + Provide Donation': 'tcm_v2_donation_provide',
    'TCM Housing Application Assistance': 'tcm_v2_housing_submit', 'USCIS / Immigration Process Assistance': 'tcm_v2_documents_id', 'TCM SNAP Recertification': 'tcm_v2_dcf_snap',
    'Provider Appointment Coordination': 'tcm_v2_medical_appointment',
};

export const getServiceSpecForTitle = (title: string): ServiceSpec | null => {
    const t = String(title || '').trim();
    return SERVICE_SPECS_BY_TITLE[t] || (LEGACY_TITLE_TO_SPEC[t] ? SERVICE_SPECS_BY_ID[LEGACY_TITLE_TO_SPEC[t]] : null) || null;
};

/** Spec sent to the generic workflow (only what the prompt needs). */
export const serviceSpecPayload = (spec: ServiceSpec) => ({
    id: spec.id,
    title: spec.title,
    pos: spec.pos,
    minutes: spec.minutes,
    units: unitsForMinutes(spec.minutes),
    domains: spec.domains,
    face_to_face_visit: Boolean(spec.visit),
    opening_sentence: spec.purpose,
    mandatory_statements: spec.must,
    data_sources: spec.sources || '',
    essential_items: spec.essential || [],
    outcome_formula: spec.outcome,
    next_steps_formula: spec.next,
    target_words: spec.words || [220, 380],
});
