/**
 * Case Assignment Clinical Narrative Generator
 * Strictly implements TCM clinical standards:
 * - Single continuous paragraph
 * - Third person, past tense, formal clinical vocabulary
 * - First subject mention: "The Targeted Case Manager (TCM)", subsequent: "the TCM"
 * - First client mention: full name, subsequent: first name
 * - Strict omission of empty/unselected blocks
 */

export interface CaseAssignmentFormData {
    client_full_name: string;
    client_first_name: string;
    client_phone: string;
    client_gender?: 'male' | 'female' | string;
    agency_name: string;
    psychiatric_diagnoses: string[];
    symptoms: string[];
    psychosocial_stressors: string[];
    medical_specialties: string[];
    living_situation: string;
    address: string;
    identified_needs: string[];
    risk_factors: string[];
    blocksEnabled: {
        1: boolean;
        2: boolean;
        3: boolean;
        4: boolean;
        5: boolean;
        6: boolean;
        7: boolean;
        8: boolean;
        9: boolean;
        10: boolean;
        11: boolean;
    };
}

export const DEFAULT_CASE_ASSIGNMENT_FORM: CaseAssignmentFormData = {
    client_full_name: '',
    client_first_name: '',
    client_phone: '',
    client_gender: 'female',
    agency_name: 'Advanced Recovery & Counseling, LLC',
    psychiatric_diagnoses: ['Major Depressive Disorder'],
    symptoms: ['depressive mood', 'persistent anxiety', 'sleep disturbance'],
    psychosocial_stressors: ['limited local support network', 'social isolation'],
    medical_specialties: ['cardiology', 'endocrinology'],
    living_situation: 'alone in an apartment',
    address: '',
    identified_needs: ['care coordination', 'medication adherence support', 'community resources'],
    risk_factors: ['multiple chronic conditions', 'limited social support', 'risk of decompensation'],
    blocksEnabled: {
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
        7: true,
        8: true,
        9: true,
        10: true,
        11: true
    }
};

export const NEXT_STEPS_OPTIONS = [
    {
        id: 'home_visit',
        label: 'Conduct First Home Visit (Default)',
        template: 'TCM will conduct the first home visit to complete the admission and evaluation process.'
    },
    {
        id: 'gather_records',
        label: 'Gather Records at PCP and Psychiatrist',
        template: "TCM will gather information about {{client_first_name}}'s physical and mental conditions at PCP and Psychiatrist offices."
    },
    {
        id: 'coordinate_intake',
        label: 'Coordinate Intake Documentation & Evaluation',
        template: "TCM will coordinate with {{client_first_name}}'s healthcare providers to obtain collateral records and schedule the comprehensive evaluation."
    }
];

export const PRESET_OPTIONS = {
    psychiatric_diagnoses: [
        'Major Depressive Disorder',
        'Generalized Anxiety Disorder',
        'Bipolar Disorder',
        'Insomnia Disorder',
        'Post-Traumatic Stress Disorder',
        'Schizoaffective Disorder',
        'Adjustment Disorder'
    ],
    symptoms: [
        'depressive mood',
        'persistent anxiety',
        'sleep disturbance',
        'cognitive fatigue',
        'emotional lability',
        'panic attacks',
        'anhedonia',
        'appetite fluctuations',
        'psychomotor agitation',
        'social withdrawal'
    ],
    psychosocial_stressors: [
        'limited local support network',
        'social isolation',
        'financial distress',
        'housing instability',
        'language barriers',
        'caregiver burnout',
        'health-related stress'
    ],
    medical_specialties: [
        'cardiology',
        'pulmonology',
        'nephrology',
        'endocrinology',
        'neurology',
        'rheumatology',
        'orthopedics',
        'gastroenterology',
        'oncology'
    ],
    living_situation: [
        'alone in a rented apartment',
        'alone in a condominium',
        'with immediate family',
        'with elderly family members',
        'in an assisted housing community',
        'in a private residence'
    ],
    identified_needs: [
        'care coordination across multiple specialists',
        'reinforcement of medication adherence',
        'connection with community resources',
        'financial and basic needs assistance',
        'emotional stability support',
        'transportation assistance for medical appointments'
    ],
    risk_factors: [
        'elevated fall risk',
        'disabled status',
        'limited social support',
        'complex polypharmacy',
        'cognitive vulnerability',
        'risk of medical or psychiatric decompensation'
    ]
};

