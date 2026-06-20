import { StructuredNote } from '../types';

export interface ParseResult {
    ok: boolean;
    data?: StructuredNote;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    raw?: any;
}

/**
 * Single source of truth for parsing clinical notes.
 * Handles:
 * 1. JSON Objects (Direct)
 * 2. JSON Strings (Double encoded)
 * 3. JSON embedded in Markdown code blocks
 * 4. Messy/Partial payloads
 */
export const parseClinicalNote = (input: any): ParseResult => {
    // 1. Capture Raw Input for debugging
    const result: ParseResult = {
        ok: false,
        raw: input
    };

    if (!input) {
        result.error = { code: 'EMPTY_INPUT', message: 'Input is null or undefined' };
        return result;
    }

    let parsed: any = input;

    // 2. Unwrapping Logic (JSON String / Markdown)
    try {
        // If input is a string, try to parse it
        if (typeof input === 'string') {
            const clean = input.trim();
            // Check for Markdown code block
            const jsonBlockMatch = clean.match(/```json\s*([\s\S]*?)\s*```/) || clean.match(/```\s*([\s\S]*?)\s*```/);

            if (jsonBlockMatch) {
                parsed = JSON.parse(jsonBlockMatch[1]);
            } else {
                // Try direct parse
                parsed = JSON.parse(clean);
            }
        }
        // Handles double-encoding/nested string structure common in n8n/AI responses
        else if (typeof input === 'object' && input !== null) {
            // Sometimes the useful data is inside a property like 'output', 'json', or 'structured_note' if it was wrapped
            if (typeof input.structured_note === 'string') {
                try {
                    const inner = JSON.parse(input.structured_note);
                    parsed = { ...input, structured_note: inner };
                } catch (e) {
                    // If it fails, assume it's already an object or malformed, continue with original
                }
            }
        }

    } catch (e: any) {
        result.error = {
            code: 'JSON_PARSE_ERROR',
            message: 'Failed to parse input as JSON',
            details: e.message
        };
        return result;
    }

    // 3. Structure Validation & Normalization
    if (typeof parsed !== 'object' || parsed === null) {
        result.error = { code: 'INVALID_TYPE', message: 'Parsed result is not an object' };
        return result;
    }

    // NORMALIZE KEYS (Handle flat "Human Readable" keys from AI)
    // We map known headers to our internal IDs
    const normalized: any = {};
    const KEY_MAP: Record<string, string> = {
        'chief_complaint': 'chief_complaint', 'cc': 'chief_complaint', 'reason_for_visit': 'chief_complaint', 'chief complaint': 'chief_complaint', 'chief complaint cc': 'chief_complaint',
        'hpi': 'history_of_present_illness', 'history_of_present_illness': 'history_of_present_illness', 'history of present illness': 'history_of_present_illness', 'subjective': 'history_of_present_illness', 'subjective history of present illness hpi': 'history_of_present_illness',
        'medications': 'current_medications', 'current_medications': 'current_medications', 'current psychiatric treatment': 'current_medications', 'other non psychiatric medications': 'current_medications',
        'allergies': 'allergies', 'allergies_detailed': 'allergies_detailed',
        'history': 'history', 'past psychiatric history': 'history', 'family mental illness history': 'history', 'relevant medical conditions': 'history', 'relevant surgical procedures': 'history', 'social education employment and legal history': 'history',
        'exam': 'exam', 'objective': 'exam', 'physical_exam': 'exam', 'objective mse': 'exam', 'review of signs and symptoms': 'exam',
        'assessments': 'assessments', 'assessment': 'assessments', 'diagnosis': 'assessments', 'assessment dsm 5': 'assessments',
        'treatment': 'treatment', 'plan': 'treatment', 'plan_recommendations_instructions': 'treatment', 'plan and interventions': 'treatment',
        'follow_up': 'follow_up', 'disposition': 'follow_up', 'disposition and follow up': 'follow_up',
        'patient_education': 'patient_education'
    };

    // Helper to clean key
    const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    // Recursive search or flat map? The payload is usually flat.
    // If structured_note exists, use it. If not, map the root info.
    const source = parsed.structured_note || parsed;

    // Scan keys and map
    Object.keys(source).forEach(key => {
        const val = source[key];
        const cleaned = cleanKey(key);

        // Direct match
        if (KEY_MAP[cleaned]) {
            const target = KEY_MAP[cleaned];
            // If target matches existing (merging?), strictly we just set it if not set, or merge arrays?
            // For now, simple assignment.
            if (target === 'history' || target === 'treatment' || target === 'assessments') {
                // If the target expects an object or array, we might need to be careful.
                // But for now, we just assign. The sanitization phase will handle type conversion.
                // However, if we map "PAST PSYCHIATRIC HISTORY" (string) to "history" (object), sanitization will fail if it expects object.
                // We'll let sanitization handle 'string -> object' conversion/wrapping.
                normalized[target] = val;
            } else {
                normalized[target] = val;
            }
        }
        // Heuristic substring match
        else {
            // Check if any key in map is a substring of cleaned
            const match = Object.keys(KEY_MAP).find(k => cleaned.includes(k) && k.length > 4);
            if (match) {
                normalized[KEY_MAP[match]] = val;
            } else {
                // Keep original for "sections" fallback if needed
                normalized[key] = val;
            }
        }
    });

    // Merge normalized into parsed for the next step to consume
    const noteRoot = { ...source, ...normalized };

    // 4. Sanitize and Map to StructuredNote interface
    try {
        // We explicitly map every field to ensure the resulting object matches strict TS types
        const cleanData: StructuredNote = {
            meta: sanitizeMeta(noteRoot.meta || parsed.meta),
            patient: sanitizePatient(noteRoot.patient || parsed.patient),

            // Facility & Provider (Required by type)
            facility: noteRoot.facility || { facility_name: '' },
            provider: noteRoot.provider || { provider_name: '' },
            appointment: noteRoot.appointment || { chief_complaint: '', date_of_service: new Date().toISOString() },

            // Core Clinical Sections
            chief_complaint: sanitizeString(noteRoot.chief_complaint),
            history_of_present_illness: sanitizeHPI(noteRoot.history_of_present_illness),

            // Arrays/Lists
            current_medications: Array.isArray(noteRoot.current_medications) ? noteRoot.current_medications : [],
            allergies: Array.isArray(noteRoot.allergies) ? noteRoot.allergies : [],
            allergies_detailed: noteRoot.allergies_detailed || { drug: [], food: [], environmental: [] },

            // Complex Objects
            history: sanitizeHistory(noteRoot.history), // UPDATED SANITIZER
            vital_signs: noteRoot.vital_signs || {},
            exam: sanitizeExam(noteRoot.exam), // UPDATED SANITIZER

            // Assessment
            assessments: sanitizeAssessments(noteRoot.assessments), // UPDATED SANITIZER

            // Plan
            treatment: sanitizeTreatment(noteRoot.treatment), // UPDATED SANITIZER
            follow_up: sanitizeFollowUp(noteRoot.follow_up), // UPDATED SANITIZER
            patient_education: noteRoot.patient_education || {},

            // Footer
            sign_off: noteRoot.sign_off || {},

            // Pass through refined sections if available
            sections_by_title: parsed.sections_by_title || {}
        };

        // 5. Finalize
        result.ok = true;
        result.data = cleanData;
        result.raw = parsed;
        return result;

    } catch (e: any) {
        result.error = {
            code: 'MAPPING_ERROR',
            message: 'Failed to map parsed JSON to StructuredNote',
            details: e.message
        };
        result.raw = parsed;
        return result;
    }
};

