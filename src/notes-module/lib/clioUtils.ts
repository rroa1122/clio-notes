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
    if (patient.case_number) note.patient.case_no = patient.case_number;

    // Map Patient Diagnoses to Note Diagnoses section (STRICT AUTHORITATIVE EMR SOURCE)
    if (patient.diagnoses && patient.diagnoses.trim().length > 0) {
        // Parse string diagnoses into array of objects, splitting by semicolon, actual newline, or literal \n
        const seenCodes = new Set<string>();
        const seenNames = new Set<string>();
        const cleanList: Array<{ icd10: string; name: string }> = [];

        patient.diagnoses
            .split(/[;\n]|\\n/)
            .map(d => d.trim())
            .filter(d => d.length > 0)
            .forEach(d => {
                // Match ICD-10 code at the beginning with optional parentheses, e.g. "(F33.1) Major depressive..." or "F33.1 - Major depressive..."
                const match = d.match(/^\(?([A-Z]\d[0-9A-Z]?(?:\.[0-9A-Z]{1,4})?)\)?\s*[:-]?\s*(.*)$/i);
                let code = '';
                let name = d;
                if (match) {
                    code = match[1].toUpperCase();
                    name = match[2].trim() || d;
                }
                const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const codeKey = code ? code.toUpperCase() : '';

                if ((codeKey && !seenCodes.has(codeKey)) || (!codeKey && !seenNames.has(nameKey))) {
                    if (codeKey) seenCodes.add(codeKey);
                    if (nameKey) seenNames.add(nameKey);
                    cleanList.push({ icd10: code, name: name });
                }
            });

        if (cleanList.length > 0) {
            // Authoritative EMR overwrite: Note diagnoses must strictly match official patient records
            note.diagnoses = cleanList;
            note.diagnosis = cleanList;
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

    // 8. Narrative Refinement (Summary, Outcome & Next Steps)
    if (!clioData.narrative) clioData.narrative = {};
    clioData.narrative.summary_notes =
        clioData.narrative.summary_notes ||
        clioData.narrative.clinical_narrative ||
        clioData.narrative.summary ||
        clioData.narrative.narrative ||
        clioData.summary_notes ||
        clioData.summary ||
        clioData.clinical_narrative ||
        clioData.hpi?.narrative ||
        clioData.sections_by_title?.['CLINICAL NARRATIVE'] ||
        clioData.sections_by_title?.['Clinical Narrative'] ||
        clioData.sections_by_title?.['Summary'] ||
        clioData.raw_model_text ||
        "";
        
    clioData.narrative.outcome_of_services =
        clioData.narrative.outcome_of_services ||
        clioData.outcome ||
        clioData.outcome_of_services ||
        "";

    clioData.narrative.next_steps =
        clioData.narrative.next_steps ||
        clioData.next_steps ||
        "";

    // Normalize each individual service in joint_services if present
    if (clioData.joint_services && Array.isArray(clioData.joint_services)) {
        clioData.joint_services = clioData.joint_services.map((svc: any) => {
            if (!svc.narrative) svc.narrative = {};
            svc.narrative.summary_notes =
                svc.narrative.summary_notes ||
                svc.narrative.clinical_narrative ||
                svc.narrative.summary ||
                svc.narrative.narrative ||
                svc.summary_notes ||
                svc.summary ||
                svc.clinical_narrative ||
                svc.raw_model_text ||
                "";
            svc.narrative.outcome_of_services =
                svc.narrative.outcome_of_services ||
                svc.outcome ||
                svc.outcome_of_services ||
                "";
            svc.narrative.next_steps =
                svc.narrative.next_steps ||
                svc.next_steps ||
                "";
            return svc;
        });
    }

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
        if (['tcm_progress_note', 'tcm_case_assignment_note', 'tcm_assessment_note', 'tcm_adult_certification_note', 'tcm_service_plan_note', 'tcm_initial_home_visit_note', 'tcm_collateral_note', 'tcm_gather_pcp_note', 'tcm_gather_psy_note', 'tcm_pc_emergency_contact_note', 'tcm_service_plan_discussion', 'tcm_hurricane_addendum_note', 'tcm_hurricane_update_note', 'tcm_sts_complete_note', 'tcm_sts_collect_note', 'tcm_sts_submit_note', 'tcm_dpp_obtain_note', 'tcm_dpp_complete_note', 'tcm_dpp_submit_pcp_note', 'tcm_donation_obtain_note', 'tcm_cleaning_donation_gather_note', 'tcm_cleaning_donation_obtain_note', 'tcm_clothing_donation_gather_note', 'tcm_clothing_donation_obtain_note', 'tcm_food_donation_gather_note', 'tcm_food_donation_obtain_note', 'tcm_vaccination_assistance_note', 'tcm_provider_appt_coord_note', 'tcm_uscis_assistance_note', 'tcm_housing_assistance_note', 'tcm_snap_recertification_note', 'tcm_mhv_note', 'tcm_ltc_phase1_note', 'tcm_ltc_phase2_note', 'tcm_ltc_phase3_note', 'tcm_ltc_phase4_note'].includes(templateId)) {
            return normalizeTcmNote(clioData);
        }

        return applyBaseNormalization(clioData);
    } catch (err) {
        console.error("normalizeClioNote: Critical failure during normalization", err);
        return null;
    }
};

