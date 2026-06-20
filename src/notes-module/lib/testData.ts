import type { ClioNote } from '../types';

export const SAMPLE_JORDAN_LEE: ClioNote = {
    patient: {
        full_name: "Jordan Lee",
        dob: "1985-05-15",
        age: 38,
        sex_at_birth: "male"
    },
    encounter: {
        mode: "telehealth"
    },
    meta: {
        template_id: "psych-eval",
        template_version: "1.0",
        confidence_overall: 0.95,
        context: "Initial evaluation for anxiety and depression.",
        warnings: [],
        missing_fields: []
    },
    hpi: {
        chief_complaint: "Feeling overwhelmed and constant worry for the past 3 months.",
        narrative: "Jordan reports a gradual onset of anxiety symptoms starting about 12 weeks ago, coincident with increased pressure at work. He describes 'racing thoughts' and difficulty falling asleep. Symptoms are worse in the evenings. He denies any previous psychiatric treatment until now.",
        facts: {
            presenting_problems: ["Anxiety", "Insomnia", "Work-related stress"],
            current_psych_meds: [],
            safety: {
                si: { status: "negative", details: "Denies suicidal ideation." },
                hi: { status: "negative", details: "Denies homicidal ideation." },
                psychosis: { status: "negative", details: "No evidence of hallucinations or delusions." }
            }
        }
    },
    ros: {
        positive: ["Fatigue", "Muscle tension"]
    },
    mse: {
        appearance: "Neatly dressed, appropriate hygiene.",
        mood: "Anxious",
        affect: "Congruent, slightly restricted",
        thought_process: "Linear and goal-directed",
        thought_content: "Negative for SI/HI or psychosis",
        cognition: "Intact",
        insight_judgment: "Fair"
    },
    screenings: [
        { name: "PHQ-9", score: 12, performed: "yes" },
        { name: "GAD-7", score: 14, performed: "yes" }
    ],
    assessment_dsm5: ["Generalized Anxiety Disorder (F41.1)", "Adjustment Disorder with Depressed Mood (F43.22)"],
    plan: {
        pharmacological: {
            start: ["Sertraline 50mg daily"],
            continue: [],
            switch: [],
            discontinue: []
        },
        follow_up_weeks: 4
    },
    current_psychiatric_treatment: "None currently.",
    past_psychiatric_history: "No previous psychiatric history reported.",
    past_psych_hospitalizations: "None.",
    psychiatric_medication_history: "Never prescribed psychotropic medications before.",
    family_mental_illness_history: "Mother has a history of depression.",
    medical_conditions: "Hypertension",
    relevant_surgical_procedures: "Appendectomy (2010)",
    other_non_psych_meds: "Lisinopril 10mg daily",
    social_history: {
        marital_status: "Married",
        children: "Two children (ages 5 and 8)",
        education: "Bachelor's degree",
        employment: "Project Manager",
        living_situation: "Lives with wife and children in a house",
        substance_use: "Drinks 1-2 beers on weekends. Denies illicit drug use.",
        nicotine_use: "Non-smoker",
        trauma_history: "None reported.",
        legal_history: "None."
    }
};
