import type { Template, AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
    webhookUrl: 'https://n8n.clinicflow.dev/webhook/medical-note',
    saveWebhookUrl: '',
    providers: ['Dr. Reinier'],
    mockMode: false,
};

export const PSYCHIATRY_TEMPLATE_CONTENT = `INITIAL PSYCHIATRY EVALUATION
CHIEF COMPLAINT- CC:
SUBJECTIVE/ HISTORY OF PRESENT ILLNESS-HPI:
TELEHEALTH:
Previous authorization from the patient... ontvangen verbal consent...
PRESENCIAL:
This encounter conducted face to face with the patient...

1-This is a {age} old male/female adult patient, with a past psychiatric history (….) for which patient has been prescribed psychotropic medications in the past, but he has been off this medication for a very long time.
OR
Patient prescribed psychotropic medications in the past, but he does not recall the names.

2- The patient came to our office for an Initial Psychiatric Evaluation for complaining of worsening of (….) in the past few months OR in the past few weeks.

3- Patient was receiving psychiatric services through the other practice/provider 
Last date psych services on (……) and is currently undergoing treatment with (….). Denies any significant adverse drug reaction from the prescribed medications. No evidence of extrapyramidal side effects or tardive dyskinesia. Negative AIMS. Tolerating her medications well.
OR
Patient is not currently taking any psychotropic medication

4- The patient reports feeling:

5- At this time, the patient denies negative thoughts or any suicidal or homicidal ideation, plan or intention. Able to contract for safety. Denies auditory or visual hallucinations, or any other perceptual disturbances or symptoms of psychosis.
Today the patient is seen individually.

CURRENT PSYCHIATRIC TREATMENT: 

PAST PSYCHIATRIC HISTORY:
The patient does she/he reports a past psychiatric history:
Past Psychiatric hospitalizations: 

SAFETY ASSESSMENT:
Current suicidal ideation, plan, or intent: 
Self-injury behaviors: 

PSYCHIATRIC MEDICATION HISTORY:
The patient reports the current and past use of the following Psychiatric medications:

FAMILY MENTAL ILLNESS HISTORY:
The patient reports the following family mental health history:

RELEVANT MEDICAL CONDITIONS:
The patient reports the following medical conditions:

OB & PREGNANCY Hx:  
Age at Menopause:    
Total Pregnancy:
Full Term:
Full Term:
Miscarriages:
Living:

RELEVANT SURGICAL PROCEDURES:
The patient reports the following past surgical procedures:

ALLERGIES: 
N.K.D.A

OTHER NON-PSYCHIATRIC MEDICATIONS:
The patient reports past use of the following medications:

SOCIAL, EDUCATION, EMPLOYMENT, AND LEGAL HISTORY:
Cultural background: Born in Cuba, México, Venezuela, Nicaragua, Honduras, Columbia, Puerto Rico
Immigration status:  USA Citizenship, Permanent residence (lawful residence with a green card)/     Nonimmigrant visa/status, Visa waivers/ Parole.
Marital Status: Married/ Single/ Separated/ Divorced/ Widow
Children:
Education Level: Completed….
Employment/ Occupation: Unemployed, Retirement, Disability
Household/ Living Situation: (alone, with family, assisted living, homeless, etc.)
                                                      Housing stability/safety Religion:
Interests and Hobbies:
Sexual orientation/ preference: Heterosexual/ Homosexual/ Bisexual
Drug or alcohol abuse history:
Nicotine use/ Smoking status: Non-smoker / Active Smoked
Trauma, Abuse or Neglect history: 
Legal problems: 
Firearms or any other weapons in the house: 

REVIEW OF SIGNS AND SYMPTOMS:
Positive:
Negative: No significant weight changes; no fever, chills or night sweats; no vision or hearing changes; no swallowing difficulties; no headache, chest pain, palpitations, or shortness of breath; no abdominal pain or discomfort; no changes on bowel movement or urination; no neck, back or muscle pain; no assistance with ambulation needed. Denies suicidal or homicidal ideation, plan or intention. No perceptual disturbances.

OBJECTIVE-MSE:
General Appearance: The patient is well-developed, well-nourished, with appropriate grooming, and adequately dressed. 
Attitude and behavior: The patient is cooperative and friendly with good eye contact and calm behavior, Pessimistic negative outlook / Optimistic 
Psychomotor: Normal activity level, normal gait, and movement.
Speech: Clear, coherent, fluent, normal rate/rhythm
Mood: Sadness. Decreased energy. Poor motivation. Anhedonia. Hopelessness. Helplessness. Anxiety. Tearful, Excessive worries. Ruminations. Obsessive thoughts. Difficulty concentrating or thinking, indecisiveness. Occasional sleep disturbance (insomnia).
Affect: Dysthymic, labile, Constricted, Restricted, congruent with the assessed mood/ Incongruent with the assessed mood.
Thought Process: Coherent, logical, relevant 
Thought Content: Negative for perceptual disturbances (hallucinations), delusions, obsessions, compulsions, or guilt, also negative for hopelessness and helplessness. Self-esteem/worth is preserved. Positive for ?? 
Orientation: Alert and oriented to person, place, and time 
Recent memory: Intact/ Fair/ Low
Remote Memory: Intact/ Fair/ Low
Attention/Concentration: Normal attention span; Easily distracted at times; Inappropriate with a short attention span. Patient reports frequent forgetfulness, distractibility, and difficulty retaining information. Patient also struggles with procrastination, time management, and multitasking, and often interrupts others during conversation. Inappropriate with short retention of information
Insight: Good/ Fair/ Poor
Judgment: Good/ Fair/ Poor
Reliability of Information: Fair/ Good / Poor
Impulse Control: Low/High/Adequate
Motivation: Poor/ Adequate/ Unchanged
Energy: Adequate/ Low/ Unchanged
Homicidal Ideation: Pt denied 
Suicidal Ideation: Pt denied. 

Test/ Screening Tools:
*PHQ-9*
... (Scored) ...

Assessment-DSM 5:

Plan and Interventions:
... (Psychotherapy provided) ...

Pharmacological Interventions/ Eforcse checked: 
... (Start/Continue/Switch/Discontinue) ...

Patient Education:
... (Instructions list) ...

Disposition and Follow Up: 
...`;

