export interface NoteSections {
    chiefComplaint: string;
    hpi: string;
    telehealth?: string;
    presencial?: string;
    currentPsychTreatment: string;
    pastPsychHistory: string;
    safetyAssessment: string;
    psychMedicationHistory: string;
    familyMentalIllnessHistory: string;
    relevantMedicalConditions: string;
    obPregnancyHx: string;
    relevantSurgicalProcedures: string;
    allergies: string;
    otherNonPsychMedications: string;
    socialEducationEmploymentLegal: string;
    ros: string;
    objectiveMse: string;
    testScreeningTools: string;
    assessmentDsm5: string;
    planInterventions: string;
    dispositionFollowUp: string;
}

export interface NoteSection {
    title: string;
    body: string;
}

export interface StructuredNote {
    meta: {
        note_type: string;
        encounter_mode: string;
        hipaa_telehealth_consent?: string;
        confidence_overall?: number;
        missing_critical_fields?: string[];
    };
    // --- NEW FIELDS FOR 8-PAGE LAYOUT ---
    chief_complaint?: string;

    patient: {
        full_name: string;
        dob: string;
        age?: string;
        sex?: string;
        phone?: string;
        address?: string;
        account_number?: string;
        insurance?: string; // Legacy simple string
        guarantor?: string;

        // Detailed demographics
        race?: string;
        ethnicity?: string;
        preferred_language?: string;
        status?: string;
        date_of_death?: string;

        // New Sections
        contact_info?: {
            cell_phone?: string;
            home_phone?: string;
            work_phone?: string;
            email?: string;
            preferred_contact?: string;
        };
        family_info?: {
            emergency_contact_name?: string;
            emergency_contact_phone?: string;
            emergency_contact_relation?: string;
        };
    };

    insurance_section?: {
        active_insurance?: {
            payer_name: string;
            plan_name?: string;
            policy_id?: string;
            group_id?: string;
            subscriber_name?: string;
            subscriber_dob?: string;
            relation_to_subscriber?: string;
            effective_date?: string;
        }[];
        inactive_insurance?: any[]; // Placeholder
        payment_info?: {
            responsible_party?: string;
            current_balance?: string;
            copay_due?: string;
        };
    };

    facility?: {
        facility_name: string;
        facility_address?: string;
        facility_phone?: string;
        facility_fax?: string;
    };
    provider: {
        provider_name: string;
        provider_credentials?: string;
    };
    appointment?: {
        date_of_service: string;
        start_time?: string;
        location?: string;
        chief_complaint: string;
        reason_for_appointment?: string[];
    };
    history_of_present_illness?: {
        narrative: string;
        telehealth?: string;
        presencial?: string;
        context?: string;
        presenting_problem?: string;
        duration?: string;
        onset?: string;
        severity?: string;
        associated_symptoms?: string;
        relieving_factors?: string;
        worsening_factors?: string;
        patient_goals_or_requests?: string;
        collateral_information?: string;
    };
    history?: {
        medical_history?: string[];
        past_psychiatric_history?: string[];
        surgical_history?: string[];
        family_history?: string[];
        social_history?: string[];
    };

    // Expanded Allergies
    allergies_detailed?: {
        drug: string[];
        food: string[];
        environmental: string[];
    };

    // Objective Section
    objective?: {
        narrative?: string;
        ros_positives?: string[]; // Review of systems physical findings
    };

    psychiatric_symptoms_checklist?: {
        name: string;
        status: 'present' | 'absent' | 'unknown' | 'not_mentioned';
        description?: string;
        details?: string;
    }[];
    current_medications?: {
        name: string;
        dose: string;
        frequency: string;
        start_date?: string;
        prescriber?: string;
    }[];
    behavioral_history?: any;
    allergies?: string[];
    hospitalizations?: string[];
    review_of_systems?: Array<{
        system: string;
        status: 'present' | 'denied' | 'not_mentioned';
        details?: string;
    }>;
    preventive_medicine?: string[] | string;
    vital_signs?: {
        narrative: string;
        vitals_list?: any[];
    };
    exam: {
        psychiatry_mse?: Record<string, any>;
        physical_exam: {
            narrative: string;
        };
    };
    screenings?: {
        gad7?: {
            total_score: number;
            interpretation: string;
            items: Array<{ question: string; answer: string }>;
        };
        phq9?: {
            total_score: number;
            interpretation: string;
            items: Array<{ question: string; answer: string }>;
        };
    };
    assessments: Array<{
        diagnosis: string;
        icd10?: string;
        primary?: boolean;
        type?: string;
    }>;
    patient_education?: {
        narrative?: string;
    };
    treatment: {
        medication_orders_or_refills?: Array<{
            name: string;
            dose?: string;
            form?: string;
            route?: string;
            frequency?: string;
            sig?: string;
            duration?: string;
            quantity?: string;
            refills?: string;
            pharmacist_notes?: string;
        }>;
        patient_education?: string[];
        preventive_medicine?: string[];
        plan_recommendations_instructions: string;
    };
    follow_up: {
        interval?: string;
        instructions?: string;
    };
    sign_off: {
        electronically_signed_by?: string;
        signed_date?: string;
        signed_time?: string;
        status: string;
        signature_image?: string; // Base64 signature data
    };
    sections_by_title?: Record<string, string>; // NEW: Priority content
    [key: string]: any; // Allow for dynamic fields from n8n
}

