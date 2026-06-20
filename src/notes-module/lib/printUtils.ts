import type { ClioNote } from '../types';

/**
 * Fills a clinical template with structured data from a ClioNote.
 * Follows a two-phase approach: placeholder replacement and anchor-based injection.
 */
export const fillTemplate = (templateText: string, note: ClioNote): string => {
    let result = templateText;

    // 1. Handle Telehealth/Presencial Blocks strictly by line ranges
    result = handleEncounterModeBlocks(result, note.encounter?.mode);

    // 2. Phase 1: replacePlaceholders (age, sex)
    result = replacePlaceholders(result, note);

    // 3. Phase 2: injectByAnchors (mappings)
    result = injectByAnchors(result, note);

    return result;
};

/**
 * Removes Telehealth or Presencial blocks based on encounter mode.
 */
const handleEncounterModeBlocks = (text: string, mode?: string): string => {
    const lines = text.split('\n');
    let outputLines: string[] = [];

    const targetMode = mode?.toLowerCase();
    const skipTelehealth = targetMode === 'presencial';
    const skipPresencial = targetMode === 'telehealth';

    // If mode is unknown, keep everything
    if (targetMode === 'unknown' || (!skipTelehealth && !skipPresencial)) {
        return text;
    }

    let inTelehealthBlock = false;
    let inPresencialBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Detect start of blocks
        if (trimmed.startsWith('TELEHEALTH:')) {
            inTelehealthBlock = true;
            inPresencialBlock = false;
        } else if (trimmed.startsWith('PRESENCIAL:')) {
            inPresencialBlock = true;
            inTelehealthBlock = false;
        } else if (trimmed === '' || /^[0-9]+-/.test(trimmed) || /^[A-Z\s/-]+:$/.test(trimmed)) {
            // End blocks if we hit a clearly new section, heading or empty spacing 
            // after the specific block headers
            if (trimmed !== 'TELEHEALTH:' && trimmed !== 'PRESENCIAL:') {
                inTelehealthBlock = false;
                inPresencialBlock = false;
            }
        }

        // Filter based on detected block and mode
        if (inTelehealthBlock && skipTelehealth) continue;
        if (inPresencialBlock && skipPresencial) continue;

        outputLines.push(line);
    }

    return outputLines.join('\n');
};

/**
 * Phase 1: Replaces {age} and male/female placeholders.
 */
const replacePlaceholders = (text: string, note: ClioNote): string => {
    let result = text;

    // Replace {age} only if it's a valid number/string and not 'not_reported'
    const age = note.patient?.age;
    const isValidAge = age !== undefined && age !== null && age !== 'not_reported' && String(age).trim() !== '';
    if (isValidAge) {
        // Tolerant regex for {age}
        result = result.replace(/\{\s*age\s*\}/gi, String(age));
    }

    // Replace male/female only if sex_at_birth is male/female/m/f
    const sex = note.patient?.sex_at_birth?.toLowerCase();
    if (sex === 'male' || sex === 'f' || sex === 'female' || sex === 'm') {
        const fullSex = (sex === 'm' || sex === 'male') ? 'male' : 'female';
        result = result.replace(/male\/female/gi, fullSex);
    }

    return result;
};

/**
 * Phase 2: Injects structured data after explicit anchors.
 */
const injectByAnchors = (text: string, note: ClioNote): string => {
    const anchors: Record<string, any> = {
        'CHIEF COMPLAINT- CC:': note.hpi?.chief_complaint,
        'SUBJECTIVE/ HISTORY OF PRESENT ILLNESS-HPI:': note.hpi?.narrative,
        'CURRENT PSYCHIATRIC TREATMENT:': note.current_psychiatric_treatment,
        'PAST PSYCHIATRIC HISTORY:': note.past_psychiatric_history,
        'Past Psychiatric hospitalizations:': note.past_psych_hospitalizations,
        'PSYCHIATRIC MEDICATION HISTORY:': note.psychiatric_medication_history,
        'FAMILY MENTAL ILLNESS HISTORY:': note.family_mental_illness_history,
        'RELEVANT MEDICAL CONDITIONS:': note.medical_conditions,
        'RELEVANT SURGICAL PROCEDURES:': note.relevant_surgical_procedures,
        'OTHER NON-PSYCHIATRIC MEDICATIONS:': note.other_non_psych_meds,
        'Positive:': note.ros?.positive,
        'OBJECTIVE-MSE:': note.mse,
        'Test/ Screening Tools:': note.screenings,
        'Assessment-DSM 5:': note.assessment_dsm5,
        'Pharmacological Interventions/ Eforcse checked:': note.plan?.pharmacological,
        'DISPOSITION AND FOLLOW UP:': (note.plan?.follow_up_weeks && note.plan.follow_up_weeks !== 'not_reported') ? `Recommended in ${note.plan.follow_up_weeks} weeks` : null,
        // Inline anchors
        'Marital Status:': note.social_history?.marital_status,
        'Children:': note.social_history?.children,
        'Education Level:': note.social_history?.education,
        'Employment/ Occupation:': note.social_history?.employment,
        'Household/ Living Situation:': note.social_history?.living_situation,
        'Drug or alcohol abuse history:': note.social_history?.substance_use,
        'Nicotine use/ Smoking status:': note.social_history?.nicotine_use,
        'Trauma, Abuse or Neglect history:': note.social_history?.trauma_history,
        'Legal problems:': note.social_history?.legal_history,
    };

    const lines = text.split('\n');
    let outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        outputLines.push(line);

        let matchingAnchor: string | null = null;
        for (const anchor of Object.keys(anchors)) {
            if (line.includes(anchor)) {
                matchingAnchor = anchor;
                break;
            }
        }

        if (matchingAnchor) {
            const data = anchors[matchingAnchor];
            if (isValidData(data)) {
                const formatted = formatData(data);

                // Rule: Heading ending in : -> Next line
                // Inline field -> same line after :
                const trimmedLine = line.trim();
                if (trimmedLine.endsWith(':') && trimmedLine === matchingAnchor) {
                    outputLines.push(formatted);
                } else {
                    // Replace content after the anchor on the same line
                    const [prefix] = line.split(matchingAnchor);
                    outputLines[outputLines.length - 1] = prefix + matchingAnchor + ' ' + formatted;
                }
            }
        }
    }

    return outputLines.join('\n');
};

const isValidData = (data: any): boolean => {
    if (data === undefined || data === null || data === 'not_reported' || data === '') return false;
    if (Array.isArray(data) && data.length === 0) return false;
    return true;
};

const formatData = (data: any): string => {
    if (Array.isArray(data)) {
        return data.map(item => typeof item === 'object' ? formatData(item) : `- ${item}`).join('\n');
    }
    if (typeof data === 'object' && data !== null) {
        if (data.name && data.performed) { // Screening special case
            return `${data.name}: ${data.performed === 'yes' ? data.score : 'Not performed'}`;
        }
        return Object.entries(data)
            .filter(([_, v]) => isValidData(v))
            .map(([k, v]) => {
                const label = k.replace(/_/g, ' ').toUpperCase();
                if (Array.isArray(v)) {
                    return `${label}:\n${v.map(i => `  - ${i}`).join('\n')}`;
                }
                return `${label}: ${v}`;
            })
            .join('\n');
    }
    return String(data);
};