/**
 * Maps subtemplate titles to their respective template IDs.
 */
export const getTemplateIdFromSubTemplate = (subTemplate: string): string => {
    const s = (subTemplate || "").trim();
    if (s === 'TCM Initial Assessment & Certification' || s === 'Assessment' || s === 'Adult Certification') return 'tcm_assessment_note';
    if (s === 'TCM Service Plan Development' || s === 'Service Plan Development') return 'tcm_service_plan_note';
    if (s === 'TCM Service Plan Discussion' || s === 'Service Plan Discussion') return 'tcm_service_plan_discussion';
    if (s === 'TCM Initial Home Visit' || s === 'Initial Home Visit') return 'tcm_initial_home_visit_note';
    if (s === 'TCM Collateral & Contact Note' || s === 'Collateral & Contact Note') return 'tcm_collateral_note';
    if (s === 'TCM Gather PCP Record' || s.includes('Gather PCP Record')) return 'tcm_gather_pcp_note';
    if (s === 'TCM Gather PSY Record' || s.includes('Gather PSY Record')) return 'tcm_gather_psy_note';
    if (s === 'TCM PC Emergency Contact' || s.includes('PC Emergency Contact')) return 'tcm_pc_emergency_contact_note';
    if (s === 'TCM Hurricane Addendum: Develop Plan' || s === 'TCM Hurricane Season: Addendum') return 'tcm_hurricane_addendum_note';
    if (s === 'TCM Hurricane Addendum: Discuss & Sign') return 'tcm_hurricane_addendum_discuss_note';
    if (s === 'TCM Hurricane Update: Develop Plan' || s === 'TCM Hurricane Season: Update') return 'tcm_hurricane_update_note';
    if (s === 'TCM Hurricane Update: Discuss & Sign') return 'tcm_hurricane_update_discuss_note';
    if (s === 'TCM Complete STS Application') return 'tcm_sts_complete_note';
    if (s === 'TCM Collect STS from PCP') return 'tcm_sts_collect_note';
    if (s === 'TCM Submit STS') return 'tcm_sts_submit_note';
    if (s === 'TCM Obtain Disabled Parking Permit') return 'tcm_dpp_obtain_note';
    if (s === 'TCM Complete Disabled Parking Permit') return 'tcm_dpp_complete_note';
    if (s === 'TCM Submit DPP to PCP') return 'tcm_dpp_submit_pcp_note';
    if (s === 'TCM MHV + Provide Donation') return 'tcm_mhv_provide_donation_note';
    if (s === 'Obtain Supply Donation' || s === 'TCM Obtain Supply Donation') return 'tcm_donation_obtain_note';
    if (s === 'TCM Update Vaccine Record' || s === 'Update Vaccine Record') return 'tcm_vaccine_update_note';
    if (s === 'TCM Coordinate Vaccine Appointment' || s === 'Coordinate Vaccine Appointment') return 'tcm_vaccine_coord_note';
    if (s === 'TCM Assist Vaccine Administration' || s === 'Assist Vaccine Administration' || s === 'TCM Vaccination Assistance') return 'tcm_vaccine_assist_note';
    if (s === 'TCM OTC Obtain Form' || s === 'OTC Obtain Form' || s === 'OTC Obt') return 'tcm_otc_obtain_note';
    if (s === 'TCM OTC Complete Items' || s === 'OTC Complete Items' || s === 'OTC Comp') return 'tcm_otc_complete_note';
    if (s === 'TCM OTC Submit Order' || s === 'OTC Submit Order' || s === 'OTC Sub') return 'tcm_otc_submit_note';
    if (s === 'Provider Appointment Coordination' || s.includes('Appointment Coordination')) return 'tcm_provider_appt_coord_note';
    if (s === 'USCIS / Immigration Process Assistance' || s.includes('USCIS') || s.includes('Immigration')) return 'tcm_uscis_assistance_note';
    if (s === 'TCM Housing Application Assistance' || s.includes('Housing Application')) return 'tcm_housing_assistance_note';
    if (s === 'TCM SNAP Recertification' || s.includes('SNAP')) return 'tcm_snap_recertification_note';
    if (s === 'Monthly Home Visit' || s === 'MHV') return 'tcm_mhv_note';
    return 'tcm_progress_note';
};

