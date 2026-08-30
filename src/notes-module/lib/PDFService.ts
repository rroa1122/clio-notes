const PDF_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/medical-note';
const TCM_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-note';
const TCM_CASE_ASSIGNMENT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-case-assignment-note';
const TCM_ASSESSMENT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-assessment-note';
const TCM_ADULT_CERTIFICATION_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-adult-certification-note';
const TCM_SERVICE_PLAN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-service-plan-note';
const TCM_INITIAL_HOME_VISIT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-initial-home-visit-note';
const TCM_COLLATERAL_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-collateral-note';
const TCM_GATHER_PCP_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-gather-pcp-note';
const TCM_GATHER_PSY_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-gather-psy-note';
const TCM_PC_EMERGENCY_CONTACT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-pc-emergency-contact-note';
const TCM_SERVICE_PLAN_DISCUSSION_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-service-plan-discussion';
const TCM_HURRICANE_ADDENDUM_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-hurricane-addendum-note';
const TCM_HURRICANE_UPDATE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-hurricane-update-note';
const TCM_STS_COMPLETE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-sts-complete-note';
const TCM_STS_COLLECT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-sts-collect-note';
const TCM_STS_SUBMIT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-sts-submit-note';
const TCM_DPP_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-dpp-obtain-note';
const TCM_DPP_COMPLETE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-dpp-complete-note';
const TCM_DPP_SUBMIT_PCP_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-dpp-submit-pcp-note';

const TCM_DONATION_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-donation-obtain-note';
const TCM_CLEANING_DONATION_GATHER_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-cleaning-donation-gather-note';
const TCM_CLEANING_DONATION_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-cleaning-donation-obtain-note';
const TCM_CLOTHING_DONATION_GATHER_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-clothing-donation-gather-note';
const TCM_CLOTHING_DONATION_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-clothing-donation-obtain-note';
const TCM_FOOD_DONATION_GATHER_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-food-donation-gather-note';
const TCM_FOOD_DONATION_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-food-donation-obtain-note';
const TCM_VACCINATION_ASSISTANCE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-vaccination-assistance-note';
const TCM_PROVIDER_APPT_COORD_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-provider-appt-coord-note';
const TCM_USCIS_ASSISTANCE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-uscis-assistance-note';
const TCM_HOUSING_ASSISTANCE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-housing-assistance-note';
const TCM_SNAP_RECERTIFICATION_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-snap-recertification-note';
const TCM_MHV_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-mhv-note';
const SYNTHESIS_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/nextSteps';

const TCM_VACCINE_UPDATE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-vaccine-update-note';
const TCM_VACCINE_COORD_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-vaccine-coord-note';
const TCM_VACCINE_ASSIST_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-vaccine-assist-note';
const TCM_HURRICANE_ADDENDUM_DISCUSS_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-hurricane-addendum-discuss-note';
const TCM_HURRICANE_UPDATE_DISCUSS_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-hurricane-update-discuss-note';
const TCM_OTC_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-otc-obtain-note';
const TCM_OTC_COMPLETE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-otc-complete-note';
const TCM_OTC_SUBMIT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-otc-submit-note';

