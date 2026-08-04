const PDF_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/medical-note';
const TCM_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-note';
const TCM_ASSESSMENT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-assessment-note';
const TCM_SERVICE_PLAN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-service-plan-note';
const TCM_INITIAL_HOME_VISIT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-initial-home-visit-note';
const TCM_COLLATERAL_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-collateral-note';
const TCM_SERVICE_PLAN_DISCUSSION_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-service-plan-discussion';
const TCM_HURRICANE_ADDENDUM_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-hurricane-addendum-note';
const TCM_HURRICANE_UPDATE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-hurricane-update-note';
const TCM_STS_COMPLETE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-sts-complete-note';
const TCM_STS_COLLECT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-sts-collect-note';
const TCM_STS_SUBMIT_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-sts-submit-note';
const TCM_DPP_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-dpp-obtain-note';
const TCM_DPP_COMPLETE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-dpp-complete-note';
const TCM_DPP_SUBMIT_PCP_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-dpp-submit-pcp-note';
const TCM_MHV_PROVIDE_DONATION_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-mhv-provide-donation-note';
const TCM_DONATION_OBTAIN_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-donation-obtain-note';
const TCM_VACCINATION_ASSISTANCE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-vaccination-assistance-note';
const TCM_PROVIDER_APPT_COORD_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-provider-appt-coord-note';
const TCM_USCIS_ASSISTANCE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-uscis-assistance-note';
const TCM_HOUSING_ASSISTANCE_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/tcm-housing-assistance-note';
const SYNTHESIS_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/nextSteps';

// Minimal interface for the data we expect from/to the webhook
export interface ClinicalNoteData {
    patient_name?: string;
    patient_dob?: string;
    context?: string;
    sections_by_title?: Record<string, string>;
    [key: string]: any;
}

export type PDFResponse =
    | { mode: 'pdf'; url: string; blob: Blob; data?: ClinicalNoteData }
    | { mode: 'url'; url: string; data?: ClinicalNoteData };

export const PDFService = {
    /**
     * Sends audio/metadata (FormData) to the server.
     */
    generatePDF: async (formData: FormData, options?: { template_id?: string; patient_id?: string }, signal?: AbortSignal): Promise<PDFResponse> => {
        let url = PDF_WEBHOOK_URL;
        if (options?.template_id === 'tcm_progress_note') {
            url = TCM_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_assessment_note') {
            url = TCM_ASSESSMENT_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_service_plan_note') {
            url = TCM_SERVICE_PLAN_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_initial_home_visit_note') {
            url = TCM_INITIAL_HOME_VISIT_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_collateral_note') {
            url = TCM_COLLATERAL_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_service_plan_discussion') {
            url = TCM_SERVICE_PLAN_DISCUSSION_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_hurricane_addendum_note') {
            url = TCM_HURRICANE_ADDENDUM_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_hurricane_update_note') {
            url = TCM_HURRICANE_UPDATE_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_sts_complete_note') {
            url = TCM_STS_COMPLETE_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_sts_collect_note') {
            url = TCM_STS_COLLECT_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_sts_submit_note') {
            url = TCM_STS_SUBMIT_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_dpp_obtain_note') {
            url = TCM_DPP_OBTAIN_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_dpp_complete_note') {
            url = TCM_DPP_COMPLETE_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_dpp_submit_pcp_note') {
            url = TCM_DPP_SUBMIT_PCP_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_mhv_provide_donation_note') {
            url = TCM_MHV_PROVIDE_DONATION_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_donation_obtain_note') {
            url = TCM_DONATION_OBTAIN_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_vaccination_assistance_note') {
            url = TCM_VACCINATION_ASSISTANCE_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_provider_appt_coord_note') {
            url = TCM_PROVIDER_APPT_COORD_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_uscis_assistance_note') {
            url = TCM_USCIS_ASSISTANCE_WEBHOOK_URL;
        } else if (options?.template_id === 'tcm_housing_assistance_note') {
            url = TCM_HOUSING_ASSISTANCE_WEBHOOK_URL;
        }
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
            outcome: (response.data as any)?.outcome || (response.data as any)?.outcome_of_services || "",
            nextSteps: (response.data as any)?.nextSteps || (response.data as any)?.next_steps || ""
        };
    },

    /**
     * Internal helper to handle the request and response parsing
     */
    _sendRequest: async (body: FormData | string, contentType?: string, signal?: AbortSignal, targetUrl?: string): Promise<PDFResponse> => {
        try {
            const requestUrl = targetUrl || PDF_WEBHOOK_URL;
            console.log("Sending request to:", requestUrl);

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
                const errorText = await response.text();
                throw new Error(errorText || `Server returned ${response.status}`);
            }

            const respContentType = response.headers.get("content-type") || "";

            // Enhanced JSON parsing to handle empty/invalid responses
            if (respContentType.includes("application/json")) {
                const rawText = await response.text();
                if (!rawText || rawText.trim() === "") {
                    // Success but empty body
                    return { mode: 'url', url: '', data: {} as any } as PDFResponse;
                }

                try {
                    const data = JSON.parse(rawText);
                    const pdfUrl = data.pdf_url || data.url || '';

                    return {
                        mode: 'url',
                        url: pdfUrl,
                        data: data
                    } as PDFResponse;
                } catch (e) {
                    console.warn("Server returned application/json but content was not valid JSON. Falling back to empty response.");
                    return { mode: 'url', url: '', data: {} as any } as PDFResponse;
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

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn("Request was aborted by signal.");
                throw error;
            }
            console.error("PDF Generation Failed:", error);
            throw error;
        }
    }
};
