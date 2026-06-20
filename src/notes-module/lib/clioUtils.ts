import type { ClioNote } from '../types';
import type { Patient } from './storage';

/**
 * Merges Supabase patient data into the CloNote structure.
 * Ensures fields like emr_id -> account_number, gender -> sex_at_birth are mapped correctly.
 */
export const mergePatientIntoNote = (note: ClioNote, patient: Patient): ClioNote => {
    if (!note.patient) note.patient = {} as any;

    // Root level linkage
    note.patient_id = patient.id;

    // Demographics
    note.patient.full_name = patient.full_name;

    if (patient.dob) {
        note.patient.dob = patient.dob;
        note.patient.age = calculateAge(patient.dob);
    }

    if (patient.gender) note.patient.sex_at_birth = patient.gender;
    if (patient.emr_id) note.patient.account_number = patient.emr_id;
    if (patient.phone) note.patient.mobile = patient.phone;

    // Map Patient Diagnoses to Note Diagnoses section
    if (patient.diagnoses) {
        // Parse string diagnoses into array of objects { name: "..." }
        const diagList = patient.diagnoses
            .split(/[;\n]/) // Split by common delimiters (avoid commas as they exist within ICD-10 names)
            .map(d => d.trim())
            .filter(d => d.length > 0)
            .map(d => ({ name: d }));

        if (diagList.length > 0) {
            // Initialize array if missing
            if (!note.diagnoses) note.diagnoses = [];

            // Merge, avoiding duplicates (simple name check)
            const existingNames = new Set(note.diagnoses.map(d => d.name.toLowerCase()));
            diagList.forEach(d => {
                if (!existingNames.has(d.name.toLowerCase())) {
                    note.diagnoses!.push(d);
                    existingNames.add(d.name.toLowerCase());
                }
            });

            // Also ensure `diagnosis` alias is synced
            note.diagnosis = note.diagnoses;
        }
    }
    return note;
};

/**
 * Merges User Profile and Clinic data into the ClioNote structure.
 * Pre-fills Facility details and Staff signatures.
 */
export const mergeProfileIntoNote = (note: ClioNote, profile: any, clinic: any): ClioNote => {
    if (!note.facility) note.facility = {} as any;
    if (!note.staff) note.staff = {} as any;
    if (!note.signatures) note.signatures = {} as any;

    // Facility Details
    if (clinic) {
        if (clinic.name) note.facility!.name = clinic.name;
        if (clinic.address) note.facility!.address = clinic.address;
        if (clinic.phone) note.facility!.phone = clinic.phone;
        if (clinic.fax) note.facility!.fax = clinic.fax;
        if (clinic.email) note.facility!.email = clinic.email;

        // Map to specialized facility fields for shells that use them
        note.facility!.facility_name = clinic.name;
        note.facility!.facility_address = clinic.address;
        note.facility!.facility_phone = clinic.phone;
        note.facility!.facility_fax = clinic.fax;
        note.facility!.facility_email = clinic.email;

        // Supervisor
        if (clinic.supervisor_name) {
            note.staff!.supervisor_name = clinic.supervisor_name;
            note.signatures!.supervisor_name = clinic.supervisor_name;
        }
        if (clinic.supervisor_license) {
            note.staff!.supervisor_lic = clinic.supervisor_license;
            note.signatures!.supervisor_lic = clinic.supervisor_license;
        }
    }

    // Case Manager / User
    if (profile) {
        if (profile.full_name) {
            note.staff!.case_manager_name = profile.full_name;
            note.signatures!.case_manager_name = profile.full_name;
        }
        if (profile.license_id) {
            note.staff!.case_manager_lic = profile.license_id;
            note.signatures!.case_manager_lic = profile.license_id;
        }
    }

    return note;
};

/**
 * Calculates age based on a birthdate string.
 */
export const calculateAge = (dob: string | undefined): string => {
    if (!dob || dob === "—") return "—";
    try {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return "—";
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age.toString();
    } catch (e) {
        return "—";
    }
};