const TEMPLATE_WEBHOOK_URLS: Record<string, string> = {
    tcm_progress_note: TCM_WEBHOOK_URL,
    tcm_case_assignment_note: TCM_CASE_ASSIGNMENT_WEBHOOK_URL,
    tcm_assessment_note: TCM_ASSESSMENT_WEBHOOK_URL,
    tcm_adult_certification_note: TCM_ADULT_CERTIFICATION_WEBHOOK_URL,
    tcm_service_plan_note: TCM_SERVICE_PLAN_WEBHOOK_URL,
    tcm_initial_home_visit_note: TCM_INITIAL_HOME_VISIT_WEBHOOK_URL,
    tcm_collateral_note: TCM_COLLATERAL_WEBHOOK_URL,
    tcm_gather_pcp_note: TCM_GATHER_PCP_WEBHOOK_URL,
    tcm_gather_psy_note: TCM_GATHER_PSY_WEBHOOK_URL,
    tcm_pc_emergency_contact_note: TCM_PC_EMERGENCY_CONTACT_WEBHOOK_URL,
    tcm_service_plan_discussion: TCM_SERVICE_PLAN_DISCUSSION_WEBHOOK_URL,
    tcm_hurricane_addendum_note: TCM_HURRICANE_ADDENDUM_WEBHOOK_URL,
    tcm_hurricane_addendum_discuss_note: TCM_HURRICANE_ADDENDUM_DISCUSS_WEBHOOK_URL,
    tcm_hurricane_update_note: TCM_HURRICANE_UPDATE_WEBHOOK_URL,
    tcm_hurricane_update_discuss_note: TCM_HURRICANE_UPDATE_DISCUSS_WEBHOOK_URL,
    tcm_sts_complete_note: TCM_STS_COMPLETE_WEBHOOK_URL,
    tcm_sts_collect_note: TCM_STS_COLLECT_WEBHOOK_URL,
    tcm_sts_submit_note: TCM_STS_SUBMIT_WEBHOOK_URL,
    tcm_dpp_obtain_note: TCM_DPP_OBTAIN_WEBHOOK_URL,
    tcm_dpp_complete_note: TCM_DPP_COMPLETE_WEBHOOK_URL,
    tcm_dpp_submit_pcp_note: TCM_DPP_SUBMIT_PCP_WEBHOOK_URL,

    tcm_donation_obtain_note: TCM_DONATION_OBTAIN_WEBHOOK_URL,
    tcm_cleaning_donation_gather_note: TCM_CLEANING_DONATION_GATHER_WEBHOOK_URL,
    tcm_cleaning_donation_obtain_note: TCM_CLEANING_DONATION_OBTAIN_WEBHOOK_URL,
    tcm_clothing_donation_gather_note: TCM_CLOTHING_DONATION_GATHER_WEBHOOK_URL,
    tcm_clothing_donation_obtain_note: TCM_CLOTHING_DONATION_OBTAIN_WEBHOOK_URL,
    tcm_food_donation_gather_note: TCM_FOOD_DONATION_GATHER_WEBHOOK_URL,
    tcm_food_donation_obtain_note: TCM_FOOD_DONATION_OBTAIN_WEBHOOK_URL,
    tcm_vaccination_assistance_note: TCM_VACCINE_ASSIST_WEBHOOK_URL,
    tcm_vaccine_update_note: TCM_VACCINE_UPDATE_WEBHOOK_URL,
    tcm_vaccine_coord_note: TCM_VACCINE_COORD_WEBHOOK_URL,
    tcm_vaccine_assist_note: TCM_VACCINE_ASSIST_WEBHOOK_URL,
    tcm_otc_obtain_note: TCM_OTC_OBTAIN_WEBHOOK_URL,
    tcm_otc_complete_note: TCM_OTC_COMPLETE_WEBHOOK_URL,
    tcm_otc_submit_note: TCM_OTC_SUBMIT_WEBHOOK_URL,
    tcm_provider_appt_coord_note: TCM_PROVIDER_APPT_COORD_WEBHOOK_URL,
    tcm_uscis_assistance_note: TCM_USCIS_ASSISTANCE_WEBHOOK_URL,
    tcm_housing_assistance_note: TCM_HOUSING_ASSISTANCE_WEBHOOK_URL,
    tcm_snap_recertification_note: TCM_SNAP_RECERTIFICATION_WEBHOOK_URL,
    tcm_mhv_note: TCM_MHV_WEBHOOK_URL,
    tcm_ltc_phase1_note: TCM_WEBHOOK_URL,
    tcm_ltc_phase2_note: TCM_WEBHOOK_URL,
    tcm_ltc_phase3_note: TCM_WEBHOOK_URL,
    tcm_ltc_phase4_note: TCM_WEBHOOK_URL,
};

export const getWebhookUrl = (templateId?: string): string =>
    (templateId && TEMPLATE_WEBHOOK_URLS[templateId]) || PDF_WEBHOOK_URL;

export class PDFServiceError extends Error {
    public readonly code: 'HTTP_ERROR' | 'EMPTY_RESPONSE' | 'INVALID_JSON' | 'REQUEST_FAILED';
    public readonly status?: number;

    constructor(
        code: 'HTTP_ERROR' | 'EMPTY_RESPONSE' | 'INVALID_JSON' | 'REQUEST_FAILED',
        message: string,
        status?: number,
    ) {
        super(message);
        this.name = 'PDFServiceError';
        this.code = code;
        this.status = status;
    }
}

export const getPDFServiceErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.name === 'AbortError') {
        return 'The note request timed out. Nothing was saved; please try again.';
    }
    if (error instanceof PDFServiceError) {
        if (error.code === 'EMPTY_RESPONSE' || error.code === 'INVALID_JSON') {
            return 'The note service returned an incomplete response. Nothing was saved; please try again.';
        }
        if (error.code === 'HTTP_ERROR') {
            return `The note service is unavailable${error.status ? ` (HTTP ${error.status})` : ''}. Nothing was saved; please try again.`;
        }
        return error.message;
    }
    return 'Could not generate the document. Nothing was saved; please try again.';
};

// Minimal interface for the data we expect from/to the webhook
export interface ClinicalNoteData {
    id?: string;
    patient_name?: string;
    patient_dob?: string;
    context?: string;
    sections_by_title?: Record<string, string>;
    patientName?: string;
    patientDob?: string;
    template_text?: string;
    templateText?: string;
    template_id?: string;
    template_version?: string;
    provider_name?: string;
    providerName?: string;
    transcript?: string;
    raw_model_text?: string;
    text?: string;
    noteText?: string;
    outcome?: string;
    outcome_of_services?: string;
    nextSteps?: string;
    next_steps?: string;
    note?: {
        fields?: {
            patient_name?: string;
            patient_dob?: string;
            context?: string;
            template_text?: string;
            provider_name?: string;
        };
        meta?: {
            template_id?: string;
            template_version?: string;
        };
    };
    patient?: {
        full_name?: string;
        dob?: string;
        context?: string;
    };
    [key: string]: unknown;
}