const formatList = (items: string[]): string => {
    const clean = items.map(s => s.trim()).filter(Boolean);
    if (clean.length === 0) return '';
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
};

export const generateCaseAssignmentNarrative = (data: CaseAssignmentFormData): string => {
    const isMale = (data.client_gender || '').toLowerCase().startsWith('m');
    const pronSubj = isMale ? 'He' : 'She';
    const pronSubjLower = isMale ? 'he' : 'she';
    const pronPossLower = isMale ? 'his' : 'her';
    const pronReflLower = isMale ? 'himself' : 'herself';

    const fullName = (data.client_full_name || 'the client').trim();
    const firstName = (data.client_first_name || (fullName.split(' ')[0] || 'the client')).trim();
    const phone = (data.client_phone || 'the provided telephone number').trim();
    const agency = (data.agency_name || 'Advanced Recovery & Counseling, LLC').trim();
    const address = (data.address || 'the residential address').trim();
    const living = (data.living_situation || '').trim();

    const sentences: string[] = [];
    let tcmMentionCount = 0;
    const getTcmSubject = () => {
        tcmMentionCount++;
        return tcmMentionCount === 1 ? 'The Targeted Case Manager (TCM)' : 'the TCM';
    };

    // Bloque 1 — Recepción y revisión de la referral
    if (data.blocksEnabled[1]) {
        const tcm = getTcmSubject();
        sentences.push(
            `${tcm} received and reviewed a Case Manager's Referral for a newly assigned case for services. After reviewing the referral with the supervisor, the TCM signed the referral form and began collecting all necessary information required for the admission process. Following this review, the TCM accepted ${fullName}'s case for Targeted Case Management services.`
        );
    }

    // Bloque 2 — Contacto telefónico inicial
    if (data.blocksEnabled[2]) {
        const tcm = getTcmSubject();
        sentences.push(
            `${tcm} successfully contacted ${firstName} by phone at ${phone} and introduced ${pronReflLower} as a Targeted Case Manager from ${agency}. The purpose of the call and the receipt of a referral for Targeted Case Management services were explained.`
        );
    }

    // Bloque 3 — Verificación de duplicidad de servicios
    if (data.blocksEnabled[3]) {
        const tcm = getTcmSubject();
        sentences.push(
            `${tcm} verified whether ${firstName} was currently receiving Targeted Case Management services from another agency, which ${pronSubjLower} denied.`
        );
    }

    // Bloque 4 — Síntomas psiquiátricos reportados
    if (data.blocksEnabled[4]) {
        const diagnosesStr = formatList(data.psychiatric_diagnoses);
        const symptomsStr = formatList(data.symptoms);
        if (diagnosesStr || symptomsStr) {
            let b4 = `During the call, ${firstName} reported ongoing symptoms`;
            if (diagnosesStr && symptomsStr) {
                b4 += ` consistent with ${pronPossLower} psychiatric diagnoses of ${diagnosesStr}, including ${symptomsStr}.`;
            } else if (diagnosesStr) {
                b4 += ` consistent with ${pronPossLower} psychiatric diagnoses of ${diagnosesStr}.`;
            } else {
                b4 += ` including ${symptomsStr}.`;
            }
            sentences.push(b4);
        }
    }

    // Bloque 5 — Estresores psicosociales / red de apoyo
    if (data.blocksEnabled[5]) {
        const stressorsStr = formatList(data.psychosocial_stressors);
        if (stressorsStr) {
            sentences.push(
                `${pronSubj} expressed feeling lonely and isolated, with a limited local support network beyond ${pronPossLower} immediate family, and identified ${stressorsStr} as a significant source of distress.`
            );
        } else {
            sentences.push(
                `${pronSubj} expressed feeling lonely and isolated, with a limited local support network beyond ${pronPossLower} immediate family, and identified lack of social support as a significant source of distress.`
            );
        }
    }

    // Bloque 6 — Complejidad médica y coordinación de cuidados
    if (data.blocksEnabled[6]) {
        const specsStr = formatList(data.medical_specialties);
        if (specsStr) {
            sentences.push(
                `${firstName} also reported managing multiple chronic medical conditions spanning ${specsStr}, and expressed difficulty coordinating care across ${pronPossLower} multiple specialists.`
            );
        }
    }

    // Bloque 7 — Adherencia a medicamentos
    if (data.blocksEnabled[7]) {
        sentences.push(
            `Concerns regarding medication adherence were identified given the complexity of ${pronPossLower} extensive medication regimen and the recent need for a dosage adjustment.`
        );
    }

    // Bloque 8 — Necesidades identificadas
    if (data.blocksEnabled[8]) {
        const needsStr = formatList(data.identified_needs);
        if (needsStr) {
            sentences.push(
                `${pronSubj} further reported significant financial hardship and identified needs related to ${needsStr}.`
            );
        }
    }

    // Bloque 9 — Situación de vivienda
    if (data.blocksEnabled[9]) {
        if (living && address) {
            sentences.push(
                `${firstName} resides ${living} at ${address}, and verbalized a need for services to support care coordination, improve emotional stability, reinforce medication adherence, and connect with community resources.`
            );
        } else if (address) {
            sentences.push(
                `${firstName} resides at ${address}, and verbalized a need for services to support care coordination, improve emotional stability, reinforce medication adherence, and connect with community resources.`
            );
        } else if (living) {
            sentences.push(
                `${firstName} resides ${living}, and verbalized a need for services to support care coordination, improve emotional stability, reinforce medication adherence, and connect with community resources.`
            );
        }
    }

    // Bloque 10 — Justificación de necesidad médica
    if (data.blocksEnabled[10]) {
        const risksStr = formatList(data.risk_factors);
        if (risksStr) {
            sentences.push(
                `Given ${pronPossLower} complex medical and psychiatric profile, ${risksStr}, uninterrupted access to care is essential to maintain ${pronPossLower} stability and prevent further deterioration.`
            );
        } else {
            sentences.push(
                `Given ${pronPossLower} complex medical and psychiatric profile, uninterrupted access to care is essential to maintain ${pronPossLower} stability and prevent further deterioration.`
            );
        }
    }

    // Bloque 11 — Transición a la visita domiciliaria
    if (data.blocksEnabled[11]) {
        const tcm = getTcmSubject();
        sentences.push(
            `In response, ${tcm} requested ${pronPossLower} address to coordinate an in-person visit. Later that day, the TCM conducted a face-to-face visit at ${firstName}'s residence to assess ${pronPossLower} needs, strengths, and barriers and to initiate the admission and evaluation process. ${firstName} was cooperative, communicative, and receptive throughout the visit.`
        );
    }

    // Join all into ONE continuous paragraph (no newlines)
    return sentences.join(' ').replace(/\s{2,}/g, ' ').trim();
};

export const generateCaseAssignmentOutcome = (data: Partial<CaseAssignmentFormData>): string => {
    const fullName = (data.client_full_name || '').trim();
    const firstName = (data.client_first_name || (fullName.split(' ')[0] || 'Client')).trim();
    return `The first contact for Client ${firstName} was successfully conducted. ${firstName} agreed to receive Targeted Case Management services.`;
};

export const generateCaseAssignmentNextSteps = (
    data: Partial<CaseAssignmentFormData>,
    templateText?: string
): string => {
    const fullName = (data.client_full_name || '').trim();
    const firstName = (data.client_first_name || (fullName.split(' ')[0] || 'the client')).trim();
    const raw = templateText || NEXT_STEPS_OPTIONS[0].template;
    return raw.replace(/\{\{client_first_name\}\}/g, firstName);
};