/**
 * Internal helper to apply common normalization rules across all note types.
 */
const applyBaseNormalization = (clioData: any): ClioNote => {
    if (!clioData.meta) clioData.meta = {};

    const templateId = clioData.template_id || clioData.templateId || clioData.meta?.template_id || clioData.meta?.templateId;

    // 5. Intelligent Metadata Extraction
    if (!clioData.meta.template_id) {
        clioData.meta.template_id = templateId;
    }
    if (!clioData.meta.template_version) {
        clioData.meta.template_version = clioData.template_version || clioData.templateVersion || clioData.meta?.template_version || clioData.meta?.templateVersion || "1.0";
    }

    if (!clioData.meta.visitDate) {
        const extractedDate =
            clioData.encounter?.date ||
            clioData.meta?.visit_date ||
            clioData.appointment?.date_of_service ||
            clioData.visit_details?.date;

        if (extractedDate) {
            clioData.meta.visitDate = extractedDate;
        }
    }

    // 6. Basic Demographic & Facility Extract with high-priority fallbacks
    if (!clioData.patient) clioData.patient = {};
    if (!clioData.patient.full_name) {
        clioData.patient.full_name = clioData.content?.patient?.full_name || clioData.patient_name || clioData.meta?.patientName || clioData.context?.patient_name || "";
    }
    if (!clioData.patient.dob) {
        clioData.patient.dob = clioData.content?.patient?.dob || clioData.patient_dob || clioData.meta?.patientDob || clioData.context?.patient_dob || "";
    }
    if (!clioData.patient.mobile) {
        clioData.patient.mobile = clioData.content?.patient?.mobile || clioData.content?.patient?.phone || clioData.patient?.mobile || clioData.patient?.phone || clioData.patient_mobile || clioData.patient_phone || "";
    }
    if (!clioData.patient.phone) {
        clioData.patient.phone = clioData.content?.patient?.phone || clioData.patient?.phone || clioData.patient_phone || clioData.patient_mobile || clioData.patient.mobile || "";
    }
    if (!clioData.patient.address) {
        clioData.patient.address = clioData.content?.patient?.address || clioData.patient_address || clioData.patient?.address || "";
    }
    if (!clioData.patient.account_number) {
        clioData.patient.account_number = clioData.content?.patient?.account_number || clioData.content?.patient?.emr || clioData.patient?.account_number || clioData.patient?.emr || clioData.meta?.patient_id || clioData.meta?.accountNumber || clioData.patient?.emr_id || "";
    }
    if (!clioData.patient.case_no) {
        clioData.patient.case_no = clioData.content?.patient?.case_no || clioData.patient?.case_no || clioData.meta?.case_no || clioData.case_no || "";
    }
    if (!clioData.patient.sex_at_birth) {
        clioData.patient.sex_at_birth = clioData.content?.patient?.sex || clioData.content?.patient?.sex_at_birth || clioData.patient?.sex || clioData.patient?.sex_at_birth || "";
    }
    // Auto-calculate age
    if (!clioData.patient.age || clioData.patient.age === "—") {
        clioData.patient.age = calculateAge(clioData.patient.dob);
    }

    if (!clioData.facility) clioData.facility = {};
    const fPhone = clioData.content?.facility?.phone || clioData.clinic?.phone || clioData.facility?.phone || clioData.facility?.facility_phone || "";
    const fFax = clioData.content?.facility?.fax || clioData.clinic?.fax || clioData.facility?.fax || clioData.facility?.facility_fax || "";
    const fEmail = clioData.content?.facility?.email || clioData.clinic?.email || clioData.facility?.email || clioData.facility?.facility_email || "";
    const fAddr = clioData.content?.facility?.address || clioData.clinic?.address || clioData.facility?.address || clioData.facility?.facility_address || "";
    const fName = clioData.content?.facility?.name || clioData.clinic?.name || clioData.facility?.name || clioData.facility?.facility_name || "";

    clioData.facility.phone = fPhone;
    clioData.facility.fax = fFax;
    clioData.facility.email = fEmail;
    clioData.facility.address = fAddr;
    clioData.facility.name = fName;

    // Standardize facility labels for specialized shells
    clioData.facility.facility_phone = fPhone;
    clioData.facility.facility_fax = fFax;
    clioData.facility.facility_email = fEmail;
    clioData.facility.facility_address = fAddr;
    clioData.facility.facility_name = fName;

    // 7. Encounter Meta & Visit Details
    if (!clioData.encounter) clioData.encounter = {};
    if (!clioData.encounter.dos_date) {
        clioData.encounter.dos_date = clioData.encounter?.date || clioData.meta?.visitDate || clioData.meta?.visit_date || clioData.appointment?.date_of_service || "";
    }
    if (!clioData.encounter.time_in) {
        clioData.encounter.time_in = clioData.encounter?.time_in || clioData.visit_details?.time_in || clioData.appointment?.start_time || "";
    }
    if (!clioData.encounter.time_out) {
        clioData.encounter.time_out = clioData.encounter?.time_out || clioData.visit_details?.time_out || clioData.appointment?.end_time || "";
    }
    if (!clioData.encounter.pos) {
        clioData.encounter.pos = clioData.encounter?.pos || clioData.visit_details?.pos || clioData.appointment?.location || "";
    }
    if (!clioData.encounter.duration) {
        clioData.encounter.duration = clioData.encounter?.duration || clioData.visit_details?.duration || "";
    }
    if (!clioData.encounter.units) {
        clioData.encounter.units = clioData.encounter?.units || clioData.visit_details?.units || "";
    }

    // 8. Narrative Refinement (Outcome & Next Steps)
    if (!clioData.narrative) clioData.narrative = {};
    clioData.narrative.summary_notes = clioData.narrative.summary_notes || clioData.summary || clioData.hpi?.narrative || "";
    clioData.narrative.outcome_of_services = clioData.narrative.outcome_of_services || clioData.outcome || clioData.outcome_of_services || "";
    clioData.narrative.next_steps = clioData.narrative.next_steps || clioData.next_steps || "";

    // 9. Diagnoses - ENSURE ARRAY OF OBJECTS
    let finalDiagnoses = Array.isArray(clioData.diagnoses) ? clioData.diagnoses : (Array.isArray(clioData.diagnosis) ? clioData.diagnosis : []);

    // If it's still not an array (e.g. it was a string), force it to empty array
    if (!Array.isArray(finalDiagnoses)) finalDiagnoses = [];

    clioData.diagnoses = finalDiagnoses;
    clioData.diagnosis = finalDiagnoses;

    return clioData as ClioNote;
};