export type PDFResponse =
    | { mode: 'pdf'; url: string; blob: Blob; data?: ClinicalNoteData }
    | { mode: 'url'; url: string; data?: ClinicalNoteData };

export const PDFService = {
    /**
     * Sends audio/metadata (FormData) to the server.
     */
    generatePDF: async (formData: FormData, options?: { template_id?: string; patient_id?: string }, signal?: AbortSignal): Promise<PDFResponse> => {
        const url = getWebhookUrl(options?.template_id);
        return PDFService._sendRequest(formData, undefined, signal, url);
    },

    /**
     * Sends updated JSON data to the server to regenerate the PDF.
     */
    regeneratePDF: async (jsonData: ClinicalNoteData, signal?: AbortSignal): Promise<PDFResponse> => {
        // Extract patient info from various possible locations in the data structure
        const noteFields = jsonData.note?.fields || {};
        const patientObj = jsonData.patient || {};

        const patient_name = jsonData.patient_name || noteFields.patient_name || patientObj.full_name || jsonData.patientName || "";
        const patient_dob = jsonData.patient_dob || noteFields.patient_dob || patientObj.dob || jsonData.patientDob || "";
        const context = jsonData.context || noteFields.context || patientObj.context || "";
        const template_text = jsonData.template_text || noteFields.template_text || jsonData.templateText || "";
        const provider_name = jsonData.provider_name || noteFields.provider_name || jsonData.providerName || "";

        // Restructure payload to match n8n expectation: { text, body: { patient_name, patient_dob, context } }
        const payload = {
            text: jsonData.transcript || jsonData.raw_model_text || jsonData.text || jsonData.noteText || "",
            body: {
                patient_name,
                patient_dob,
                context,
                template_text,
                template_id: jsonData.template_id || jsonData.note?.meta?.template_id || "",
                template_version: jsonData.template_version || jsonData.note?.meta?.template_version || "",
                provider_name
            }
        };

        return PDFService._sendRequest(JSON.stringify(payload), 'application/json', signal, PDF_WEBHOOK_URL);
    },

    /**
     * Sends joint note outcomes and next steps to be synthesized by an LLM.
     */
    synthesizeJointNote: async (outcomes: string[], nextSteps: string[], signal?: AbortSignal): Promise<{ outcome: string; nextSteps: string }> => {
        const payload = {
            outcomes,
            next_steps: nextSteps
        };

        const response = await PDFService._sendRequest(
            JSON.stringify(payload),
            'application/json',
            signal,
            SYNTHESIS_WEBHOOK_URL
        );

        // n8n should return { outcome: "...", nextSteps: "..." }
        return {
            outcome: response.data?.outcome || response.data?.outcome_of_services || "",
            nextSteps: response.data?.nextSteps || response.data?.next_steps || ""
        };
    },

    /**
     * Internal helper to handle the request and response parsing
     */
    _sendRequest: async (body: FormData | string, contentType?: string, signal?: AbortSignal, targetUrl?: string): Promise<PDFResponse> => {
        try {
            const requestUrl = targetUrl || PDF_WEBHOOK_URL;

            const headers: HeadersInit = {};
            if (contentType) {
                headers['Content-Type'] = contentType;
            }

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers,
                body,
                signal
            });

            if (!response.ok) {
                throw new PDFServiceError(
                    'HTTP_ERROR',
                    `The note service returned HTTP ${response.status}.`,
                    response.status,
                );
            }

            const respContentType = response.headers.get("content-type") || "";

            // Enhanced JSON parsing to handle empty/invalid responses
            if (respContentType.includes("application/json")) {
                const rawText = await response.text();
                if (!rawText || rawText.trim() === "") {
                    throw new PDFServiceError(
                        'EMPTY_RESPONSE',
                        'The note service returned an empty response.',
                        response.status,
                    );
                }

                try {
                    const data = JSON.parse(rawText);
                    const pdfUrl = data.pdf_url || data.url || '';

                    return {
                        mode: 'url',
                        url: pdfUrl,
                        data: data
                    } as PDFResponse;
                } catch (error) {
                    if (error instanceof PDFServiceError) throw error;
                    throw new PDFServiceError(
                        'INVALID_JSON',
                        'The note service returned an invalid JSON response.',
                        response.status,
                    );
                }
            }

            // Binary PDF fallback
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            return {
                mode: 'pdf',
                url,
                blob
            } as PDFResponse;

        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn("Request was aborted by signal.");
                throw error;
            }
            if (error instanceof PDFServiceError) {
                console.error(`PDF generation failed (${error.code}).`);
                throw error;
            }
            console.error('PDF generation failed (REQUEST_FAILED).');
            throw new PDFServiceError(
                'REQUEST_FAILED',
                'Unable to reach the note service. Please try again.',
            );
        }
    }
};