export interface Note {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: 'draft' | 'saved';
    meta: {
        patientName: string;
        dob: string;
        provider: string;
        visitDate: string;
        mrn?: string;
        noteType?: string;
    };
    noteType?: string;
    sections: NoteSections;
    transcript: string | null;
    warnings: string[] | null;
    rawResponse?: any;
    noteText?: string;
    final_note_text?: string;
    pdf_url?: string;
    patient_name?: string;
    patient_dob?: string;
    structured_note: StructuredNote | null;
    sections_by_title?: Record<string, string>; // NEW: Priority content from n8n
    dynamic_sections?: NoteSection[];
    signature?: {
        dataUrl: string;
        signedAt: string;
        signerName: string;
        certificateId: string;
        userAgent: string;
        ipAddress?: string;
        contentHash?: string;
    };
    patient_id?: string;
}

export interface Template {
    id: string;          // template_id
    joint_services?: ClioNote[]; // Future/Custom fields
    version: string;     // template_version
    name: string;        // display_name
    content: string;     // prompt/template text
    category: string;
    definition?: string; // JSON layout definition (stringified for easier storage/editing)
    is_public?: boolean;
}

export interface AppSettings {
    webhookUrl: string;
    saveWebhookUrl: string;
    providers: string[];
    mockMode: boolean;
}

export interface ClioNote {
    patient: {
        full_name: string;
        dob: string;
        age: string | number;
        sex_at_birth: string;
        address?: string;
        phone?: string;
        mobile?: string;
        account_number?: string;
        case_no?: string;
        insurance?: string;
    };
    encounter: {
        mode: string;
        dos_date?: string;
        time_in?: string;
        time_out?: string;
        pos?: string;
        pos_full?: string;
        duration?: string;
        duration_minutes?: string | number;
        units?: string | number;
    };
    facility?: {
        name?: string;
        facility_name?: string;
        address?: string;
        facility_address?: string;
        phone?: string;
        facility_phone?: string;
        fax?: string;
        facility_fax?: string;
        email?: string;
        facility_email?: string;
    };
    meta: {
        template_id: string;
        template_version: string;
        confidence_overall: number;
        context: string;
        warnings: string[];
        missing_fields: string[];
        provider?: string;
        visitDate?: string;
        visit_date?: string;
    };
    staff?: {
        case_manager_name?: string;
        case_manager_lic?: string;
        supervisor_name?: string;
        supervisor_lic?: string;
        cm_signed_date?: string;
        sup_signed_date?: string;
    };
    provider?: {
        provider_name?: string;
        provider_credentials?: string;
    };
    appointment?: {
        date_of_service?: string;
        start_time?: string;
        end_time?: string;
        location?: string;
        service_focus_title?: string;
    };
    hpi: {
        chief_complaint: string;
        narrative: string;
        facts: {
            presenting_problems: string[];
            current_psych_meds: Array<{
                name: string;
                dose: string;
                sig: string;
                adherence: string;
            }>;
            safety: {
                si: { status: string; details: string };
                hi: { status: string; details: string };
                psychosis: { status: string; details: string };
            };
        };
    };
    ros: {
        positive: string[];
    };
    mse: {
        appearance: string;
        mood: string;
        affect: string;
        thought_process: string;
        thought_content: string;
        cognition: string;
        insight_judgment: string;
        [key: string]: string;
    };
    screenings: Array<{
        name: string;
        score: string | number;
        performed: "yes" | "no";
    }>;
    assessment_dsm5: string[];
    plan: {
        pharmacological: {
            start: string[];
            continue: string[];
            switch: string[];
            discontinue: string[];
        };
        follow_up_weeks: number | string;
    };
    current_psychiatric_treatment?: string;
    past_psychiatric_history?: string;
    past_psych_hospitalizations?: string;
    psychiatric_medication_history?: string;
    family_mental_illness_history?: string;
    medical_conditions?: string;
    relevant_surgical_procedures?: string;
    other_non_psych_meds?: string;
    social_history?: {
        marital_status?: string;
        children?: string;
        education?: string;
        employment?: string;
        living_situation?: string;
        substance_use?: string;
        nicotine_use?: string;
        trauma_history?: string;
        legal_history?: string;
    };
    narrative?: {
        summary_notes?: string;
        outcome_of_services?: string;
        next_steps?: string;
    };
    diagnosis?: Array<{
        name: string;
        icd10?: string;
        type?: string;
    }>;
    diagnoses?: Array<{
        name: string;
        icd10?: string;
        type?: string;
    }>;
    patient_id?: string;
    signatures?: Record<string, any>;
    joint_services?: ClioNote[];
}
// --- NEW TYPES FOR CALLS AND APPOINTMENTS ---

export interface Clinic {
    id: string;
    name: string;
    timezone: string;
}

export interface User {
    id: string;
    clinic_id: string;
    name: string;
    email: string;
    role: string;
}

export type CallFlag = "needs_review" | "ok" | "transfer" | "fallback";

export interface Call {
    id: string;
    clinic_id: string;
    start_time: string;
    end_time: string;
    caller_masked: string;
    intent: string;
    outcome: string;
    duration_sec: number;
    minutes: number;
    cost_usd: number;
    transcript: string;
    recording_url: string;
    summary_bullets: string[];
    extracted: {
        patient_name: string;
        requested_date_time: string;
        provider: string;
        reason: string;
    };
    tool_calls: Array<{
        ts: string;
        tool_name: string;
        payload_preview: string;
        result_preview: string;
    }>;
    flags: CallFlag[];
    is_reviewed: boolean;
}

export type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "rescheduled" | "PENDING" | "CONFIRMED";

export interface Appointment {
    id: string;
    clinic_id: string;
    source_call_id: string;
    patient_name: string;
    provider: string;
    start_time: string;
    status: AppointmentStatus;
    created_by_agent: boolean;
    caller_name?: string;
}