export const normalizeClioNote = (rawResponse: any): ClioNote | null => {
    try {
        if (!rawResponse) {
            console.warn("normalizeClioNote: Received empty response");
            return null;
        }

        let data = rawResponse;

        // 1. Array Check (n8n often returns [ { ... } ])
        if (Array.isArray(data)) {
            data = data[0];
        }

        // 2. Nested Wrapper Extraction
        if (data && data.output && Array.isArray(data.output) && data.output[0]?.content) {
            const content = data.output[0].content;
            if (Array.isArray(content) && content[0]?.text) {
                data = content[0].text;
            }
        }
        else if (data && data.text && typeof data.text === 'string' && data.text.trim().startsWith('{')) {
            data = data.text;
        }

        // 3. JSON String Parsing
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
                if (Array.isArray(data)) {
                    data = data[0];
                }
            } catch (e) {
                console.error("normalizeClioNote: Failed to parse JSON string", e);
                return null;
            }
        }

        if (!data || typeof data !== 'object') return null;

        const clioData = data as any;

        // Handle Specialized Templates
        const templateId = clioData.template_id || clioData.templateId || clioData.meta?.template_id || clioData.meta?.templateId;
        if (templateId === 'tcm_progress_note') {
            return normalizeTcmNote(clioData);
        }

        return applyBaseNormalization(clioData);
    } catch (err) {
        console.error("normalizeClioNote: Critical failure during normalization", err);
        return null;
    }
};