// --- Helpers Updates for robustness ---

const sanitizeString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'object') return JSON.stringify(val); // Fallback for objects mapped to string fields
    if (typeof val !== 'string') return String(val);
    const s = val.trim();
    if (s.toLowerCase().includes('not recorded') || s.toLowerCase().includes('not reported')) return '';
    return s;
};

const sanitizeMeta = (meta: any) => ({
    note_type: sanitizeString(meta?.note_type),
    encounter_mode: sanitizeString(meta?.encounter_mode),
    ...meta
});

const sanitizePatient = (pt: any) => {
    if (!pt) return { full_name: '', dob: '' };
    return {
        ...pt,
        full_name: sanitizeString(pt.full_name || pt.name),
        age: sanitizeString(pt.age),
        dob: sanitizeString(pt.dob),
        sex: sanitizeString(pt.sex || pt.gender)
    };
};

const sanitizeHPI = (hpi: any) => {
    if (!hpi) return { narrative: '' };
    if (typeof hpi === 'string') return { narrative: sanitizeString(hpi) };
    return {
        narrative: sanitizeString(hpi.narrative),
        telehealth: sanitizeString(hpi.telehealth),
        presencial: sanitizeString(hpi.presencial)
    };
};

// Validates 'string | object' to 'object' transition 
const sanitizeHistory = (val: any) => {
    if (!val) return {};
    if (typeof val === 'string') return { narrative: sanitizeString(val) }; // Map string to general narrative if structure missing
    return val;
}

const sanitizeExam = (val: any) => {
    if (!val) return { physical_exam: { narrative: '' } };
    if (typeof val === 'string') return { physical_exam: { narrative: sanitizeString(val) } };
    return val.physical_exam ? val : { physical_exam: val };
}

const sanitizeAssessments = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return [{ diagnosis: sanitizeString(val) }];
    return [];
}

const sanitizeTreatment = (val: any) => {
    if (!val) return {};
    if (typeof val === 'string') return { plan_recommendations_instructions: sanitizeString(val) };
    return val;
}

const sanitizeFollowUp = (val: any) => {
    if (!val) return {};
    if (typeof val === 'string') return { narrative: sanitizeString(val) };
    return val;
}

