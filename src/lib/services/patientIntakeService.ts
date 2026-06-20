import type { Patient } from '../../notes-module/lib/storage';

const N8N_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/pacienteinfo';

export async function extractPatientData(file: File): Promise<Partial<Patient>> {
    // Determine if we should mock or actually call the webhook.
    // We are now deploying the real logic. The backend n8n flow must return the JSON.
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);

    const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to extract data: ${response.statusText}`);
    }

    const rawData = await response.json();
    
    let content: any = rawData;
    
    // Navigate down if it's the OpenAI array structure
    if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].message?.content) {
        content = rawData[0].message.content;
    } else if (rawData.message?.content) {
        content = rawData.message.content;
    }

    // Fallback si los datos ya venían planos
    if (!content.patient && content.full_name) {
        return content as Partial<Patient>;
    }

    // Map 'content' to Partial<Patient>
    // Map 'content' to Partial<Patient>
    const patientData: Partial<Patient> = {};

    if (content.patient) {
        patientData.full_name = content.patient.full_name || '';
        patientData.dob = content.patient.dob || '';
        patientData.ssn = content.patient.ssn || '';
        patientData.gender = content.patient.sex || '';
        patientData.race = content.patient.race || '';
        patientData.ethnicity = content.patient.ethnicity || '';
        patientData.preferred_language = content.patient.preferred_language || '';
    }

    if (content.contact_information) {
        patientData.phone = content.contact_information.mobile_phone || content.contact_information.home_phone || '';
        patientData.email = content.contact_information.email || '';
        
        const addrParts = [
            content.contact_information.address_line_1,
            content.contact_information.address_line_2,
            content.contact_information.city,
            content.contact_information.state,
            content.contact_information.zip_code
        ].filter(Boolean);
        if (addrParts.length > 0) {
            patientData.address = addrParts.join(', ');
        }
    }

    if (content.family_information) {
        patientData.emergency_contact_name = content.family_information.next_of_kin || '';
        patientData.emergency_contact_relation = content.family_information.relation_to_patient || '';
        patientData.emergency_contact_phone = content.family_information.phone || '';
    }

    if (content.insurance?.primary_payer) {
        patientData.insurance_company = content.insurance.primary_payer.payer || '';
        patientData.insurance_id = content.insurance.primary_payer.insured_id_number || '';
    }

    if (content.diagnoses?.current && Array.isArray(content.diagnoses.current)) {
        patientData.diagnoses = content.diagnoses.current.map((d: any) => `${d.code} - ${d.description}`).join('\n');
    }

    if (content.subjective?.chief_complaint) {
        patientData.presenting_problems = content.subjective.chief_complaint;
    }

    // Medicaciones
    let medsText = '';
    if (content.medications && Array.isArray(content.medications)) {
        medsText = content.medications.map((m: any) => `${m.name} - ${m.sig}`).join('\n');
    }

    // Mapeo explícito si n8n provee pcp, psych, o pharmacy de forma directa
    if (content.pcp) {
        patientData.pcp_name = content.pcp.name || '';
        patientData.pcp_clinic_name = content.pcp.clinic_name || '';
        patientData.pcp_phone = content.pcp.phone || '';
        patientData.pcp_address = content.pcp.address || '';
    }
    if (content.psychiatrist) {
        patientData.psych_name = content.psychiatrist.name || '';
        patientData.psych_phone = content.psychiatrist.phone || '';
        patientData.psych_address = content.psychiatrist.address || '';
    }
    if (content.pharmacy) {
        patientData.pharmacy_name = content.pharmacy.name || '';
        patientData.pharmacy_phone = content.pharmacy.phone || '';
        patientData.pharmacy_fax = content.pharmacy.fax || '';
        patientData.pharmacy_address = content.pharmacy.address || '';
    }

    // Identificar de qué tipo de consulta viene (del facility/encounter) para rellenar inteligentemente
    const isPsychVisit = content.encounter?.note_type?.toLowerCase().includes('psych');
    
    if (isPsychVisit) {
        if (!patientData.psych_name) patientData.psych_name = content.encounter?.seen_by || '';
        if (!patientData.psych_phone) patientData.psych_phone = content.facility?.phone || '';
        if (!patientData.psych_address && content.facility) {
            patientData.psych_address = [content.facility.name, content.facility.address].filter(Boolean).join(' - ');
        }
        if (!patientData.psych_medications) patientData.psych_medications = medsText;
        if (!patientData.psych_conditions) patientData.psych_conditions = patientData.diagnoses;
    } else {
        if (!patientData.pcp_name) patientData.pcp_name = content.encounter?.seen_by || '';
        if (!patientData.pcp_clinic_name) patientData.pcp_clinic_name = content.facility?.name || '';
        if (!patientData.pcp_phone) patientData.pcp_phone = content.facility?.phone || '';
        if (!patientData.pcp_address) patientData.pcp_address = content.facility?.address || '';
        if (!patientData.pcp_medications) patientData.pcp_medications = medsText;
        if (!patientData.pcp_conditions) patientData.pcp_conditions = patientData.diagnoses;
    }

    return patientData;
}