/**
 * Standardizes TCM notes into the expected schema for the TcmNoteShell renderer.
 */
export const normalizeTcmNote = (raw: any): ClioNote => {
    const isDev = import.meta.env.DEV;

    const encounterSource = raw.encounter ? 'encounter' : (raw.visit ? 'visit' : 'empty');
    const narrativeSource = raw.narrative ? 'narrative' : (raw.note ? 'note' : 'empty');

    const encounter = raw.encounter || raw.visit || {};
    const narrative = raw.narrative || raw.note || {};
    const patient = raw.patient || {};
    const services = raw.services || {};
    const staff = raw.staff || {};
    const diagnosis = raw.diagnosis || raw.diagnoses || {};
    const signatures = raw.signatures || {};

    // 1. Units Calculation (15-minute rule)
    if (!encounter.units || encounter.units === "" || encounter.units === "—") {
        const duration = parseInt(encounter.duration_minutes || encounter.duration || "0", 10);
        if (duration > 0) {
            encounter.units = Math.ceil(duration / 15).toString();
        }
    }

    // 2. String Safety & Narrative Cleanup
    const narrativeFields = ['summary_notes', 'outcome_of_services', 'next_steps'];
    narrativeFields.forEach(field => {
        if (typeof narrative[field] !== 'string') {
            narrative[field] = (narrative[field] || "").toString();
        }
    });

    // Cleanup redundant headers in summary_notes
    if (narrative.summary_notes) {
        // Look for "Client: [Name]", "EMR: [Number]", "Time: [Time]" patterns at the start
        const patientName = patient.full_name || raw.patient_name || "";
        const escapedName = patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const redundantHeaders = [
            /^Client:\s*.*?\s*(EMR:\s*.*?\s*)?(Time:\s*.*?\s*)?/i,
            /^Patient:\s*.*?\s*(DOB:\s*.*?\s*)?/i,
            // Match "John Smith (DOB 1975-12-05)." pattern
            new RegExp(`^${escapedName}\\s*\\(DOB\\s*[^)]+\\)\\.?\\s*`, 'i'),
            // Strip meta-disclaimers/apologies
            /No additional clinical details were provided/gi,
            /Content outside these stated topics was unclear(\/garbled)?/gi,
            /The interaction focused on discussing/gi,
            /The following summary is based on/gi,
            /This note was generated/gi
        ];

        let cleanedSummary = narrative.summary_notes.trim();
        redundantHeaders.forEach(regex => {
            cleanedSummary = cleanedSummary.replace(regex, '').trim();
        });

        if (cleanedSummary.length > 0) {
            cleanedSummary = cleanedSummary.charAt(0).toUpperCase() + cleanedSummary.slice(1);
        }
        narrative.summary_notes = cleanedSummary;
    }

    // 3. Language Guard (Spanish Detection Heuristic)
    if (narrative.summary_notes) {
        const spanishStopWords = [" el ", " la ", " con ", " para ", " por ", " los ", " las ", " una ", " un ", " del ", " al "];
        const lowerSummary = narrative.summary_notes.toLowerCase();
        const matches = spanishStopWords.filter(word => lowerSummary.includes(word));

        if (matches.length >= 3 && isDev) {
            console.warn("[TCM Adapter] WARNING: Potential Spanish content detected in summary_notes.", {
                matches,
                preview: narrative.summary_notes.slice(0, 100)
            });
        }
    }

    // Patient Identity Fallbacks (Trusted context fields)
    if (!patient.full_name) {
        patient.full_name = raw.patient_name || raw.meta?.patientName || raw.context?.patient_name || "";
    }
    if (!patient.dob) {
        patient.dob = raw.patient_dob || raw.meta?.patientDob || raw.context?.patient_dob || "";
    }

    // 4. POS Combination (Code - Description)
    if (encounter.pos && encounter.pos !== "—") {
        const desc = encounter.pos_description || encounter.service_location;
        if (desc && desc !== "—" && desc !== encounter.pos) {
            encounter.pos_full = `${encounter.pos} - ${desc}`;
        } else {
            encounter.pos_full = encounter.pos;
        }
    }

    // 5. Time Formatting Consistency (12-hour)
    const formatTime12h = (timeStr: string) => {
        if (!timeStr || timeStr === "—") return "—";
        // If already has AM/PM, leave it
        if (/am|pm/i.test(timeStr)) return timeStr.toUpperCase();

        // Handle HH:mm or HH:mm:ss
        const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours}:${minutes} ${ampm}`;
        }
        return timeStr;
    };

    if (encounter.time_in) encounter.time_in = formatTime12h(encounter.time_in);
    if (encounter.time_out) encounter.time_out = formatTime12h(encounter.time_out);

    // 6. Service Focus Title Case
    const toTitleCase = (str: string) => {
        if (!str || str === "—") return "—";
        const acronyms = ["TCM", "ID", "DOS", "POS", "EMR", "ICD-10", "ICD10"];
        return str.split(' ').map(word => {
            const upper = word.toUpperCase();
            if (acronyms.includes(upper)) return upper;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    };

    if (services.service_focus_title) {
        // Only transform if it looks like it's all caps
        if (services.service_focus_title === services.service_focus_title.toUpperCase()) {
            services.service_focus_title = toTitleCase(services.service_focus_title);
        }
    }

    // 7. Staff Header Fallbacks from Signatures (Robust + Consistent)
    const getStaffInfo = (type: 'case_manager' | 'supervisor') => {
        const sig = signatures[type] || {};
        const name = sig.label || sig.name || signatures[`${type}_name`] || staff[`${type}_name`] || "";
        const license = sig.license || sig.lic || signatures[`${type}_lic`] || staff[`${type}_lic`] || "";
        return { name, license };
    };

    const cmInfo = getStaffInfo('case_manager');
    const supInfo = getStaffInfo('supervisor');

    staff.case_manager_name = cmInfo.name;
    staff.case_manager_lic = cmInfo.license;
    staff.supervisor_name = supInfo.name;
    staff.supervisor_lic = supInfo.license;

    // 8. Narrative De-duplication (v3)
    // Strip repetitions of POS, Time, and Location from clinical narratives
    const factsToStrip: string[] = [];
    if (encounter.pos && encounter.pos !== "—") factsToStrip.push(encounter.pos);
    if (encounter.pos_description && encounter.pos_description !== "—") factsToStrip.push(encounter.pos_description);
    if (encounter.service_location && encounter.service_location !== "—") factsToStrip.push(encounter.service_location);
    if (encounter.time_in && encounter.time_in !== "—") factsToStrip.push(encounter.time_in);
    if (encounter.time_out && encounter.time_out !== "—") factsToStrip.push(encounter.time_out);
    if (encounter.dos_date && encounter.dos_date !== "—") factsToStrip.push(encounter.dos_date);

    const factPatterns = factsToStrip.flatMap(fact => {
        const escaped = fact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return [
            // Look for "at [location]", "on [date]", "at [time]" or variants
            new RegExp(`\\s*(at|on|in|during|the|location:?|pos:?)\\s*${escaped}[\\.,]?\\s*`, 'gi'),
            new RegExp(`^${escaped}[\\.,]?\\s*`, 'gi')
        ];
    });

    narrativeFields.forEach(field => {
        if (narrative[field]) {
            let text = narrative[field].trim();
            factPatterns.forEach(pattern => {
                text = text.replace(pattern, ' ').trim();
            });
            // Cleanup double spaces/punctuation
            text = text.replace(/\s+/g, ' ').replace(/\s+[\.,]/g, '.').replace(/\.{2,}/g, '.');
            if (text.length > 0) {
                text = text.charAt(0).toUpperCase() + text.slice(1);
            }
            narrative[field] = text;
        }
    });

    return applyBaseNormalization({
        ...raw,
        template_id: 'tcm_progress_note',
        encounter,
        patient,
        facility: raw.facility || {},
        staff,
        services,
        narrative,
        diagnosis,
        signatures,
        meta: {
            ...(raw.meta || {}),
            template_id: 'tcm_progress_note'
        }
    });
};

/**
 * Merges multiple normalized ClioNotes into a single joint note.
 * Retains the individual service blocks in `joint_services` array for visual rendering.
 * Aggregates global totals and combined narrative for Outcome and Next Steps.
 */
export const mergeJointNotes = (notes: ClioNote[]): ClioNote => {
    if (!notes || notes.length === 0) return {} as ClioNote;
    if (notes.length === 1) return notes[0];

    // Clone the first note to serve as the master container
    const baseNote = JSON.parse(JSON.stringify(notes[0])) as ClioNote;

    // Attach all original individual notes (including the first one) to joint_services
    baseNote.joint_services = JSON.parse(JSON.stringify(notes));

    let totalDuration = 0;

    let jointOutcome = `${baseNote.narrative?.outcome_of_services || ''}`;
    let jointNextSteps = `${baseNote.narrative?.next_steps || ''}`;
    
    totalDuration += parseInt(baseNote.encounter?.duration_minutes?.toString() || baseNote.encounter?.duration?.toString() || "0", 10) || 0;

    const existingDiagnoses = new Set((baseNote.diagnoses || []).map(d => d.name.toLowerCase()));

    for (let i = 1; i < notes.length; i++) {
        const note = notes[i];
        
        // Accumulate time/units
        const duration = parseInt(note.encounter?.duration_minutes?.toString() || note.encounter?.duration?.toString() || "0", 10) || 0;
        totalDuration += duration;
        
        // Combine Outcome and Next Steps globally
        if (note.narrative?.outcome_of_services && note.narrative.outcome_of_services !== "—") {
            jointOutcome += jointOutcome ? `\n\n${note.narrative.outcome_of_services}` : note.narrative.outcome_of_services;
        }
        if (note.narrative?.next_steps && note.narrative.next_steps !== "—") {
            jointNextSteps += jointNextSteps ? `\n\n${note.narrative.next_steps}` : note.narrative.next_steps;
        }
        
        // Merge diagnoses uniquely
        if (note.diagnoses && Array.isArray(note.diagnoses)) {
            note.diagnoses.forEach(diag => {
                if (diag.name && !existingDiagnoses.has(diag.name.toLowerCase())) {
                    if (!baseNote.diagnoses) baseNote.diagnoses = [];
                    baseNote.diagnoses.push(diag);
                    existingDiagnoses.add(diag.name.toLowerCase());
                }
            });
        }
    }

    if (!baseNote.encounter) baseNote.encounter = {} as any;
    baseNote.encounter.duration_minutes = totalDuration.toString();
    baseNote.encounter.duration = totalDuration.toString();
    
    // Recalculate 15-minute units if > 0
    if (totalDuration > 0) {
        baseNote.encounter.units = Math.ceil(totalDuration / 15).toString();
    }

    if (!baseNote.narrative) baseNote.narrative = {};
    baseNote.narrative.outcome_of_services = jointOutcome.trim();
    baseNote.narrative.next_steps = jointNextSteps.trim();

    // Clear main summary_notes so it doesn't duplicate the first service
    // if any external logic depends on it, but the UI will read from joint_services.
    // We leave it as the first service's summary to avoid breaking older shells
    
    return baseNote;
};
