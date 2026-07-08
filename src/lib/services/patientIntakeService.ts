import type { Patient } from '../../notes-module/lib/storage';

const N8N_WEBHOOK_URL = 'https://n8n.clinicflow.dev/webhook/pacienteinfo';

function formatDobToIso(dobStr: string | null | undefined): string | null {
    if (!dobStr) return null;
    const parts = dobStr.split('/');
    if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        if (year.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    try {
        const d = new Date(dobStr);
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (_) {}
    return dobStr;
}

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
    
    // Si n8n devuelve un array con el item (comportamiento estándar de n8n webhooks)
    if (Array.isArray(rawData) && rawData.length > 0) {
        content = rawData[0];
    }
    
    // Si viene envuelto en la clave 'json'
    if (content && content.json) {
        content = content.json;
    }
    
    // Si viene envuelto en message.content (estructura heredada de OpenAI)
    if (content && content.message?.content) {
        content = content.message.content;
    }

    // Fallback si los datos ya venían planos
    if (content && !content.patient && content.full_name) {
        return content as Partial<Patient>;
    }


    // Map 'content' to Partial<Patient>
    // Map 'content' to Partial<Patient>
    const patientData: Partial<Patient> = {};

    if (content.patient) {
        patientData.full_name = content.patient.full_name || '';
        patientData.first_name = content.patient.first_name || '';
        patientData.last_name = content.patient.last_name || '';
        patientData.dob = formatDobToIso(content.patient.dob);
        patientData.ssn = content.patient.ssn || '';
        patientData.gender = content.patient.sex || '';
        patientData.race = content.patient.race || '';
        patientData.ethnicity = content.patient.ethnicity || '';
        patientData.preferred_language = content.patient.preferred_language || '';
        patientData.case_number = content.patient.case_number || content.patient.case_no || '';
        patientData.emr_id = content.patient.emr_id || content.patient.account_number || content.patient.acc_no || content.patient.prn || '';
    }

    if (!patientData.case_number) {
        patientData.case_number = content.case_number || content.case_no || '';
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
        patientData.diagnoses = content.diagnoses.current.map((d: any) => d.code ? `${d.code} - ${d.description}` : d.description).join('\n');
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

    // Diagnósticos (Clasificados directamente de n8n o con fallback inteligente)
    const psychConditions: string[] = [];
    const pcpConditions: string[] = [];

    if (content.psychiatric_diagnoses && Array.isArray(content.psychiatric_diagnoses)) {
        content.psychiatric_diagnoses.forEach((d: any) => {
            const txt = d.code ? `${d.code} - ${d.description}` : d.description;
            if (txt) psychConditions.push(txt);
        });
    }
    if (content.medical_diagnoses && Array.isArray(content.medical_diagnoses)) {
        content.medical_diagnoses.forEach((d: any) => {
            const txt = d.code ? `${d.code} - ${d.description}` : d.description;
            if (txt) pcpConditions.push(txt);
        });
    }

    if (psychConditions.length === 0 && pcpConditions.length === 0) {
        const allDiagnoses = [
            ...(content.diagnoses?.current || []),
            ...(content.diagnoses?.historical || [])
        ];
        allDiagnoses.forEach((d: any) => {
            const diagText = d.code ? `${d.code} - ${d.description}` : d.description;
            if (!diagText) return;
            const isPsychDiag = 
                (d.code && d.code.toUpperCase().startsWith('F')) ||
                (d.description && (
                    d.description.toLowerCase().includes('depress') ||
                    d.description.toLowerCase().includes('anxiety') ||
                    d.description.toLowerCase().includes('insomnia') ||
                    d.description.toLowerCase().includes('adhd') ||
                    d.description.toLowerCase().includes('bipolar') ||
                    d.description.toLowerCase().includes('schizo') ||
                    d.description.toLowerCase().includes('cognitive') ||
                    d.description.toLowerCase().includes('dementia') ||
                    d.description.toLowerCase().includes('psych')
                ));
            if (isPsychDiag) {
                psychConditions.push(diagText);
            } else {
                pcpConditions.push(diagText);
            }
        });
    }

    // Medicaciones (Clasificadas directamente de n8n o con fallback inteligente)
    const psychMeds: string[] = [];
    const pcpMeds: string[] = [];

    if (content.psychiatric_medications && Array.isArray(content.psychiatric_medications)) {
        content.psychiatric_medications.forEach((m: any) => {
            const txt = m.sig ? `${m.name} - ${m.sig}` : m.name;
            if (txt) psychMeds.push(txt);
        });
    }
    if (content.medical_medications && Array.isArray(content.medical_medications)) {
        content.medical_medications.forEach((m: any) => {
            const txt = m.sig ? `${m.name} - ${m.sig}` : m.name;
            if (txt) pcpMeds.push(txt);
        });
    }

    if (psychMeds.length === 0 && pcpMeds.length === 0 && content.medications && Array.isArray(content.medications)) {
        const PSYCH_MED_KEYWORDS = [
            'sertraline', 'temazepam', 'escitalopram', 'fluoxetine', 'citalopram', 
            'paroxetine', 'duloxetine', 'venlafaxine', 'amitriptyline', 'nortriptyline', 
            'bupropion', 'mirtazapine', 'trazodone', 'vilazodone', 'aripiprazole', 
            'quetiapine', 'olanzapine', 'risperidone', 'ziprasidone', 'lurasidone', 
            'haloperidol', 'clozapine', 'lithium', 'valproate', 'divalproex', 
            'lamotrigine', 'carbamazepine', 'gabapentin', 'topiramate', 'alprazolam', 
            'clonazepam', 'lorazepam', 'diazepam', 'triazolam', 'buspirone', 
            'hydroxyzine', 'zolpidem', 'eszopiclone', 'zaleplon', 'melatonin', 
            'ramelteon', 'doxepin', 'belsomra', 'methylphenidate', 'amphetamine', 
            'lisdexamfetamine', 'atomoxetine', 'guanfacine', 'clonidine', 'modafinil', 
            'armodafinil', 'trazadone',
            'xanax', 'seroquel', 'zoloft', 'lexapro', 'prozac', 'celexa', 'paxil',
            'effexor', 'cymbalta', 'wellbutrin', 'remeron', 'desyrel', 'abilify',
            'zyprexa', 'risperdal', 'geodon', 'latuda', 'klonopin', 'ativan',
            'valium', 'restoril', 'vistaril', 'ambien', 'lunesta', 'adderall',
            'ritalin', 'concerta', 'vyvanse', 'strattera', 'intuniv', 'depakote',
            'lamictal', 'tegretol', 'neurontin', 'topamax'
        ];
        content.medications.forEach((m: any) => {
            const medText = `${m.name} - ${m.sig}`;
            const isPsychMed = m.name && PSYCH_MED_KEYWORDS.some(kw => m.name.toLowerCase().includes(kw));
            if (isPsychMed) {
                psychMeds.push(medText);
            } else {
                pcpMeds.push(medText);
            }
        });
    }

    if (content.presenting_problems) {
        patientData.presenting_problems = content.presenting_problems;
    } else if (content.subjective?.chief_complaint) {
        patientData.presenting_problems = content.subjective.chief_complaint;
    }

    // Rellenar proveedor con fallback de encounter/facility si n8n no los asignó
    const hasPcpInfo = patientData.pcp_name || patientData.pcp_clinic_name || patientData.pcp_phone || patientData.pcp_address;
    const hasPsychInfo = patientData.psych_name || patientData.psych_phone || patientData.psych_address;

    if (!hasPcpInfo && !hasPsychInfo) {
        const isPsychVisit = 
            (content.encounter?.note_type && content.encounter.note_type.toLowerCase().includes('psych')) ||
            (content.encounter?.encounter_type && content.encounter.encounter_type.toLowerCase().includes('psych')) ||
            (content.subjective?.chief_complaint && content.subjective.chief_complaint.toLowerCase().includes('psych')) ||
            (content.facility?.name && (
                content.facility.name.toLowerCase().includes('mental health') ||
                content.facility.name.toLowerCase().includes('psych')
            ));
        
        if (isPsychVisit) {
            if (!patientData.psych_name) patientData.psych_name = content.encounter?.seen_by || '';
            if (!patientData.psych_phone) patientData.psych_phone = content.facility?.phone || '';
            if (!patientData.psych_address && content.facility) {
                patientData.psych_address = [content.facility.name, content.facility.address].filter(Boolean).join(' - ');
            }
        } else {
            if (!patientData.pcp_name) patientData.pcp_name = content.encounter?.seen_by || '';
            if (!patientData.pcp_clinic_name) patientData.pcp_clinic_name = content.facility?.name || '';
            if (!patientData.pcp_phone) patientData.pcp_phone = content.facility?.phone || '';
            if (!patientData.pcp_address) patientData.pcp_address = content.facility?.address || '';
        }
    }

    // Guardar las condiciones y medicaciones separadas inteligentemente
    if (psychConditions.length > 0) patientData.psych_conditions = psychConditions.join('\n');
    if (pcpConditions.length > 0) patientData.pcp_conditions = pcpConditions.join('\n');
    if (psychMeds.length > 0) patientData.psych_medications = psychMeds.join('\n');
    if (pcpMeds.length > 0) patientData.pcp_medications = pcpMeds.join('\n');

    // Combinar todos los diagnósticos para el Registry Diagnoses del Client tab
    const combinedDiagnoses = [...psychConditions, ...pcpConditions];
    if (combinedDiagnoses.length > 0) {
        patientData.diagnoses = combinedDiagnoses.join('\n');
    }

    return patientData;
}