export const TCM_DOMAINS = [
    { label: "#1 Mental Health / Substance Abuse", path: "services.domains_selected.1_mental_health_substance_abuse" },
    { label: "#2 Physical Health / Medical / Dental", path: "services.domains_selected.2_physical_health_medical_dental" },
    { label: "#3 Vocational / Employment / Job Training", path: "services.domains_selected.3_vocational_employment_job_training" },
    { label: "#4 School / Education", path: "services.domains_selected.4_school_education" },
    { label: "#5 Recreational / Social Support", path: "services.domains_selected.5_recreational_social_support" },
    { label: "#6 Activities of Daily Living", path: "services.domains_selected.6_activities_of_daily_living" },
    { label: "#7 Housing / Shelter", path: "services.domains_selected.7_housing_shelter" },
    { label: "#8 Economic / Financial", path: "services.domains_selected.8_economic_financial" },
    { label: "#9 Basic Needs", path: "services.domains_selected.9_basic_needs" },
    { label: "#10 Transportation", path: "services.domains_selected.10_transportation" },
    { label: "#11 Legal / Immigration", path: "services.domains_selected.11_legal_immigration" },
    { label: "#12 Other (Hurricane Season)", path: "services.domains_selected.12_other" }
];

export const DEFAULT_TEMPLATES: Template[] = [
    {
        id: 'tcm_progress_note',
        version: '1.0',
        name: 'TCM Progress Note',
        category: 'CASE MANAGEMENT',
        content: 'TCM PROGRESS NOTE:\n\nSUBJECTIVE:\n\nOBJECTIVE:\n\nASSESSMENT:\n\nPLAN:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_assessment_note',
        version: '1.0',
        name: 'TCM Initial Assessment & Certification',
        category: 'CASE MANAGEMENT',
        content: 'TCM INITIAL ASSESSMENT & CERTIFICATION:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_service_plan_note',
        version: '1.0',
        name: 'TCM Service Plan Development',
        category: 'CASE MANAGEMENT',
        content: 'TCM SERVICE PLAN DEVELOPMENT:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_service_plan_discussion',
        version: '1.0',
        name: 'TCM Service Plan Discussion',
        category: 'CASE MANAGEMENT',
        content: 'TCM SERVICE PLAN DISCUSSION:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_initial_home_visit_note',
        version: '1.0',
        name: 'TCM Initial Home Visit',
        category: 'CASE MANAGEMENT',
        content: 'TCM INITIAL HOME VISIT:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_collateral_note',
        version: '1.0',
        name: 'TCM Collateral & Contact Note',
        category: 'CASE MANAGEMENT',
        content: 'TCM COLLATERAL & CONTACT NOTE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_hurricane_addendum_note',
        version: '1.0',
        name: 'TCM Hurricane Season: Addendum (Two-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM HURRICANE SEASON ADDENDUM:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_hurricane_update_note',
        version: '1.0',
        name: 'TCM Hurricane Season: Update (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM HURRICANE SEASON UPDATE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_sts_complete_note',
        version: '1.0',
        name: 'TCM Complete STS Application (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM SPECIAL TRANSPORTATION SERVICE (STS) COMPLETE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_sts_collect_note',
        version: '1.0',
        name: 'TCM Collect STS from PCP (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM SPECIAL TRANSPORTATION SERVICE (STS) COLLECT:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_sts_submit_note',
        version: '1.0',
        name: 'TCM Submit STS (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM SPECIAL TRANSPORTATION SERVICE (STS) SUBMIT:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_dpp_obtain_note',
        version: '1.0',
        name: 'TCM Obtain Disabled Parking Permit (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM DISABLED PARKING PERMIT (DPP) OBTAIN:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_dpp_complete_note',
        version: '1.0',
        name: 'TCM Complete Disabled Parking Permit (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM DISABLED PARKING PERMIT (DPP) COMPLETE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_dpp_submit_pcp_note',
        version: '1.0',
        name: 'TCM Submit DPP to PCP (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM DISABLED PARKING PERMIT (DPP) SUBMIT TO PCP:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_mhv_provide_donation_note',
        version: '1.0',
        name: 'TCM MHV + Provide Donation (One-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM MHV + PROVIDE DONATION:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_donation_obtain_note',
        version: '1.0',
        name: 'TCM Obtain Supply Donation (Two-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM OBTAIN SUPPLY DONATION:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_vaccination_assistance_note',
        version: '1.0',
        name: 'TCM Vaccination Assistance (Three-Service)',
        category: 'CASE MANAGEMENT',
        content: 'TCM VACCINATION ASSISTANCE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_provider_appt_coord_note',
        version: '1.0',
        name: 'TCM Provider Appointment Coordination',
        category: 'CASE MANAGEMENT',
        content: 'TCM PROVIDER APPOINTMENT COORDINATION:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_uscis_assistance_note',
        version: '1.0',
        name: 'TCM USCIS Process Assistance',
        category: 'CASE MANAGEMENT',
        content: 'TCM USCIS PROCESS ASSISTANCE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'tcm_housing_assistance_note',
        version: '1.0',
        name: 'TCM Housing Application Assistance',
        category: 'CASE MANAGEMENT',
        content: 'TCM HOUSING APPLICATION ASSISTANCE:\n\nSUMMARY NOTES:',
        definition: JSON.stringify([
            {
                title: "Progress Note",
                fields: [
                    { label: "DOS:", path: "visit.dos_date" },
                    { label: "PATIENT NAME:", path: "patient.full_name" },
                    { label: "EMR:", path: "patient.emr" },
                    { label: "CASE NO:", path: "patient.case_no" },
                    { label: "SEX:", path: "patient.sex" },
                    { label: "MOBILE:", path: "patient.mobile" },
                    { label: "DOB:", path: "patient.dob" },
                    { label: "AGE:", path: "patient.age" }
                ]
            },
            {
                title: "Facility",
                fields: [
                    { label: "FACILITY NAME:", path: "facility.name" },
                    { label: "FACILITY ADDRESS:", path: "facility.address" },
                    { label: "FACILITY PHONE:", path: "facility.phone" },
                    { label: "FACILITY FAX:", path: "facility.fax" },
                    { label: "FACILITY EMAIL:", path: "facility.email" }
                ]
            },
            {
                title: "Services (Domains)",
                fields: TCM_DOMAINS.map(d => ({ label: d.label, path: d.path }))
            },
            {
                title: "Summary (Notes)",
                fields: [{ label: "", path: "note.summary_notes" }]
            }
        ], null, 2)
    },
    {
        id: 'psych-eval',
        version: '1.0',
        name: 'Initial Psychiatry Evaluation',
        category: 'Psychiatry',
        content: PSYCHIATRY_TEMPLATE_CONTENT,
        definition: JSON.stringify([
            {
                title: "History of Present Illness",
                fields: [
                    { label: "CHIEF COMPLAINT:", path: "hpi.chief_complaint" },
                    { label: "CLINICAL NARRATIVE:", path: "hpi.narrative" },
                    { label: "CURRENT PSYCHIATRIC MEDICATIONS:", path: "hpi.facts.current_psych_meds" },
                    { label: "CURRENT PSYCHIATRIC TREATMENT:", path: "current_psychiatric_treatment" },
                    { label: "PAST PSYCHIATRIC HISTORY:", path: "past_psychiatric_history" }
                ]
            },
            {
                title: "Assessment and Diagnosis",
                fields: [
                    { label: "DIAGNOSIS (DSM-5):", path: "assessment_dsm5" }
                ]
            }
        ], null, 2)
    },
    { id: 'soap', version: '1.0', name: 'SOAP Note', category: 'Clinical', content: 'SUBJECTIVE:\n\nOBJECTIVE:\n\nASSESSMENT:\n\nPLAN:' },
    { id: 'hp', version: '1.0', name: 'H&P Examination', category: 'Clinical', content: 'HISTORY:\n\nPHYSICAL EXAM:\n\nASSESSMENT:\n\nPLAN:' },
    { id: 'progress', version: '1.0', name: 'Progress Note', category: 'Clinical', content: 'DAILY UPDATE:\n\nSTABLE:\n\nCHANGES:' },

];

export const CLINICAL_SECTIONS = [
    "CHIEF COMPLAINT- CC:",
    "SUBJECTIVE/ HISTORY OF PRESENT ILLNESS-HPI:",
    "CURRENT PSYCHIATRIC TREATMENT:",
    "PAST PSYCHIATRIC HISTORY:",
    "SAFETY ASSESSMENT:",
    "PSYCHIATRIC MEDICATION HISTORY:",
    "FAMILY MENTAL ILLNESS HISTORY:",
    "RELEVANT MEDICAL CONDITIONS:",
    "OB & PREGNANCY HX:",
    "RELEVANT SURGICAL PROCEDURES:",
    "ALLERGIES:",
    "OTHER NON-PSYCHIATRIC MEDICATIONS:",
    "SOCIAL, EDUCATION, EMPLOYMENT, AND LEGAL HISTORY:",
    "REVIEW OF SIGNS AND SYMPTOMS:",
    "OBJECTIVE-MSE:",
    "TEST/ SCREENING TOOLS:",
    "ASSESSMENT-DSM 5:",
    "PLAN AND INTERVENTIONS:",
    "PATIENT EDUCATION:",
    "DISPOSITION AND FOLLOW UP:"
];
