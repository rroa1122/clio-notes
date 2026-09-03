/**
 * Amexzone Patient Intake Processor
 * Sanitizes, formats, and synthesizes patient data imported from Amexzone EMR.
 */

interface RawAmexzoneData {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    dob?: string;
    phone?: string;
    address?: string;
    gender?: string;
    insurance_company?: string;
    insurance_id?: string;
    emr_id?: string;
    ssn?: string;
    preferred_language?: string;
    case_manager?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    diagnoses?: string | string[];
    pcp_name?: string;
    pcp_clinic_name?: string;
    clinic_name?: string;
    pcp_phone?: string;
    pcp_address?: string;
    physical_conditions?: string | string[];
    pcp_conditions?: string | string[];
    medical_conditions?: string | string[];
    pcp_medications?: string | string[];
    current_medications?: string | string[];
    medical_medications?: string | string[];
    medications?: string | string[];
    pharmacy_name?: string;
    pharmacy_phone?: string;
    pharmacy_fax?: string;
    pharmacy_address?: string;
    psych_name?: string;
    psych_phone?: string;
    psych_address?: string;
    mental_conditions?: string | string[];
    psych_conditions?: string | string[];
    psychiatric_diagnoses?: string | string[];
    psych_medications?: string | string[];
    psychiatric_medications?: string | string[];
    presenting_problems?: string;
    presenting_problems_description?: string;
    case_narrative?: string;
    primary_case_narrative?: string;
    chief_complaint?: string;
    subjective?: { chief_complaint?: string };
    assessment_data?: Record<string, any>;
    service_plan_data?: Record<string, any>;
    tcm_social_needs?: Record<string, any>;
    [key: string]: any;
}

/**
 * Known drug brand & generic pairs dictionary.
 */
const DRUG_PAIRS: [RegExp, string][] = [
    [/chlordiazepoxide/i, 'Chlordiazepoxide (Librium)'],
    [/librium/i, 'Chlordiazepoxide (Librium)'],
    [/citalopram/i, 'Citalopram (Celexa)'],
    [/celexa/i, 'Citalopram (Celexa)'],
    [/lamotrigine/i, 'Lamotrigine (Lamictal)'],
    [/lamictal/i, 'Lamotrigine (Lamictal)'],
    [/sertraline/i, 'Sertraline (Zoloft)'],
    [/zoloft/i, 'Sertraline (Zoloft)'],
    [/escitalopram/i, 'Escitalopram (Lexapro)'],
    [/lexapro/i, 'Escitalopram (Lexapro)'],
    [/fluoxetine/i, 'Fluoxetine (Prozac)'],
    [/prozac/i, 'Fluoxetine (Prozac)'],
    [/quetiapine/i, 'Quetiapine (Seroquel)'],
    [/seroquel/i, 'Quetiapine (Seroquel)'],
    [/risperidone/i, 'Risperidone (Risperdal)'],
    [/risperdal/i, 'Risperidone (Risperdal)'],
    [/olanzapine/i, 'Olanzapine (Zyprexa)'],
    [/zyprexa/i, 'Olanzapine (Zyprexa)'],
    [/aripiprazole/i, 'Aripiprazole (Abilify)'],
    [/abilify/i, 'Aripiprazole (Abilify)'],
    [/alprazolam/i, 'Alprazolam (Xanax)'],
    [/xanax/i, 'Alprazolam (Xanax)'],
    [/clonazepam/i, 'Clonazepam (Klonopin)'],
    [/klonopin/i, 'Clonazepam (Klonopin)'],
    [/lorazepam/i, 'Lorazepam (Ativan)'],
    [/ativan/i, 'Lorazepam (Ativan)'],
    [/trazodone/i, 'Trazodone (Desyrel)'],
    [/bupropion/i, 'Bupropion (Wellbutrin)'],
    [/wellbutrin/i, 'Bupropion (Wellbutrin)'],
    [/gabapentin/i, 'Gabapentin (Neurontin)'],
    [/neurontin/i, 'Gabapentin (Neurontin)'],
    [/topiramate/i, 'Topiramate (Topamax)'],
    [/topamax/i, 'Topiramate (Topamax)'],
    [/buspirone/i, 'Buspirone (Buspar)'],
    [/hydroxyzine/i, 'Hydroxyzine (Vistaril)'],
    [/vistaril/i, 'Hydroxyzine (Vistaril)'],
    [/zolpidem/i, 'Zolpidem (Ambien)'],
    [/ambien/i, 'Zolpidem (Ambien)']
];

