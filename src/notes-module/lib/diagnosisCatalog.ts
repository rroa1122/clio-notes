export interface DiagnosisCode {
    code: string;
    description: string;
}

export const COMMON_DIAGNOSES: DiagnosisCode[] = [
    // Cardiovascular
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "I11.9", description: "Hypertensive heart disease without heart failure" },
    { code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery" },
    { code: "I48.91", description: "Unspecified atrial fibrillation" },

    // Metabolic / Endocrine
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    { code: "E11.65", description: "Type 2 diabetes mellitus with hyperglycemia" },
    { code: "E78.5", description: "Hyperlipidemia, unspecified" },
    { code: "E03.9", description: "Hypothyroidism, unspecified" },
    { code: "E66.9", description: "Obesity, unspecified" },

    // Mental Health / Behavioral
    { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
    { code: "F33.1", description: "Major depressive disorder, recurrent, moderate" },
    { code: "F41.1", description: "Generalized anxiety disorder" },
    { code: "F41.9", description: "Anxiety disorder, unspecified" },
    { code: "F90.9", description: "Attention-deficit hyperactivity disorder, unspecified type" },
    { code: "F17.210", description: "Nicotine dependence, cigarettes, with withdrawal" },

    // Respiratory
    { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
    { code: "J44.9", description: "Chronic obstructive pulmonary disease, unspecified" },
    { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },

    // Musculoskeletal
    { code: "M54.50", description: "Low back pain, unspecified" },
    { code: "M19.90", description: "Unspecified osteoarthritis, unspecified site" },
    { code: "M25.50", description: "Pain in unspecified joint" },

    // Neurological
    { code: "G47.00", description: "Insomnia, unspecified" },
    { code: "G43.909", description: "Migraine, unspecified, not intractable, without status migrainosus" },

    // Gastrointestinal
    { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis" },
    { code: "K52.9", description: "Noninfective gastroenteritis and colitis, unspecified" },

    // Genitourinary
    { code: "N39.0", description: "Urinary tract infection, site not specified" },

    // General / Other
    { code: "R53.83", description: "Other fatigue" },
    { code: "R05.9", description: "Cough, unspecified" },
    { code: "Z00.00", description: "Encounter for general adult medical examination without abnormal findings" }
];

export const searchDiagnoses = (query: string): DiagnosisCode[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    return COMMON_DIAGNOSES.filter(d =>
        d.code.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    ).slice(0, 10);
};