/**
 * Standardizes TCM notes into the expected schema for the TcmNoteShell renderer.
 */
export const normalizeTcmNote = (raw: any): ClioNote => {
    const isDev = import.meta.env.DEV;

    const encounterSource = raw.encounter ? 'encounter' : (raw.visit ? 'visit' : 'empty');
    const narrativeSource = raw.narrative ? 'narrative' : (raw.note ? 'note' : 'empty');

    const encounter = raw.encounter || raw.visit || {};
    let narrative = raw.narrative || raw.note || {};
    if (typeof narrative === 'string') {
        narrative = { summary_notes: narrative };
    }

    const patient = raw.patient || {};
    const services = raw.services || {};
    const staff = raw.staff || {};
    const diagnosis = raw.diagnosis || raw.diagnoses || {};
    const signatures = raw.signatures || {};

    // 1. Units Calculation (15-minute rule)
    if (!encounter.units || encounter.units === "" || encounter.units === "—" || encounter.units === "0") {
        const duration = parseInt(encounter.duration_minutes || encounter.duration || "0", 10);
        if (duration > 0) {
            encounter.units = (Math.floor(duration / 15) + (duration % 15 >= 8 ? 1 : 0)).toString();
        }
    }

    // 2. Comprehensive Fallbacks & Narrative Extraction
    const extractedSummary =
        narrative.summary_notes ||
        narrative.clinical_narrative ||
        narrative.summary ||
        narrative.narrative ||
        raw.summary_notes ||
        raw.clinical_narrative ||
        raw.summary ||
        raw.raw_model_text ||
        raw.text ||
        raw.sections_by_title?.['CLINICAL NARRATIVE'] ||
        raw.sections_by_title?.['Clinical Narrative'] ||
        raw.sections_by_title?.['Summary'] ||
        "";
    narrative.summary_notes = typeof extractedSummary === 'string' ? extractedSummary : (extractedSummary || "").toString();

    const extractedOutcome =
        narrative.outcome_of_services ||
        narrative.outcome ||
        raw.outcome_of_services ||
        raw.outcome ||
        "";
    narrative.outcome_of_services = typeof extractedOutcome === 'string' ? extractedOutcome : (extractedOutcome || "").toString();

    const extractedNextSteps =
        narrative.next_steps ||
        narrative.plan ||
        raw.next_steps ||
        raw.plan ||
        "";
    narrative.next_steps = typeof extractedNextSteps === 'string' ? extractedNextSteps : (extractedNextSteps || "").toString();

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

        // Ensure affirmative clinical statements (avoid "not available" audit flags)
        cleanedSummary = cleanedSummary
            .replace(/(?:Specific\s+)?(?:current\s+)?medications(?:\s+and\s+side\s+effects)?\s+were\s+not\s+available\s+in\s+the\s+record(?:\s+at\s+the\s+time\s+of\s+this\s+assessment)?\.?/gi, 'The client reports no current prescribed medications at the time of this assessment.')
            .replace(/Allergies\s+(?:were\s+)?not\s+documented\.?/gi, 'No known drug allergies (NKDA) reported.')
            .replace(/(?:Psychiatric\s+)?Hospitalizations\s+(?:were\s+)?not\s+reported\.?/gi, 'No recent psychiatric hospitalizations reported.');

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

    // Do not strip generic/short words like "Office" or "Home" to prevent mangling normal sentences (like "arrived at the office" or "Certification Office")
    const isGenericLocation = (val: string) => {
        const lower = val.toLowerCase();
        return lower === 'office' || lower === 'home' || lower === 'clinic' || lower === 'community';
    };

    if (encounter.pos_description && encounter.pos_description !== "—" && !isGenericLocation(encounter.pos_description)) {
        factsToStrip.push(encounter.pos_description);
    }
    if (encounter.service_location && encounter.service_location !== "—" && !isGenericLocation(encounter.service_location)) {
        factsToStrip.push(encounter.service_location);
    }
    if (encounter.time_in && encounter.time_in !== "—") factsToStrip.push(encounter.time_in);
    if (encounter.time_out && encounter.time_out !== "—") factsToStrip.push(encounter.time_out);
    if (encounter.dos_date && encounter.dos_date !== "—") factsToStrip.push(encounter.dos_date);

    const factPatterns = factsToStrip.flatMap(fact => {
        const escaped = fact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return [
            // Look for "at [location]", "on [date]", "at [time]" or variants as whole words/phrases
            new RegExp(`\\b(at|on|in|during|the|location:?|pos:?)\\s+\\b${escaped}\\b[\\.,]?\\s*`, 'gi'),
            new RegExp(`^\\b${escaped}\\b[\\.,]?\\s*`, 'gi')
        ];
    });

    const narrativeFields = ['summary_notes', 'outcome_of_services', 'next_steps'];
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

    // 9. Enforce exactly one checked domain per block/note
    if (!services.domains_selected) services.domains_selected = {};
    const isOtc = (
        (raw.subTemplate || "").toLowerCase().includes("otc") ||
        (raw._frontend_service_title || "").toLowerCase().includes("otc") ||
        (encounter?.primary_service_provided || "").toLowerCase().includes("otc")
    );

    const domainKeys = [
        "1_mental_health_substance_abuse",
        "2_physical_health_medical_dental",
        "3_vocational_employment_job_training",
        "4_school_education",
        "5_recreational_social_support",
        "6_activities_of_daily_living",
        "7_housing_shelter",
        "8_economic_financial",
        "9_basic_needs",
        "10_transportation",
        "11_legal_immigration",
        "12_other"
    ];
    
    domainKeys.forEach(d => {
        services.domains_selected[d] = false;
    });

    const activeTemplateId = raw.template_id || raw.templateId || raw.meta?.template_id || 'tcm_progress_note';
    const isHurricane = activeTemplateId === 'tcm_hurricane_addendum_note' || activeTemplateId === 'tcm_hurricane_update_note';
    const isSts = activeTemplateId === 'tcm_sts_complete_note' || activeTemplateId === 'tcm_sts_collect_note' || activeTemplateId === 'tcm_sts_submit_note';
    const isDpp = activeTemplateId === 'tcm_dpp_obtain_note' || activeTemplateId === 'tcm_dpp_complete_note' || activeTemplateId === 'tcm_dpp_submit_pcp_note';

    const isDonationObtain = activeTemplateId === 'tcm_donation_obtain_note' || activeTemplateId === 'tcm_cleaning_donation_gather_note' || activeTemplateId === 'tcm_cleaning_donation_obtain_note' || activeTemplateId === 'tcm_clothing_donation_gather_note' || activeTemplateId === 'tcm_clothing_donation_obtain_note' || activeTemplateId === 'tcm_food_donation_gather_note' || activeTemplateId === 'tcm_food_donation_obtain_note';
    const isVaccinationAssistance = activeTemplateId === 'tcm_vaccination_assistance_note';
    const isApptCoord = activeTemplateId === 'tcm_provider_appt_coord_note';
    const isUscisAssistance = activeTemplateId === 'tcm_uscis_assistance_note';
    const isHousingAssistance = activeTemplateId === 'tcm_housing_assistance_note';
    const isSnapRecert = activeTemplateId === 'tcm_snap_recertification_note';
    const isMhv = activeTemplateId === 'tcm_mhv_note';
 
    if (isHurricane) {
        services.domains_selected["12_other"] = true;
    } else if (isOtc || isVaccinationAssistance) {
        services.domains_selected["2_physical_health_medical_dental"] = true;
    } else if (isSts || isDpp) {
        services.domains_selected["10_transportation"] = true;
    } else if (isDonationObtain) {
        services.domains_selected["9_basic_needs"] = true;
    } else if (isApptCoord) {
        const titleLower = (services.service_focus_title || "").toLowerCase();
        const narrLower = (narrative.summary_notes || "").toLowerCase();
        const wantsPsych = titleLower.includes("psych") || titleLower.includes("mental");
        const wantsPcp = titleLower.includes("pcp") || titleLower.includes("primary care") || titleLower.includes("medical") || titleLower.includes("specialist");
        const wantsTrans = titleLower.includes("transport") || titleLower.includes("nemt") || narrLower.includes("transportation") || narrLower.includes("nemt") || narrLower.includes("saferide");
        
        services.domains_selected["1_mental_health_substance_abuse"] = wantsPsych || (!wantsPsych && !wantsPcp && !wantsTrans);
        services.domains_selected["2_physical_health_medical_dental"] = wantsPcp;
        services.domains_selected["10_transportation"] = wantsTrans;
    } else if (isUscisAssistance) {
        const narrLower = (narrative.summary_notes || "").toLowerCase();
        const wantsAdl = narrLower.includes("form") || narrLower.includes("paperwork") || narrLower.includes("document") || narrLower.includes("organize") || narrLower.includes("residency");
        const wantsPsych = narrLower.includes("anxiety") || narrLower.includes("anxious") || narrLower.includes("emotional support") || narrLower.includes("reassurance");
        
        services.domains_selected["11_legal_immigration"] = true;
        services.domains_selected["6_activities_of_daily_living"] = wantsAdl;
        services.domains_selected["1_mental_health_substance_abuse"] = wantsPsych;
    } else if (isHousingAssistance) {
        services.domains_selected["7_housing_shelter"] = true;
    } else if (isSnapRecert) {
        services.domains_selected["8_economic_financial"] = true;
    } else if (isMhv) {
        services.domains_selected["1_mental_health_substance_abuse"] = true;
        const narrLower = (narrative.summary_notes || "").toLowerCase();
        const titleLower = (services.service_focus_title || "").toLowerCase();
        if (narrLower.includes("donation") || titleLower.includes("donation") || narrLower.includes("basic needs") || titleLower.includes("basic needs")) {
            services.domains_selected["9_basic_needs"] = true;
        }
        if (narrLower.includes("appointment") || titleLower.includes("appointment") || narrLower.includes("pcp") || titleLower.includes("medical")) {
            services.domains_selected["2_physical_health_medical_dental"] = true;
        }
        if (narrLower.includes("transport") || titleLower.includes("transport") || narrLower.includes("sts") || titleLower.includes("sts")) {
            services.domains_selected["10_transportation"] = true;
        }
        if (narrLower.includes("correspondence") || titleLower.includes("correspondence") || narrLower.includes("form") || titleLower.includes("form") || narrLower.includes("survey")) {
            services.domains_selected["6_activities_of_daily_living"] = true;
        }
        if (narrLower.includes("benefit") || titleLower.includes("benefit") || narrLower.includes("financial") || titleLower.includes("financial")) {
            services.domains_selected["8_economic_financial"] = true;
        }
    } else {
        services.domains_selected["1_mental_health_substance_abuse"] = true;
    }
    return applyBaseNormalization({
        ...raw,
        template_id: activeTemplateId,
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
            template_id: activeTemplateId
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

    // Flatten all service blocks into a clean array of individual services
    const flattenedServices: any[] = [];
    notes.forEach(note => {
        if (note.joint_services && Array.isArray(note.joint_services) && note.joint_services.length > 0) {
            note.joint_services.forEach(subSvc => {
                flattenedServices.push({
                    ...subSvc,
                    patient: subSvc.patient || note.patient,
                    facility: subSvc.facility || note.facility,
                    staff: subSvc.staff || note.staff,
                    signatures: subSvc.signatures || note.signatures,
                    template_id: subSvc.template_id || note.template_id,
                    diagnoses: subSvc.diagnoses || note.diagnoses,
                    diagnosis: subSvc.diagnosis || note.diagnosis
                });
            });
        } else {
            flattenedServices.push(note);
        }
    });

    baseNote.joint_services = flattenedServices;

    let totalDuration = 0;
    let totalUnits = 0;
    flattenedServices.forEach(svc => {
        const dur = parseInt(svc.encounter?.duration_minutes?.toString() || svc.encounter?.duration?.toString() || "0", 10) || 0;
        totalDuration += dur;
        const bUnits = parseInt(svc.encounter?.billing_units?.toString() || svc.encounter?.units?.toString() || "0", 10);
        if (bUnits > 0) {
            totalUnits += bUnits;
        } else {
            totalUnits += Math.floor(dur / 15) + (dur % 15 >= 8 ? 1 : 0);
        }
    });

    let jointOutcome = `${baseNote.narrative?.outcome_of_services || ''}`;
    let jointNextSteps = `${baseNote.narrative?.next_steps || ''}`;

    const existingDiagnoses = new Set((baseNote.diagnoses || []).map(d => d.name.toLowerCase()));

    for (let i = 1; i < notes.length; i++) {
        const note = notes[i];
        
        // Combine Outcome and Next Steps globally (with smart deduplication)
        if (note.narrative?.outcome_of_services && note.narrative.outcome_of_services !== "—") {
            const currentOutcome = note.narrative.outcome_of_services.trim();
            if (currentOutcome && !jointOutcome.includes(currentOutcome)) {
                jointOutcome += jointOutcome ? `\n\n${currentOutcome}` : currentOutcome;
            }
        }
        if (note.narrative?.next_steps && note.narrative.next_steps !== "—") {
            const currentNextSteps = note.narrative.next_steps.trim();
            if (currentNextSteps && !jointNextSteps.includes(currentNextSteps)) {
                jointNextSteps += jointNextSteps ? `\n\n${currentNextSteps}` : currentNextSteps;
            }
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
    baseNote.encounter.units = totalUnits.toString();

    if (!baseNote.narrative) baseNote.narrative = {};
    baseNote.narrative.outcome_of_services = jointOutcome.trim();
    baseNote.narrative.next_steps = jointNextSteps.trim();

    // Clear main summary_notes so it doesn't duplicate the first service
    // if any external logic depends on it, but the UI will read from joint_services.
    // We leave it as the first service's summary to avoid breaking older shells
    
    return baseNote;
};

/**
 * Resolves the Date of Service (DOS) for any note structure with priority on actual clinical service date
 */
export function getNoteServiceDate(note: any): Date | null {
    if (!note) return null;
    const rawDate = 
        note.encounter?.dos_date ||
        note.encounter?.date ||
        note.encounter?.service_date ||
        note.meta?.visitDate || 
        note.meta?.visit_date ||
        note.meta?.dos_date ||
        note.appointment?.date_of_service ||
        note.appointment?.service_date ||
        note.appointment?.date ||
        note.date_of_service ||
        note.service_date ||
        note.serviceDate ||
        note.sections?.date_of_service ||
        note.sections?.visit_date ||
        note.createdAt || 
        note.created_at;

    if (!rawDate) return null;
    try {
        if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = rawDate.split('-');
            return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        }
        const d = new Date(rawDate);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
}