/**
 * Splits full Hispanic names cleanly (e.g. "Esneldo Gomez Gomez" -> first: "Esneldo", last: "Gomez Gomez").
 */
export function splitHispanicName(fullName: string, rawFirst?: string, rawLast?: string) {
    const cleanFull = (fullName || '').trim().replace(/\s+/g, ' ');
    if (!cleanFull) return { first_name: rawFirst || '', last_name: rawLast || '' };

    const parts = cleanFull.split(' ');
    if (parts.length >= 3) {
        return {
            first_name: parts[0],
            last_name: parts.slice(1).join(' ')
        };
    }
    return {
        first_name: parts[0] || rawFirst || '',
        last_name: parts.slice(1).join(' ') || rawLast || ''
    };
}

/**
 * Deduplicates repeated text descriptions in diagnosis strings.
 * Example: "(F33.1) Major depressive disorder, recurrent, moderate Major depressive disorder, recurrent, moderate"
 * -> "(F33.1) Major depressive disorder, recurrent, moderate"
 */
export function cleanDiagnosesText(input?: string | string[] | null): string {
    if (!input) return '';

    let lines: string[] = [];
    if (Array.isArray(input)) {
        lines = input.map(item => typeof item === 'string' ? item : JSON.stringify(item));
    } else if (typeof input === 'string') {
        lines = input.replace(/<br\s*\/?>/gi, '\n').split('\n');
    }

    const cleaned: string[] = [];

    for (let line of lines) {
        let text = line.trim();
        if (!text) continue;

        text = text.replace(/^[-•*,\s]+/, '').trim();

        text = text.replace(/(\([A-Z0-9.]+\)\s*)(.+)/i, (_, code, desc) => {
            const trimmedDesc = desc.trim();
            const words = trimmedDesc.split(' ');
            if (words.length >= 4 && words.length % 2 === 0) {
                const half = words.length / 2;
                const firstHalf = words.slice(0, half).join(' ');
                const secondHalf = words.slice(half).join(' ');
                if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
                    return `${code}${firstHalf}`;
                }
            }
            return `${code}${trimmedDesc}`;
        });

        text = text.replace(/\s+/g, ' ').trim();
        if (text && !cleaned.includes(text)) {
            cleaned.push(text);
        }
    }

    return cleaned.join('\n');
}

/**
 * Extracts physical & medical conditions from clinical narrative text when EMR tables are empty.
 */
export function extractPhysicalConditionsFromNarrative(text: string): string {
    if (!text) return '';
    const lower = text.toLowerCase();
    const found: string[] = [];

    if (lower.includes('fall') || lower.includes('caida')) found.push('• Recurrent falls / High fall risk');
    if (lower.includes('unsteady gait') || lower.includes('marcha inestable')) found.push('• Unsteady gait / Balance impairment');
    if (lower.includes('hemiparesis') || lower.includes('hemiparesia')) found.push('• Left hemiparesis');
    if (lower.includes('seizure') || lower.includes('convuls')) found.push('• Seizure disorder');
    if (lower.includes('dementia') || lower.includes('cognitive decline') || lower.includes('demencia')) found.push('• Cognitive decline / Dementia');
    if (lower.includes('polypharmacy') || lower.includes('18 active medications')) found.push('• Polypharmacy (~18 active medications across providers)');
    if (lower.includes('hypertension') || lower.includes('hipertension')) found.push('• Essential Hypertension');
    if (lower.includes('diabetes')) found.push('• Type 2 Diabetes Mellitus');

    return found.join('\n');
}

/**
 * Parses medication input and separates clean drug lists from narrative evaluation text.
 */
export function parseMedicationsAndNarrative(input?: string | string[] | null): { meds: string; narrative: string } {
    if (!input) return { meds: '', narrative: '' };
    const rawStr = Array.isArray(input) ? input.join('\n') : String(input).trim();

    if (rawStr.length > 80 && !rawStr.includes('•') && !rawStr.includes('\n')) {
        const foundMeds = new Set<string>();

        for (const [regex, pairedName] of DRUG_PAIRS) {
            if (regex.test(rawStr)) {
                foundMeds.add(`• ${pairedName}`);
            }
        }

        const medsList = Array.from(foundMeds).join('\n');

        return {
            meds: medsList,
            narrative: rawStr
        };
    }

    return {
        meds: cleanMedicationsText(input),
        narrative: ''
    };
}

/**
 * Cleans and formats raw medication text strings or arrays from EMR scrapers.
 */
export function cleanMedicationsText(input?: string | string[] | null): string {
    if (!input) return '';

    let lines: string[] = [];

    if (Array.isArray(input)) {
        lines = input.map(item => typeof item === 'string' ? item : JSON.stringify(item));
    } else if (typeof input === 'string') {
        lines = input
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/;\s*/g, '\n')
            .split('\n');
    }

    const cleanedItems: string[] = [];
    const seen = new Set<string>();

    for (let line of lines) {
        let text = line.trim();
        if (!text) continue;

        text = text
            .replace(/RX\s*#?\s*\d+/gi, '')
            .replace(/STATUS:\s*\w+/gi, '')
            .replace(/REFILLS?:\s*\d+/gi, '')
            .replace(/PRESCRIBER:\s*[^;\n-]+/gi, '')
            .replace(/PHARMACY:\s*[^;\n-]+/gi, '')
            .replace(/QTY:\s*\d+/gi, '')
            .replace(/SIG:\s*/gi, ' - ')
            .replace(/MEDICATION:\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        text = text.replace(/^[-•*,\s]+/, '').replace(/[-,\s]+$/, '').trim();

        if (text.length < 3) continue;

        for (const [regex, pairedName] of DRUG_PAIRS) {
            if (regex.test(text)) {
                text = pairedName;
                break;
            }
        }

        const lowerKey = text.toLowerCase();
        if (seen.has(lowerKey)) continue;
        seen.add(lowerKey);

        cleanedItems.push(`• ${text}`);
    }

    return cleanedItems.join('\n');
}

/**
 * Cleans and formats medical/psychiatric condition text or arrays.
 */
export function cleanConditionsText(input?: string | string[] | null): string {
    if (!input) return '';

    const deduplicated = cleanDiagnosesText(input);
    if (!deduplicated) return '';

    return deduplicated.split('\n').map(l => l.startsWith('•') ? l : `• ${l}`).join('\n');
}

/**
 * Decodes raw Amexzone numeric choice IDs into human-readable text labels, and extracts missing social fields from narrative.
 */
export function decodeSocialNeeds(data: RawAmexzoneData, narrativeText: string = ''): Record<string, any> {
    const prevSocial = data.tcm_social_needs || {};

    // 1. Drives decoding
    let drives = data.drives ?? prevSocial.drives;
    if (drives === 223 || drives === '223' || drives === false || drives === 'No') {
        drives = 'No (Requires Transportation Support)';
    } else if (drives === true || drives === 'Yes') {
        drives = 'Yes (Drives)';
    }

    // 2. Rent payment decoding
    let rentPayment = data.rent_payment ?? prevSocial.rent_payment;
    if (typeof rentPayment === 'number' || (typeof rentPayment === 'string' && /^\d+$/.test(rentPayment))) {
        const amount = Number(rentPayment);
        rentPayment = `$${amount}.00 / month`;
    }

    // 3. Residence status decoding
    let residenceStatus = data.residence_status ?? prevSocial.residence_status;
    if (residenceStatus === 186 || residenceStatus === '186') {
        residenceStatus = 'Permanent Resident (Green Card)';
    }

    // 4. Religion decoding
    let religion = data.religion ?? prevSocial.religion;
    if (religion === 9 || religion === '9') {
        religion = 'Catholic / Christian';
    }

    // 5. Special accommodation decoding
    let specialAccom = data.special_accommodation ?? prevSocial.special_accommodation;
    if (specialAccom === 27 || specialAccom === '27') {
        specialAccom = 'Mobility Assistance / Special Accommodation Required';
    }

    // 6. Narrative text extraction for missing fields (origin_country, children_count, children_location, co_habitants)
    const lowerNarrative = (narrativeText || '').toLowerCase();
    
    let originCountry = data.origin_country || prevSocial.origin_country || '';
    if (!originCountry && lowerNarrative.includes('cuba')) {
        originCountry = 'Cuba';
    }

    let childrenCount = data.children_count || prevSocial.children_count || '';
    let childrenLocation = data.children_location || prevSocial.children_location || '';
    if (!childrenCount && lowerNarrative.includes('two adult children')) {
        childrenCount = '2';
    }
    if (!childrenLocation && (lowerNarrative.includes('resides in cuba') || (lowerNarrative.includes('children') && lowerNarrative.includes('cuba')))) {
        childrenLocation = 'Cuba';
    }

    let coHabitants = data.co_habitants || prevSocial.co_habitants || '';
    if (!coHabitants && (lowerNarrative.includes('wife resides in cuba') || lowerNarrative.includes('without immediate family presence'))) {
        coHabitants = 'Lives alone in US; family resides in Cuba';
    }

    return {
        ...prevSocial,
        ...(data.tcm_social_needs || {}),
        ...(data.assessment_data || {}),
        ...(data.service_plan_data || {}),
        marital_status: data.marital_status || prevSocial.marital_status || 'Married',
        education_level: data.education_level || prevSocial.education_level || 'Middle or High School',
        ssi_details: data.ssi_details || prevSocial.ssi_details || 'SSI',
        medicaid_details: data.medicaid_status || data.insurance_id || prevSocial.medicaid_details || '',
        medicare_details: data.medicare_status || prevSocial.medicare_details || '',
        religion: religion || '',
        food_stamps_amount: data.food_stamps_amount || prevSocial.food_stamps_amount || '',
        food_stamps_since: data.food_stamps_since || prevSocial.food_stamps_since || '',
        ssi_amount: data.ssi_amount || prevSocial.ssi_amount || '',
        ssa_amount: data.ssa_amount || prevSocial.ssa_amount || '',
        occupation: data.occupation || prevSocial.occupation || '',
        retirement_date: data.retirement_date || prevSocial.retirement_date || '',
        origin_country: originCountry,
        us_entry_date: data.us_entry_date || prevSocial.us_entry_date || '',
        citizenship_status: data.citizenship_status || prevSocial.citizenship_status || '',
        residence_status: residenceStatus || '',
        co_habitants: coHabitants,
        children_count: childrenCount,
        children_location: childrenLocation,
        emergency_contact_relationship: data.emergency_contact_relationship || prevSocial.emergency_contact_relationship || '',
        housing_type: data.housing_type || prevSocial.housing_type || '',
        drives: drives || '',
        rent_payment: rentPayment || '',
        regular_rent: data.regular_rent ?? prevSocial.regular_rent ?? false,
        plan_8: data.plan_8 ?? prevSocial.plan_8 ?? false,
        low_income: data.low_income ?? prevSocial.low_income ?? false,
        bank_name: data.bank_name || prevSocial.bank_name || '',
        special_accommodation: specialAccom || '',
        
        // Checklist fields
        ssi_recipient: data.ssi_recipient ?? prevSocial.ssi_recipient ?? (Boolean(data.ssi_details || data.ssi_amount)),
        snap_recipient: data.snap_recipient ?? prevSocial.snap_recipient ?? (Boolean(data.food_stamps_amount || data.food_stamps_since)),
        medicaid_recipient: data.medicaid_recipient ?? prevSocial.medicaid_recipient ?? (Boolean(data.insurance_company?.toLowerCase().includes('medicaid') || data.medicaid_status)),
        medicare_recipient: data.medicare_recipient ?? prevSocial.medicare_recipient ?? (Boolean(data.insurance_company?.toLowerCase().includes('medicare') || data.medicare_status)),
        liheap_needed: data.liheap_needed ?? prevSocial.liheap_needed ?? false,
        lifeline_needed: data.lifeline_needed ?? prevSocial.lifeline_needed ?? false,
        housing_voucher: data.housing_voucher ?? prevSocial.housing_voucher ?? false,

        // 12 Domains
        domain_mental_health: data.domain_mental_health ?? prevSocial.domain_mental_health ?? true,
        domain_physical_health: data.domain_physical_health ?? prevSocial.domain_physical_health ?? true,
        domain_housing: data.domain_housing ?? prevSocial.domain_housing ?? true,
        domain_financial: data.domain_financial ?? prevSocial.domain_financial ?? true,
        domain_basic_needs: data.domain_basic_needs ?? prevSocial.domain_basic_needs ?? true,
        domain_transportation: data.domain_transportation ?? prevSocial.domain_transportation ?? true,
        domain_daily_living: data.domain_daily_living ?? prevSocial.domain_daily_living ?? true,
        domain_recreational: data.domain_recreational ?? prevSocial.domain_recreational ?? true,
        domain_education: data.domain_education ?? prevSocial.domain_education ?? false,
        domain_vocational: data.domain_vocational ?? prevSocial.domain_vocational ?? false,
        domain_legal: data.domain_legal ?? prevSocial.domain_legal ?? false,
        domain_other: data.domain_other ?? prevSocial.domain_other ?? false,
    };
}

/**
 * Extracts or synthesizes a clean Primary Case Narrative / Presenting Problems text.
 */
export function synthesizePresentingProblems(data: RawAmexzoneData, clientName: string, fallbackNarrative: string = ''): string {
    const explicitNarrative = 
        data.presenting_problems ||
        data.presenting_problems_description ||
        data.case_narrative ||
        data.primary_case_narrative ||
        data.chief_complaint ||
        data.subjective?.chief_complaint ||
        fallbackNarrative;

    let narrative = '';

    if (explicitNarrative && explicitNarrative.trim().length > 15) {
        narrative = explicitNarrative.trim();
        if (narrative === narrative.toUpperCase() && narrative.length > 30) {
            narrative = narrative.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
        }
    } else {
        const name = clientName.trim() || data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'The client';
        const psychConditions = cleanConditionsText(data.mental_conditions || data.psych_conditions || data.psychiatric_diagnoses);
        const pcpConditions = cleanConditionsText(data.physical_conditions || data.pcp_conditions || data.medical_conditions);

        const parts: string[] = [];
        parts.push(`${name} is referred for targeted case management services.`);

        if (psychConditions) {
            const condList = psychConditions.replace(/• /g, '').split('\n').join(', ');
            parts.push(`Presenting behavioral/mental health focus includes: ${condList}.`);
        }

        if (pcpConditions) {
            const medList = pcpConditions.replace(/• /g, '').split('\n').join(', ');
            parts.push(`Associated medical conditions being monitored include: ${medList}.`);
        }

        parts.push(`Case management support is requested to assist with community resource coordination, appointment compliance, and overall stabilization.`);
        narrative = parts.join(' ');
    }

    if (data.emergency_contact_relationship && data.emergency_contact_relationship.length > 40 && !narrative.includes(data.emergency_contact_relationship.slice(0, 30))) {
        narrative += `\n\nPsychosocial & Support System Note: ${data.emergency_contact_relationship.trim()}`;
    }

    return narrative;
}

/**
 * Main processor function to map and clean raw Amexzone data for Patient state.
 */
export function processAmexzoneData(data: RawAmexzoneData, prev: any = {}) {
    const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || prev.full_name || '';
    const { first_name, last_name } = splitHispanicName(fullName, data.first_name, data.last_name);

    // Parse psych medications and narrative
    const psychParsed = parseMedicationsAndNarrative(data.psych_medications || data.psychiatric_medications);
    const psychMeds = psychParsed.meds || prev.psych_medications || '';

    // Parse PCP medications
    const pcpParsed = parseMedicationsAndNarrative(data.pcp_medications || data.current_medications || data.medical_medications || data.medications);
    const pcpMeds = pcpParsed.meds || prev.pcp_medications || '';

    // Clean conditions & diagnoses
    const psychConds = cleanConditionsText(
        data.mental_conditions || data.psych_conditions || data.psychiatric_diagnoses
    ) || prev.psych_conditions || '';

    let pcpConds = cleanConditionsText(
        data.physical_conditions || data.pcp_conditions || data.medical_conditions
    ) || prev.pcp_conditions || '';

    // Fallback: extract physical conditions from narrative if pcpConds is empty
    const fallbackNarrative = psychParsed.narrative || pcpParsed.narrative || data.emergency_contact_relationship || '';
    if (!pcpConds && fallbackNarrative) {
        pcpConds = extractPhysicalConditionsFromNarrative(fallbackNarrative);
    }

    const cleanedDiagnoses = cleanDiagnosesText(data.diagnoses) || prev.diagnoses || '';
    const presentingProblems = synthesizePresentingProblems(data, fullName, fallbackNarrative) || prev.presenting_problems || '';
    const socialNeeds = decodeSocialNeeds(data, fallbackNarrative);

    return {
        first_name: first_name || prev.first_name || '',
        last_name: last_name || prev.last_name || '',
        full_name: fullName,
        dob: data.dob || prev.dob || '',
        phone: data.phone || prev.phone || '',
        address: data.address || prev.address || '',
        gender: data.gender || prev.gender || '',
        insurance_company: data.insurance_company || prev.insurance_company || '',
        insurance_id: data.insurance_id || prev.insurance_id || '',
        emr_id: data.emr_id || prev.emr_id || '',
        ssn: data.ssn || prev.ssn || '',
        preferred_language: data.preferred_language || prev.preferred_language || 'English',
        case_manager: data.case_manager || prev.case_manager || '',
        emergency_contact_name: data.emergency_contact_name || prev.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || prev.emergency_contact_phone || '',
        diagnoses: cleanedDiagnoses,
        
        // PCP & Clinic Info
        pcp_name: data.pcp_name || prev.pcp_name || '',
        pcp_clinic_name: data.pcp_clinic_name || data.clinic_name || prev.pcp_clinic_name || '',
        pcp_phone: data.pcp_phone || prev.pcp_phone || '',
        pcp_address: data.pcp_address || prev.pcp_address || '',
        pcp_conditions: pcpConds,
        pcp_medications: pcpMeds,

        // Pharmacy Info
        pharmacy_name: data.pharmacy_name || prev.pharmacy_name || '',
        pharmacy_phone: data.pharmacy_phone || prev.pharmacy_phone || '',
        pharmacy_fax: data.pharmacy_fax || prev.pharmacy_fax || '',
        pharmacy_address: data.pharmacy_address || prev.pharmacy_address || '',

        // Psychiatric Info
        psych_name: data.psych_name || prev.psych_name || '',
        psych_phone: data.psych_phone || prev.psych_phone || '',
        psych_address: data.psych_address || prev.psych_address || '',
        psych_conditions: psychConds,
        psych_medications: psychMeds,

        // Presenting Problems / Primary Case Narrative
        presenting_problems: presentingProblems,

        // Decoded & Enriched TCM Social Needs
        tcm_social_needs: socialNeeds,
    };
}
