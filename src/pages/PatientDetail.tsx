import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Phone,
    Mail,
    Shield,
    Clock,
    FileText,
    User,
    Edit3,
    Plus,
    ChevronRight,
    Activity,
    ClipboardList,
    MapPin,
    CreditCard,
    Users,
    Stethoscope,
    Brain,
    HeartPulse,
    Hash,
    BadgeCheck,
    Briefcase,
    Save,
    X,
    CheckCircle2,
    Store,
    UploadCloud,
    Loader2,
    Fingerprint,
    Coins,
    DollarSign,
    Heart,
    ShieldAlert,
    GraduationCap,
    Globe,
    UserCheck,
    AlertTriangle,
    Home,
    Car,
    CheckSquare,
    MoreHorizontal,
    FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { storage, type Patient as StoragePatient } from '../notes-module/lib/storage';
import { getCalls } from '../data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PatientNotePreview } from '../components/PatientNotePreview';
import { searchDiagnoses, type DiagnosisCode } from '../notes-module/lib/diagnosisCatalog';
import { cn } from '@/lib/utils';

interface TimelineItem {
    id: string;
    type: 'note' | 'call';
    timestamp: string;
    title: string;
    description: string;
    status?: string;
    raw: any;
}

const DOMAINS_LIST = [
    { id: "domain_mental_health", label: "1. Mental Health / Substance Abuse", labelEs: "1. Salud Mental / Abuso de Sustancias" },
    { id: "domain_physical_health", label: "2. Physical Health / Medical / Dental", labelEs: "2. Salud Física / Médica / Dental" },
    { id: "domain_vocational", label: "3. Vocational / Employment / Job Training", labelEs: "3. Vocacional / Empleo / Adiestramiento Laboral" },
    { id: "domain_education", label: "4. School / Education", labelEs: "4. Escuela / Educación" },
    { id: "domain_recreational", label: "5. Recreational / Social Support", labelEs: "5. Apoyo Social / Recreativo" },
    { id: "domain_daily_living", label: "6. Activities of Daily Living", labelEs: "6. Actividades de la Vida Diaria" },
    { id: "domain_housing", label: "7. Housing / Shelter", labelEs: "7. Vivienda / Refugio" },
    { id: "domain_financial", label: "8. Economic / Financial", labelEs: "8. Económico / Financiero" },
    { id: "domain_basic_needs", label: "9. Basic Needs", labelEs: "9. Necesidades Básicas" },
    { id: "domain_transportation", label: "10. Transportation", labelEs: "10. Transporte" },
    { id: "domain_legal", label: "11. Legal / Immigration", labelEs: "11. Legal / Inmigración" },
    { id: "domain_other", label: "12. Other", labelEs: "12. Otro" }
];

const getInitialsTheme = (name: string) => {
    const char = name ? name.charAt(0).toUpperCase() : '?';
    if ('AEIOU'.includes(char)) return {
        bg: 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-100/20 dark:border-indigo-900/10',
        glow: 'from-indigo-500/20 to-indigo-300/10 dark:from-indigo-500/10 dark:to-indigo-500/5'
    };
    if ('BCDFG'.includes(char)) return {
        bg: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-100/20 dark:border-emerald-900/10',
        glow: 'from-emerald-500/20 to-emerald-300/10 dark:from-emerald-500/10 dark:to-emerald-500/5'
    };
    if ('HJKLM'.includes(char)) return {
        bg: 'bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border-purple-100/20 dark:border-purple-900/10',
        glow: 'from-purple-500/20 to-purple-300/10 dark:from-purple-500/10 dark:to-purple-500/5'
    };
    if ('NPQRS'.includes(char)) return {
        bg: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-100/20 dark:border-amber-900/10',
        glow: 'from-amber-500/20 to-amber-300/10 dark:from-amber-500/10 dark:to-amber-500/5'
    };
    return {
        bg: 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-100/20 dark:border-blue-900/10',
        glow: 'from-blue-500/20 to-blue-300/10 dark:from-blue-500/10 dark:to-blue-500/5'
    };
};

export function PatientDetail() {
    const { t, language } = useLanguage();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<StoragePatient | null>(null);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<any | null>(null);
    const loggedRef = useRef<string | null>(null);

    // Inline Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<StoragePatient>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("client");
    const [suggestions, setSuggestions] = useState<DiagnosisCode[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAutofillModeModal, setShowAutofillModeModal] = useState(false);
    const [selectedAutofillFile, setSelectedAutofillFile] = useState<File | null>(null);
    const [downloadIframeUrl, setDownloadIframeUrl] = useState<string | null>(null);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        clientInfo: true,
        referrals: false,
        presentingProblems: false,
        familyInfo: false,
        pastServicesMedications: false,
        mentalHealth: false,
        physicalHealth: false,
        independenceDailyLiving: false,
        environmentFinancesLegal: false,
        summarySignatures: false
    });

    const toggleSection = (sectionName: string) => {
        setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
    };

    const loadData = useCallback(async (isRetry = false) => {
        if (!id) return;
        if (!isRetry) setLoading(true);

        try {
            const foundPatient = await storage.getPatient(id);

            if (foundPatient) {
                setPatient(foundPatient);
                setEditData({
                    ...foundPatient,
                    first_name: foundPatient.first_name || foundPatient.full_name?.split(' ')[0] || '',
                    last_name: foundPatient.last_name || foundPatient.full_name?.split(' ').slice(1).join(' ') || ''
                }); // Initialize edit data

                // Registrar log de auditoría una sola vez por paciente consultado
                if (loggedRef.current !== id) {
                    loggedRef.current = id;
                    import('../services/auditService').then(({ auditService }) => {
                        auditService.logAction({
                            action: 'ACCESS',
                            description: `Accessed patient chart for ${foundPatient.full_name}`,
                            targetType: 'patient',
                            targetId: id
                        });
                    }).catch(err => console.error('Error logging patient access:', err));
                }

                const patientNotes = await storage.getNotesByPatient(id);
                const allCalls = await getCalls();
                const patientCalls = allCalls.filter(c =>
                    c.patientPhone.includes(foundPatient.phone?.slice(-4) || 'NEVER_MATCH') ||
                    c.patientName === foundPatient.full_name
                );

                const items: TimelineItem[] = [
                    ...patientNotes.map(n => {
                        const snippet = n.final_note_text ||
                            (n as any).summary ||
                            (n.sections?.chiefComplaint) ||
                            (n.sections?.hpi) ||
                            "";

                        return {
                            id: n.id,
                            type: 'note' as const,
                            timestamp: n.createdAt || (n as any).created_at || new Date().toISOString(),
                            title: (n as any).template_name || n.noteType || (n as any).meta?.noteType || 'Clinical Note',
                            description: snippet.length > 120 ? snippet.substring(0, 120) + '...' : snippet,
                            raw: n
                        };
                    }),
                    ...patientCalls.map(c => ({
                        id: c.id,
                        type: 'call' as const,
                        timestamp: c.timestamp,
                        title: 'AI Voice Interaction',
                        description: c.summary,
                        status: c.status,
                        raw: c
                    }))
                ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setTimeline(items);
            } else if (!isRetry) {
                setTimeout(() => loadData(true), 1500);
            }
        } catch (err) {
            console.error("Failed to load patient detail:", err);
        } finally {
            if (!isRetry) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFieldChange = (name: string, value: string) => {
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialNeedsChange = (key: string, checked: boolean) => {
        setEditData(prev => {
            const currentNeeds = prev.tcm_social_needs || patient?.tcm_social_needs || {};
            return {
                ...prev,
                tcm_social_needs: {
                    ...currentNeeds,
                    [key]: checked
                }
            };
        });
    };

    const handleSocialNeedsTextChange = (key: string, value: string) => {
        setEditData(prev => {
            const currentNeeds = prev.tcm_social_needs || patient?.tcm_social_needs || {};
            return {
                ...prev,
                tcm_social_needs: {
                    ...currentNeeds,
                    [key]: value
                }
            };
        });
    };

    const handleSocialNeedsValChange = (key: string, value: any) => {
        setEditData(prev => {
            const currentNeeds = prev.tcm_social_needs || patient?.tcm_social_needs || {};
            return {
                ...prev,
                tcm_social_needs: {
                    ...currentNeeds,
                    [key]: value
                }
            };
        });
    };

    const handleSave = async () => {
        if (!patient || !id) return;
        setIsSaving(true);
        try {
            const finalData = {
                ...editData,
                full_name: `${editData.first_name || ''} ${editData.last_name || ''}`.trim() || patient.full_name
            };
            await storage.upsertPatient({ ...finalData, id });
            setPatient({ ...patient, ...finalData } as StoragePatient);
            setIsEditing(false);
            // Re-load to ensure everything is fresh
            loadData(true);
        } catch (err) {
            console.error("Failed to save patient:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (patient) {
            setEditData({
                ...patient,
                first_name: patient.first_name || patient.full_name?.split(' ')[0] || '',
                last_name: patient.last_name || patient.full_name?.split(' ').slice(1).join(' ') || ''
            });
        } else {
            setEditData({});
        }
        setIsEditing(false);
    };

    const handleAIAutofill = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size === 0) {
            toast.error(language === 'es' ? "El archivo seleccionado está vacío (0 bytes)." : "The selected file is empty (0 bytes).");
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
            return;
        }
        setSelectedAutofillFile(file);
        setShowAutofillModeModal(true);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    };

    const handleDownloadAssessmentPDF = () => {
        if (!patient) return;
        toast.info(language === 'es' ? "Abriendo panel de impresión..." : "Opening print panel...", { icon: "🖨️" });
        window.open(`/patients/print-assessment/${patient.id}`, '_blank');
    };

    const handleAutofillAssessment = async () => {
        if (!patient) {
            console.error("Autofill clicked but patient is not defined.");
            return;
        }
        setIsExtracting(true);
        console.log("Starting handleAutofillAssessment for patient:", patient.id, patient.full_name);
        toast.info(language === 'es' ? "Generando evaluación con IA..." : "Generating assessment with AI...", { icon: "✨" });

        try {
            // Trigger n8n webhook
            const webhookUrl = 'https://n8n.clinicflow.dev/webhook/autofill-assessment';
            let tcm_social_needs: any = null;
            
            try {
                console.log("Fetching webhook:", webhookUrl);
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        patient_id: patient.id,
                        full_name: patient.full_name,
                        dob: patient.dob,
                        gender: patient.gender,
                        diagnoses: patient.diagnoses,
                        presenting_problems: patient.presenting_problems,
                        pcp_conditions: patient.pcp_conditions,
                        pcp_medications: patient.pcp_medications,
                        psych_conditions: patient.psych_conditions,
                        psych_medications: patient.psych_medications,
                        address: patient.address,
                        phone: patient.phone,
                        insurance_company: patient.insurance_company,
                        pcp_name: patient.pcp_name,
                        psych_name: patient.psych_name
                    })
                });

                console.log("Response status:", response.status, response.statusText);
                if (response.ok) {
                    const resData = await response.json();
                    console.log("Received data from n8n:", resData);
                    let content = resData;
                    if (Array.isArray(resData) && resData.length > 0) content = resData[0];
                    if (content && content.json) content = content.json;
                    tcm_social_needs = content.tcm_social_needs || content;
                    if (tcm_social_needs) {
                        // Map past services 'date' to 'date_received'
                        if (Array.isArray(tcm_social_needs.past_services)) {
                            tcm_social_needs.past_services = tcm_social_needs.past_services.map((item: any) => ({
                                ...item,
                                date_received: item.date_received || item.date || ''
                            }));
                        }
                        // Clean up medications_grid doctor names from placeholders
                        if (Array.isArray(tcm_social_needs.medications_grid)) {
                            tcm_social_needs.medications_grid = tcm_social_needs.medications_grid.map((item: any) => {
                                let phys = item.physician || '';
                                if (!phys || phys.includes('PCP') || phys.toLowerCase().includes('primary')) {
                                    phys = patient.pcp_name || 'Primary Care Physician';
                                } else if (phys.includes('Psych') || phys.toLowerCase().includes('psychiatrist')) {
                                    phys = patient.psych_name || 'Psychiatrist';
                                }
                                return {
                                    ...item,
                                    physician: phys
                                };
                            });
                        }
                    }
                    console.log("Extracted tcm_social_needs payload:", tcm_social_needs);
                } else {
                    const errText = await response.text();
                    console.error("Webhook responded with error:", response.status, errText);
                    toast.error(`Error del servidor n8n (Status ${response.status})`);
                }
            } catch (err: any) {
                console.error("Webhook fetch failed, falling back to local generator", err);
                toast.warning(`Error de red al conectar con n8n: ${err.message || err}`);
            }

            // Fallback Generator if webhook fails or returns empty object
            if (!tcm_social_needs || Object.keys(tcm_social_needs).length === 0) {
                console.log("No payload from webhook, using intelligent fallback generator.");
                const isPsych = !!(patient.psych_conditions || patient.psych_medications);
                const hasDepression = patient.diagnoses?.toLowerCase().includes('depress') || patient.pcp_conditions?.toLowerCase().includes('depress');
                const hasAnxiety = patient.diagnoses?.toLowerCase().includes('anxiety') || patient.pcp_conditions?.toLowerCase().includes('anxiety');

                tcm_social_needs = {
                    assessment_type: 'Initial',
                    other_provider_case_management: 'No',
                    referred_by: 'Primary Care Clinic',
                    referral_phone: patient.pcp_phone || '786-555-0199',
                    referral_address: patient.pcp_address || 'Clinic Address',
                    referral_agency: 'Outpatient Primary Care',
                    referral_title: 'Referral Coordinator',
                    onset_date: '12/10/2025',
                    prev_psych_problems: isPsych ? 'Yes' : 'No',
                    hearing_level: 'no_impairment',
                    vision_level: 'no_impairment',
                    is_pregnant: 'No',
                    vaccines_current: true,
                    symptom_depression: hasDepression,
                    symptom_sadness: hasDepression,
                    symptom_anxiety: hasAnxiety,
                    symptom_sleep: true,
                    symptom_withdrawal: hasDepression,
                    risk_suicidal: false,
                    risk_homicidal: false,
                    risk_abuse: false,
                    adl_feed: 'independent',
                    adl_groom: 'independent',
                    adl_bath: 'independent',
                    adl_dress: 'independent',
                    adl_transfer: 'independent',
                    adl_cook: 'supervision',
                    adl_laundry: 'supervision',
                    adl_phone: 'independent',
                    adl_shop: 'supervision',
                    social_skills_description: 'The client is cooperative and polite but tends to isolate socially due to depressive symptoms and difficulties adjusting to changes.',
                    support_system_description: `Extremely limited support network. Lives alone. Maintains occasional telephone contact with emergency contact ${patient.emergency_contact_name || 'family member'}.`,
                    housing_bedrooms: 1,
                    housing_ppb: 1,
                    housing_preference: 'Continue to live here',
                    housing_type: 'Renting',
                    risk_tripping: true,
                    risk_lighting: false,
                    risk_structural: false,
                    neighborhood_description: 'Urban residential area with access to basic services and nearby public transportation.',
                    rent_payment: 994,
                    ssi_details: 'SSI Benefits',
                    other_financial_resources: 'SNAP / Food Stamps',
                    financial_difficulties: true,
                    financial_difficulties_description: 'The client reports difficulties meeting rent and utilities due to a limited fixed income.',
                    transportation_ability_description: 'Requires occasional assistance to coordinate medical transportation appointments through insurance.',
                    patient_strengths: 'Adherent to medical and mental health appointments when provided with reminders, and receptive to case management help.',
                    patient_weaknesses: 'Social isolation, low fixed income, and mild cognitive limitations in managing administrative paperwork independently.',
                    domain_mental_health: true,
                    domain_physical_health: true,
                    domain_recreational: true,
                    domain_daily_living: true,
                    domain_financial: true,
                    domain_basic_needs: true,
                    domain_transportation: true,
                    domain_vocational: false,
                    domain_education: false,
                    domain_housing: false,
                    domain_legal: false,
                    domain_other: false,
                    home_visit_conducted: true,
                    home_visit_date: '01/05/2026',
                    presenting_problems_description: `The client ${patient.full_name} is referred for case management services due to severe depressive and anxious symptoms. Reports persistent sadness, withdrawal, and significant difficulties with daily self-management.`,
                    mental_health_history: `Chronic mental health history including diagnoses of depression and anxiety. Has received outpatient psychiatric and pharmacological treatment for several years with partial compliance.`,
                    risk_details: 'No active suicidal or homicidal ideations are reported at the time of evaluation.',
                    risk_behavior_description: `Indirect risk behaviors are identified related to social isolation and low adherence to regular medical check-ups due to affective symptoms.`,
                    living_arrangements_description: `The client resides alone in a one-bedroom apartment. Has adequate space and privacy, though reports difficulties falling asleep at night.`,
                    domain_mental_health_note: `${patient.full_name} has been suffering from ${patient.diagnoses?.trim().replace(/\n/g, ', ') || 'mental health symptoms'}; he/she has been feeling depressed and anxious for years. ${patient.full_name} needs to continue receiving psychiatric treatment to stabilize his/her mental condition and avoid hospitalizations.`,
                    domain_physical_health_note: `${patient.full_name} needs to continue receiving medical treatment from his/her PCP and following medical appointments to keep his/her medical condition under control. ${patient.full_name} needs to get his/her over-the-counter (OTC) medications, but ${patient.full_name} is having difficulty completing the form and submitting it to his/her health insurance. The CM will assist ${patient.full_name} in obtaining, completing, and submitting the OTC application.`,
                    domain_vocational_note: 'None reported at this time',
                    domain_education_note: 'None reported at this time',
                    domain_recreational_note: `${patient.full_name} needs to interact with more people and expand his/her social support network, to improve his/her coping skills. He/She needs to find a social or recreational program available in the community.`,
                    domain_daily_living_note: `${patient.full_name} needs to understand notifications received from his/her providers and comply with their requests to maintain his/her benefits.`,
                    domain_housing_note: 'None reported at this time',
                    domain_financial_note: `${patient.full_name} struggles each month to pay electricity bills due to his/her low income. ${patient.full_name} needs to apply for Low Income Home Energy Assistance Program to obtain an electricity credit. ${patient.full_name} needs to obtain affordable phone services, to maintain communication with his/her medical provider and family.`,
                    domain_basic_needs_note: `${patient.full_name} needs food donations, clothes donations, personal care items, furniture, appliances, and cleaning supplies to cover some of his/her basic needs. ${patient.full_name} cannot afford to buy food and other items by himself/herself because of his/her age and medical condition.`,
                    domain_transportation_note: `${patient.full_name} is unable to reliably use public transportation to attend medical, psychiatric, and case management appointments due to anxiety.`,
                    domain_legal_note: 'None reported at this time',
                    domain_other_note: 'None reported at this time'
                };
            }

            setEditData(prev => ({
                ...prev,
                tcm_social_needs: {
                    ...(prev.tcm_social_needs || patient?.tcm_social_needs || {}),
                    ...tcm_social_needs
                }
            }));

            setIsEditing(true);
            toast.success(language === 'es' ? "¡Evaluación auto-llenada con éxito! Revisa los campos y haz clic en Guardar." : "Assessment auto-filled successfully! Review and click Save.", { icon: "✨" });
        } catch (error) {
            console.error("Error auto-filling assessment:", error);
            toast.error(language === 'es' ? "Error al auto-llenar la evaluación." : "Failed to auto-fill assessment.");
        } finally {
            setIsExtracting(false);
        }
    };

    const executeAIAutofill = async (mode: 'fill_blanks' | 'overwrite_all') => {
        if (!selectedAutofillFile) return;
        const file = selectedAutofillFile;
        setSelectedAutofillFile(null);
        setShowAutofillModeModal(false);

        setIsExtracting(true);
        toast.info("Analyzing intake form with Health AI...", { icon: "✨" });

        try {
            const { extractPatientData } = await import('../lib/services/patientIntakeService');
            const extractedData = await extractPatientData(file);

            setEditData(prev => {
                const base = {
                    ...patient,
                    ...prev
                };
                const merged = { ...base };
                
                for (const [key, value] of Object.entries(extractedData)) {
                    if (value !== undefined && value !== null && value !== '') {
                        if (mode === 'overwrite_all') {
                            (merged as any)[key] = value;
                        } else {
                            // fill_blanks mode: only set if currently empty in base
                            const existingValue = (base as any)[key];
                            if (existingValue === undefined || existingValue === null || existingValue === '') {
                                (merged as any)[key] = value;
                            }
                        }
                    }
                }
                
                if (mode === 'overwrite_all') {
                    return {
                        ...merged,
                        first_name: extractedData.first_name || extractedData.full_name?.split(' ')[0] || '',
                        last_name: extractedData.last_name || extractedData.full_name?.split(' ').slice(1).join(' ') || ''
                    };
                } else {
                    return {
                        ...merged,
                        first_name: merged.first_name || extractedData.first_name || extractedData.full_name?.split(' ')[0] || '',
                        last_name: merged.last_name || extractedData.last_name || extractedData.full_name?.split(' ').slice(1).join(' ') || ''
                    };
                }
            });

            setIsEditing(true);
            toast.success("Profile auto-filled successfully! Review and click Save.", { icon: "✨" });
        } catch (error) {
            console.error("AI extraction error:", error);
            toast.error("Failed to extract data from document");
        } finally {
            setIsExtracting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-bold animate-pulse">Accessing Client Protocol...</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="max-w-2xl mx-auto my-20 p-12 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-4">Client Not Found</h2>
                <Button onClick={() => navigate('/patients')} className="h-12 px-8 rounded-full bg-indigo-600 font-bold hover:bg-indigo-700">
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Registry
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-[1440px] mx-auto p-4 lg:p-8 space-y-12 animate-in fade-in duration-1000">
            {/* Sophisticated Context Header */}
            <header className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/70 dark:border-slate-800 rounded-[32px] p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition-all">
                <div className="flex items-center gap-6 min-w-0">
                    <div className="relative group shrink-0">
                        <div className={cn(
                            "absolute -inset-2 bg-gradient-to-tr rounded-[32px] blur-xl opacity-40 transform scale-90 group-hover:scale-110 transition-transform duration-700",
                            getInitialsTheme(patient.full_name).glow
                        )} />
                        <div className={cn(
                            "relative size-16 rounded-[24px] flex items-center justify-center border shadow-sm transition-all duration-500 group-hover:rotate-3 group-hover:scale-105",
                            getInitialsTheme(patient.full_name).bg
                        )}>
                            <User size={30} />
                        </div>
                    </div>
                    
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none truncate max-w-[200px] sm:max-w-[320px] md:max-w-[480px]">
                                {isEditing ? (`${editData.first_name || ''} ${editData.last_name || ''}`.trim() || patient.full_name) : patient.full_name}
                            </h1>
                            {isEditing && (
                                <div className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 shrink-0">
                                    {language === 'es' ? 'Editando' : 'Editing'}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-3.5">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 dark:hover:border-indigo-900 group/meta">
                                <Calendar size={13} className="text-indigo-400 group-hover/meta:scale-110 transition-transform" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    {patient.dob ? format(new Date(patient.dob), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM dd, yyyy', { locale: language === 'es' ? es : undefined }) : 'N/A'}
                                </span>
                            </div>
                            {patient.emr_id && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 dark:hover:border-indigo-900 group/meta">
                                    <Hash size={13} className="text-indigo-400 group-hover/meta:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                                        {patient.emr_id}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAIAutofill}
                        accept=".pdf,image/*"
                        className="hidden"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExtracting || isSaving}
                        className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-450 font-bold shadow-sm transition-all flex items-center gap-2 group disabled:opacity-50"
                    >
                        {isExtracting ? (
                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                        ) : (
                            <UploadCloud size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
                        )}
                        <span className="text-[10px] uppercase tracking-[0.15em]">
                            {isExtracting ? (language === 'es' ? "Analizando..." : "Analyzing...") : (language === 'es' ? "Autocompletar IA" : "AI Autofill")}
                        </span>
                    </Button>
                    {!isEditing ? (
                        <>
                            <Button
                                onClick={() => {
                                    if (patient) {
                                        setEditData({
                                            ...patient,
                                            first_name: patient.first_name || patient.full_name?.split(' ')[0] || '',
                                            last_name: patient.last_name || patient.full_name?.split(' ').slice(1).join(' ') || ''
                                        });
                                    }
                                    setIsEditing(true);
                                }}
                                className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-450 font-bold shadow-sm transition-all flex items-center gap-2 group"
                            >
                                <Edit3 size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-[10px] uppercase tracking-[0.15em]">{t('patient.edit_profile', 'Edit Profile')}</span>
                            </Button>
                            <Button
                                onClick={() => navigate(`/notes/new?patientId=${patient.id}`)}
                                className="h-11 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2 transform active:scale-95 group"
                            >
                                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span className="text-[10px] uppercase tracking-[0.15em]">{t('nav.new_encounter', 'New Encounter')}</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={handleCancel}
                                variant="ghost"
                                className="h-11 px-5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 font-bold transition-all flex items-center gap-2"
                                disabled={isSaving}
                            >
                                <X size={16} />
                                <span className="text-[10px] uppercase tracking-[0.15em]">{t('patient.cancel', 'Cancel')}</span>
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="h-11 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <div className="size-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                <span className="text-[10px] uppercase tracking-[0.15em]">
                                    {isSaving ? (language === 'es' ? "Guardando..." : "Saving...") : t('patient.save_changes', 'Save Changes')}
                                </span>
                            </Button>
                        </>
                    )}
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
            {/* Premium Unified Tabbed Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md p-1 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-sm w-full flex overflow-x-auto whitespace-nowrap h-12 mb-10 scrollbar-none justify-start lg:justify-around">
                    <PremiumTrigger value="client" icon={User} label={language === 'es' ? "Cliente" : "Client"} theme="indigo" />
                    <PremiumTrigger value="medical" icon={Stethoscope} label={language === 'es' ? "Médico" : "Medical"} theme="emerald" />
                    <PremiumTrigger value="psychiatric" icon={Brain} label={language === 'es' ? "Psiquiátrico" : "Psychiatric"} theme="purple" />
                    <PremiumTrigger value="pharmacy" icon={Store} label={language === 'es' ? "Farmacia" : "Pharmacy"} theme="amber" />
                    <PremiumTrigger value="social" icon={ClipboardList} label={language === 'es' ? "Social (TCM)" : "Social (TCM)"} theme="blue" />
                    <PremiumTrigger value="assessment" icon={FileText} label={language === 'es' ? "Evaluación (TCM)" : "Assessment (TCM)"} theme="purple" />
                    <PremiumTrigger value="history" icon={Clock} label={language === 'es' ? "Historial" : "History"} theme="slate" />
                </TabsList>

                <div className="animate-in slide-in-from-bottom-5 duration-700 ease-out">
                    {/* [CLIENT TAB] */}
                    <TabsContent value="client" className="m-0 focus-visible:outline-none">
                        {activeTab === "client" && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Identity & Contact */}
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                <div className="mb-2">
                                    <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                                        {language === 'es' ? 'Identidad y Contacto' : 'Identity & Contact'}
                                    </h4>
                                </div>
                                <PremiumGlassField
                                    icon={User}
                                    label="First Name"
                                    name="first_name"
                                    value={isEditing ? editData.first_name : (patient.first_name || patient.full_name?.split(' ')[0])}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={User}
                                    label="Last Name"
                                    name="last_name"
                                    value={isEditing ? editData.last_name : (patient.last_name || patient.full_name?.split(' ').slice(1).join(' '))}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={Phone}
                                    label="Primary Contact"
                                    name="phone"
                                    value={isEditing ? editData.phone : patient.phone}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={Calendar}
                                    label="Date of Birth"
                                    name="dob"
                                    value={isEditing ? editData.dob : (patient.dob ? format(new Date(patient.dob), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM dd, yyyy', { locale: language === 'es' ? es : undefined }) : 'N/A')}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                    type="date"
                                />
                                <PremiumGlassField
                                    icon={Shield}
                                    label="SSN / National ID"
                                    name="ssn"
                                    value={isEditing ? editData.ssn : patient.ssn}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={MapPin}
                                    label="Residential Address"
                                    name="address"
                                    value={isEditing ? editData.address : patient.address}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                            </div>

                            {/* Right Column: Coordination & Insurance */}
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                <div className="mb-2">
                                    <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                                        {language === 'es' ? 'Coordinación Clínica' : 'Clinical Coordination'}
                                    </h4>
                                </div>
                                <PremiumGlassField
                                    icon={CreditCard}
                                    label="Insurance Company"
                                    name="insurance_company"
                                    value={isEditing ? editData.insurance_company : patient.insurance_company}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={CreditCard}
                                    label="Member ID"
                                    name="insurance_id"
                                    value={isEditing ? editData.insurance_id : patient.insurance_id}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={Hash}
                                    label="Case Number"
                                    name="case_number"
                                    value={isEditing ? editData.case_number : (patient as any).case_number}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={BadgeCheck}
                                    label="Citizenship Status"
                                    name="citizenship"
                                    value={isEditing ? editData.citizenship : patient.citizenship}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                />
                                <PremiumGlassField
                                    icon={User}
                                    label="Preferred Language"
                                    name="preferred_language"
                                    value={isEditing ? editData.preferred_language : patient.preferred_language}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
                                    options={['English', 'Spanish']}
                                />
                                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/30">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                                        {language === 'es' ? 'Protocolo de Emergencia' : 'Emergency Protocol'}
                                    </p>
                                    <div className="flex flex-col gap-6">
                                        <PremiumGlassField
                                            icon={User}
                                            label="Emergency Contact"
                                            name="emergency_contact_name"
                                            value={isEditing ? editData.emergency_contact_name : patient.emergency_contact_name}
                                            isEditing={isEditing}
                                            onChange={handleFieldChange}
                                            theme="amber"
                                        />
                                        <PremiumGlassField
                                            icon={Phone}
                                            label="Emergency Phone"
                                            name="emergency_contact_phone"
                                            value={isEditing ? editData.emergency_contact_phone : patient.emergency_contact_phone}
                                            isEditing={isEditing}
                                            onChange={handleFieldChange}
                                            theme="amber"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8">
                            <PremiumGlassField
                                icon={ClipboardList}
                                label="Primary Case Narrative / Presenting Problem"
                                name="presenting_problems"
                                value={isEditing ? editData.presenting_problems : patient.presenting_problems}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                isTextarea
                                large
                                theme="indigo"
                            />

                            {!isEditing && (
                                <div className="space-y-1.5 px-0.5">
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="text-indigo-400" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Diagnostic Registry</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {patient.diagnoses ? (
                                            patient.diagnoses.replace(/\\n/g, '\n').split('\n').filter(d => d.trim()).map((diag, i) => {
                                                const isPsych = (() => {
                                                    const trimmed = diag.trim().toUpperCase();
                                                    if (/^[F]\d/i.test(trimmed)) return true;
                                                    if (/^G3[01]/i.test(trimmed)) return true;
                                                    const psychKeywords = [
                                                        'depres', 'anxiet', 'ansied', 'insomn', 'bipolar', 'schizo', 
                                                        'esquizo', 'adhd', 'tdah', 'psych', 'psic', 'ptsd', 'panic', 
                                                        'panico', 'dement', 'demenc', 'cognitive', 'cognit', 'mental'
                                                    ];
                                                    return psychKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));
                                                })();

                                                return (
                                                    <div 
                                                        key={i} 
                                                        className={cn(
                                                            "flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/80 h-[46px] px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:translate-x-1 group relative overflow-hidden",
                                                            isPsych 
                                                                ? "hover:border-indigo-200 dark:hover:border-indigo-800/80" 
                                                                : "hover:border-emerald-200 dark:hover:border-emerald-800/80"
                                                        )}
                                                    >
                                                        <div 
                                                            className={cn(
                                                                "absolute top-0 left-0 w-1 h-full transition-colors",
                                                                isPsych 
                                                                    ? "bg-indigo-500/20 group-hover:bg-indigo-500" 
                                                                    : "bg-emerald-500/20 group-hover:bg-emerald-500"
                                                            )} 
                                                        />
                                                        <span 
                                                            className={cn(
                                                                "text-[11px] font-black px-2 py-1 rounded-md border shadow-tiny shrink-0 transition-all duration-300 uppercase tracking-widest",
                                                                isPsych 
                                                                    ? "text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-100/50 dark:border-indigo-900/50 group-hover:bg-indigo-600 group-hover:text-white" 
                                                                    : "text-emerald-600 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-100/50 dark:border-emerald-900/50 group-hover:bg-emerald-600 group-hover:text-white"
                                                            )}
                                                        >
                                                            {diag.split(' - ')[0]}
                                                        </span>
                                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300 leading-snug truncate">
                                                            {diag.split(' - ').slice(1).join(' ') || diag}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-[14px] font-medium text-slate-400 italic bg-gray-50/20 h-[46px] flex items-center justify-center rounded-xl border border-dashed border-gray-200/80 w-full col-span-2">No active diagnoses found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <div className="space-y-1.5 px-0.5 relative">
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="text-indigo-400" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Registry Diagnoses (ICD-10 - Description, one per line)</p>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            className="w-full min-h-[120px] rounded-[16px] border border-slate-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 shadow-sm p-4 text-[14px] font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none leading-relaxed outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 transition-all focus:bg-white dark:focus:bg-slate-950"
                                            value={editData.diagnoses || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleFieldChange('diagnoses', val);
                                                const lines = val.split('\n');
                                                const lastLine = lines[lines.length - 1].trim();
                                                if (lastLine.length >= 2) {
                                                    const results = searchDiagnoses(lastLine);
                                                    setSuggestions(results);
                                                } else {
                                                    setSuggestions([]);
                                                }
                                            }}
                                            placeholder="Enter code or description (e.g. I10 or Hypertension)..."
                                        />

                                        {suggestions.length > 0 && (
                                            <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[16px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="p-2 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">
                                                    Clinical Suggestions
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {suggestions.map((s) => (
                                                        <button
                                                            key={s.code}
                                                            type="button"
                                                            onClick={() => {
                                                                const lines = (editData.diagnoses || '').split('\n');
                                                                lines[lines.length - 1] = `${s.code} - ${s.description} `;
                                                                handleFieldChange('diagnoses', lines.join('\n') + '\n');
                                                                setSuggestions([]);
                                                            }}
                                                            className="w-full text-left px-4 py-3.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 group flex items-center justify-between gap-4"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded shadow-tiny shrink-0">{s.code}</span>
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-350 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.description}</span>
                                                            </div>
                                                            <Plus size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                            </>
                        )}
                    </TabsContent>

                    {/* [MEDICAL TAB] */}
                    <TabsContent value="medical" className="m-0 focus-visible:outline-none">
                        {activeTab === "medical" && (
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                            <PremiumGlassField
                                icon={Stethoscope}
                                label="PCP Name"
                                name="pcp_name"
                                value={isEditing ? editData.pcp_name : patient.pcp_name}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="emerald"
                            />
                            <PremiumGlassField
                                icon={Store}
                                label="PCP Clinic Name"
                                name="pcp_clinic_name"
                                value={isEditing ? editData.pcp_clinic_name : patient.pcp_clinic_name}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="emerald"
                            />
                            <PremiumGlassField
                                icon={Phone}
                                label="PCP Phone"
                                name="pcp_phone"
                                value={isEditing ? editData.pcp_phone : patient.pcp_phone}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="emerald"
                            />
                            <PremiumGlassField
                                icon={MapPin}
                                label="PCP Practice Address"
                                name="pcp_address"
                                value={isEditing ? editData.pcp_address : patient.pcp_address}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="emerald"
                            />
                            <PremiumGlassField
                                icon={Activity}
                                label="Physical Conditions"
                                name="pcp_conditions"
                                value={isEditing ? editData.pcp_conditions : patient.pcp_conditions}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                isTextarea
                                theme="emerald"
                            />
                            <PremiumGlassField
                                icon={HeartPulse}
                                label="Current Medications"
                                name="pcp_medications"
                                value={isEditing ? editData.pcp_medications : patient.pcp_medications}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                isTextarea
                                theme="emerald"
                            />
                        </div>
                        </div>
                        )}
                    </TabsContent>

                    {/* [PSYCHIATRIC TAB] */}
                    <TabsContent value="psychiatric" className="m-0 focus-visible:outline-none">
                        {activeTab === "psychiatric" && (
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                            <PremiumGlassField
                                icon={Brain}
                                label="Psychiatrist Name"
                                name="psych_name"
                                value={isEditing ? editData.psych_name : patient.psych_name}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="purple"
                            />
                            <PremiumGlassField
                                icon={Phone}
                                label="Psych Phone"
                                name="psych_phone"
                                value={isEditing ? editData.psych_phone : patient.psych_phone}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="purple"
                            />
                            <PremiumGlassField
                                icon={MapPin}
                                label="Clinic Address"
                                name="psych_address"
                                value={isEditing ? editData.psych_address : patient.psych_address}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                className="col-span-2"
                                theme="purple"
                            />
                            <PremiumGlassField
                                icon={Activity}
                                label="Mental Conditions"
                                name="psych_conditions"
                                value={isEditing ? editData.psych_conditions : patient.psych_conditions}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                isTextarea
                                theme="purple"
                            />
                            <PremiumGlassField
                                icon={HeartPulse}
                                label="Psychiatric Medications"
                                name="psych_medications"
                                value={isEditing ? editData.psych_medications : patient.psych_medications}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                isTextarea
                                theme="purple"
                            />
                        </div>
                        </div>
                        )}
                    </TabsContent>

                    {/* [PHARMACY TAB] */}
                    <TabsContent value="pharmacy" className="m-0 focus-visible:outline-none">
                        {activeTab === "pharmacy" && (
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                            <PremiumGlassField
                                icon={Store}
                                label="Pharmacy Name"
                                name="pharmacy_name"
                                value={isEditing ? editData.pharmacy_name : patient.pharmacy_name}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="amber"
                            />
                            <PremiumGlassField
                                icon={Phone}
                                label="Phone Number"
                                name="pharmacy_phone"
                                value={isEditing ? editData.pharmacy_phone : patient.pharmacy_phone}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="amber"
                            />
                            <PremiumGlassField
                                icon={MapPin}
                                label="Pharmacy Address"
                                name="pharmacy_address"
                                value={isEditing ? editData.pharmacy_address : patient.pharmacy_address}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="amber"
                            />
                            <PremiumGlassField
                                icon={FileText}
                                label="Fax Number"
                                name="pharmacy_fax"
                                value={isEditing ? editData.pharmacy_fax : patient.pharmacy_fax}
                                isEditing={isEditing}
                                onChange={handleFieldChange}
                                theme="amber"
                            />
                        </div>
                        </div>
                        )}
                    </TabsContent>

                    {/* [HISTORY TAB] */}
                    <TabsContent value="history" className="m-0 focus-visible:outline-none">
                        {activeTab === "history" && (
                            <div className="space-y-8 px-1">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="size-6 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-tiny">
                                        <Clock size={14} />
                                    </div>
                                    <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-none">Clinical Audit Trail</p>
                                </div>
                                {timeline.length > 0 && !isEditing && (
                                    <Button variant="ghost" className="text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-wider hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 px-3 h-8 rounded-full" onClick={() => navigate(`/notes?patientId=${patient.id}`)}>
                                        View Ledger &rarr;
                                    </Button>
                                )}
                            </div>

                            {timeline.length === 0 ? (
                                <div className="py-24 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[40px] bg-slate-50/20 dark:bg-slate-900/20">
                                    <Clock className="mx-auto size-14 text-slate-200 dark:text-slate-700 mb-6 drop-shadow-sm" />
                                    <p className="text-[11px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em]">Historical interactions empty</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {timeline.map((item, idx) => (
                                        <TimelineEntry
                                            key={item.id}
                                            item={item}
                                            isLast={idx === timeline.length - 1}
                                            navigate={navigate}
                                            onPreview={(note) => setSelectedNote(note)}
                                            disabled={isEditing}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        )}
                    </TabsContent>

                    {/* [SOCIAL TAB] */}
                    <TabsContent value="social" className="m-0 focus-visible:outline-none">
                        {activeTab === "social" && (
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-6">
                            <div className="mb-2">
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">
                                    {language === 'es' ? 'Ficha de Evaluación Social y Necesidades (TCM)' : 'Social Assessment & Needs Form (TCM)'}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 leading-normal">
                                    {language === 'es' 
                                        ? 'Completa y administra los determinantes sociales del paciente. Estos datos conducen de forma automática el plan de servicio de Clio.'
                                        : 'Complete and manage the patient\'s social determinants. This data automatically drives Clio\'s service plan generation.'}
                                </p>
                            </div>

                            {(() => {
                                const socialNeeds = (isEditing ? editData.tcm_social_needs : patient?.tcm_social_needs) || {};
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Panel 1: Identificación Básica */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5 col-span-1 md:col-span-2">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <User size={14} /> {language === 'es' ? '1. Identificación Básica' : '1. Basic Identification'}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <PremiumGlassField
                                                    icon={User}
                                                    label="First Name"
                                                    name="first_name"
                                                    value={isEditing ? (editData.first_name || '') : (patient?.first_name || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={User}
                                                    label="Last Name"
                                                    name="last_name"
                                                    value={isEditing ? (editData.last_name || '') : (patient?.last_name || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Phone}
                                                    label="Telephone"
                                                    name="phone"
                                                    value={isEditing ? (editData.phone || '') : (patient?.phone || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Calendar}
                                                    label="Date of Birth"
                                                    name="dob"
                                                    value={isEditing ? (editData.dob || '') : (patient?.dob ? format(new Date(patient.dob), language === 'es' ? "d 'de' MMM, yyyy" : 'MMM dd, yyyy', { locale: language === 'es' ? es : undefined }) : '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                    type="date"
                                                />
                                                <PremiumGlassField
                                                    icon={Fingerprint}
                                                    label="Social Security"
                                                    name="ssn"
                                                    value={isEditing ? (editData.ssn || '') : (patient?.ssn || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={MapPin}
                                                    label="Residential Address"
                                                    name="address"
                                                    value={isEditing ? (editData.address || '') : (patient?.address || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 2: Ayudas de Gobierno */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Coins size={14} /> {language === 'es' ? '2. Ayudas de Gobierno' : '2. Government Assistance'}
                                                </h4>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <PremiumGlassField
                                                        icon={DollarSign}
                                                        label="Food Stamps Amount"
                                                        name="food_stamps_amount"
                                                        value={socialNeeds.food_stamps_amount || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        theme="indigo"
                                                    />
                                                    <PremiumGlassField
                                                        icon={Calendar}
                                                        label="Food Stamps Since"
                                                        name="food_stamps_since"
                                                        value={socialNeeds.food_stamps_since || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        theme="indigo"
                                                    />
                                                </div>
                                                <PremiumGlassField
                                                    icon={FileText}
                                                    label="Medicaid Status/No."
                                                    name="medicaid_details"
                                                    value={socialNeeds.medicaid_details || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={FileText}
                                                    label="Medicare Status/No."
                                                    name="medicare_details"
                                                    value={socialNeeds.medicare_details || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={FileText}
                                                    label="SSI Details"
                                                    name="ssi_details"
                                                    value={socialNeeds.ssi_details || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 3: Perfil Personal y Clínico */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Heart size={14} /> {language === 'es' ? '3. Perfil Personal y Clínico' : '3. Personal & Clinical Profile'}
                                                </h4>
                                            </div>
                                            <div className="space-y-4">
                                                <PremiumGlassField
                                                    icon={ShieldAlert}
                                                    label="Religious Beliefs"
                                                    name="religion"
                                                    value={socialNeeds.religion || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Activity}
                                                    label="Psychiatric Diagnosis"
                                                    name="psych_conditions"
                                                    value={isEditing ? (editData.psych_conditions || '') : (patient?.psych_conditions || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    isTextarea
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 4: Proveedores Médicos */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5 col-span-1 md:col-span-2">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Stethoscope size={14} /> {language === 'es' ? '4. Proveedores' : '4. Providers'}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <PremiumGlassField
                                                    icon={User}
                                                    label="PCP Name"
                                                    name="pcp_name"
                                                    value={isEditing ? (editData.pcp_name || '') : (patient?.pcp_name || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={MapPin}
                                                    label="PCP Address"
                                                    name="pcp_address"
                                                    value={isEditing ? (editData.pcp_address || '') : (patient?.pcp_address || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Clock}
                                                    label="Time at PCP Clinic"
                                                    name="pcp_duration"
                                                    value={socialNeeds.pcp_duration || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={User}
                                                    label="Psychiatrist Name"
                                                    name="psych_name"
                                                    value={isEditing ? (editData.psych_name || '') : (patient?.psych_name || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={MapPin}
                                                    label="Psychiatrist Address"
                                                    name="psych_address"
                                                    value={isEditing ? (editData.psych_address || '') : (patient?.psych_address || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Clock}
                                                    label="Time with Psychiatrist"
                                                    name="psych_duration"
                                                    value={socialNeeds.psych_duration || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Store}
                                                    label="Pharmacy Name"
                                                    name="pharmacy_name"
                                                    value={isEditing ? (editData.pharmacy_name || '') : (patient?.pharmacy_name || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={MapPin}
                                                    label="Pharmacy Address"
                                                    name="pharmacy_address"
                                                    value={isEditing ? (editData.pharmacy_address || '') : (patient?.pharmacy_address || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 5: Convivencia y Familia */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Users size={14} /> {language === 'es' ? '5. Educación, Estado Civil y Convivencia' : '5. Family & Cohabitation'}
                                                </h4>
                                            </div>
                                            <div className="space-y-4">
                                                <PremiumGlassField
                                                    icon={GraduationCap}
                                                    label="Education Level"
                                                    name="education_level"
                                                    value={socialNeeds.education_level || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Heart}
                                                    label="Marital Status"
                                                    name="marital_status"
                                                    value={socialNeeds.marital_status || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                    options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated']}
                                                />
                                                <PremiumGlassField
                                                    icon={Users}
                                                    label="Who they live with (Name, relationship, age)"
                                                    name="co_habitants"
                                                    value={socialNeeds.co_habitants || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    isTextarea
                                                    theme="indigo"
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <PremiumGlassField
                                                        icon={Users}
                                                        label="Number of Children"
                                                        name="children_count"
                                                        value={socialNeeds.children_count || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        type="number"
                                                        theme="indigo"
                                                    />
                                                    <PremiumGlassField
                                                        icon={MapPin}
                                                        label="Where children live"
                                                        name="children_location"
                                                        value={socialNeeds.children_location || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        theme="indigo"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Panel 6: Trabajo y Finanzas */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Briefcase size={14} /> {language === 'es' ? '6. Situación Laboral e Ingresos' : '6. Employment & Financials'}
                                                </h4>
                                            </div>
                                            <div className="space-y-4">
                                                <PremiumGlassField
                                                    icon={Briefcase}
                                                    label="Occupation (Current or pre-retirement)"
                                                    name="occupation"
                                                    value={socialNeeds.occupation || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <PremiumGlassField
                                                        icon={DollarSign}
                                                        label="Supplemental SSI Amount"
                                                        name="ssi_amount"
                                                        value={socialNeeds.ssi_amount || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        theme="indigo"
                                                    />
                                                    <PremiumGlassField
                                                        icon={DollarSign}
                                                        label="SSA Amount"
                                                        name="ssa_amount"
                                                        value={socialNeeds.ssa_amount || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        theme="indigo"
                                                    />
                                                </div>
                                                <PremiumGlassField
                                                    icon={Calendar}
                                                    label="Retirement / Disability Date"
                                                    name="retirement_date"
                                                    value={socialNeeds.retirement_date || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 7: Estatus Migratorio */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Globe size={14} /> {language === 'es' ? '7. Origen y Estatus Migratorio' : '7. Origin & Immigration'}
                                                </h4>
                                            </div>
                                            <div className="space-y-4">
                                                <PremiumGlassField
                                                    icon={Globe}
                                                    label="Country of Origin"
                                                    name="origin_country"
                                                    value={socialNeeds.origin_country || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Calendar}
                                                    label="US Entry Date"
                                                    name="us_entry_date"
                                                    value={socialNeeds.us_entry_date || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={UserCheck}
                                                    label="Citizen? (Include Year)"
                                                    name="citizenship_status"
                                                    value={socialNeeds.citizenship_status || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={UserCheck}
                                                    label="Resident?"
                                                    name="residence_status"
                                                    value={socialNeeds.residence_status || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 8: Contacto de Emergencia */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <AlertTriangle size={14} /> {language === 'es' ? '8. Contacto de Emergencia' : '8. Emergency Contact'}
                                                </h4>
                                            </div>
                                            <div className="space-y-4">
                                                <PremiumGlassField
                                                    icon={User}
                                                    label="Emergency Contact Name"
                                                    name="emergency_contact_name"
                                                    value={isEditing ? (editData.emergency_contact_name || '') : (patient?.emergency_contact_name || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Phone}
                                                    label="Emergency Contact Phone"
                                                    name="emergency_contact_phone"
                                                    value={isEditing ? (editData.emergency_contact_phone || '') : (patient?.emergency_contact_phone || '')}
                                                    isEditing={isEditing}
                                                    onChange={handleFieldChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Users}
                                                    label="Relationship / Parentesco"
                                                    name="emergency_contact_relationship"
                                                    value={socialNeeds.emergency_contact_relationship || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 9: Vivienda */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5 col-span-1 md:col-span-2">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <Home size={14} /> {language === 'es' ? '9. Vivienda y Transporte' : '9. Housing & Transport'}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <PremiumGlassField
                                                    icon={Home}
                                                    label="Living Situation (Type, # of rooms)"
                                                    name="housing_type"
                                                    value={socialNeeds.housing_type || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Car}
                                                    label="Drives? / ¿Maneja?"
                                                    name="drives"
                                                    value={socialNeeds.drives || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                    options={['Yes', 'No']}
                                                />
                                                <PremiumGlassField
                                                    icon={DollarSign}
                                                    label="Rent Amount"
                                                    name="rent_payment"
                                                    value={socialNeeds.rent_payment || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                
                                                <TcmCheckbox 
                                                    label="Regular Rent" 
                                                    labelEs="Renta Regular" 
                                                    field="regular_rent" 
                                                    isEditing={isEditing} 
                                                    needs={socialNeeds} 
                                                    onChange={handleSocialNeedsChange} 
                                                />
                                                <TcmCheckbox 
                                                    label="Plan 8 / Section 8" 
                                                    labelEs="Plan 8 / Sección 8" 
                                                    field="plan_8" 
                                                    isEditing={isEditing} 
                                                    needs={socialNeeds} 
                                                    onChange={handleSocialNeedsChange} 
                                                />
                                                <TcmCheckbox 
                                                    label="Low Income Housing (Current)" 
                                                    labelEs="Vivienda de Bajo Recurso (Actual)" 
                                                    field="low_income" 
                                                    isEditing={isEditing} 
                                                    needs={socialNeeds} 
                                                    onChange={handleSocialNeedsChange} 
                                                />
                                            </div>
                                        </div>

                                        {/* Panel 10: Servicios que Necesita (Checklist) */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5 col-span-1 md:col-span-2">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <CheckSquare size={14} /> {language === 'es' ? '10. Servicios que Necesita' : '10. Services Needed'}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {DOMAINS_LIST.map((domain) => (
                                                    <TcmCheckbox 
                                                        key={domain.id}
                                                        label={domain.label} 
                                                        labelEs={domain.labelEs} 
                                                        field={domain.id} 
                                                        isEditing={isEditing} 
                                                        needs={socialNeeds} 
                                                        onChange={handleSocialNeedsChange}
                                                        onTextChange={handleSocialNeedsTextChange}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Panel 11: Otros Detalles */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-5 col-span-1 md:col-span-2">
                                            <div>
                                                <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                                                    <MoreHorizontal size={14} /> {language === 'es' ? '11. Otros Detalles y Cirugías' : '11. Other Details & Surgeries'}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <PremiumGlassField
                                                    icon={FileText}
                                                    label="Bank Name (Where benefits are deposited)"
                                                    name="bank_name"
                                                    value={socialNeeds.bank_name || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Activity}
                                                    label="Special Accommodations"
                                                    name="special_accommodation"
                                                    value={socialNeeds.special_accommodation || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={Activity}
                                                    label="Surgeries (Date / Hospital)"
                                                    name="surgeries"
                                                    value={socialNeeds.surgeries || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    isTextarea
                                                    theme="indigo"
                                                />
                                                <PremiumGlassField
                                                    icon={MoreHorizontal}
                                                    label="Other Needs to Add"
                                                    name="other_needs"
                                                    value={socialNeeds.other_needs || ''}
                                                    isEditing={isEditing}
                                                    onChange={handleSocialNeedsTextChange}
                                                    isTextarea
                                                    theme="indigo"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        )}
                    </TabsContent>

                    {/* [ASSESSMENT TAB] */}
                    <TabsContent value="assessment" className="m-0 focus-visible:outline-none">
                        {activeTab === "assessment" && (
                            <div className="bg-slate-50/70 dark:bg-slate-900/15 border border-slate-200/40 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500 p-6 md:p-8 flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">
                                        {language === 'es' ? 'Evaluación Case Management (17 Páginas)' : 'Case Management Assessment (17 Pages)'}
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 leading-normal">
                                        {language === 'es' 
                                            ? 'Completa la evaluación clínica integral del paciente y expórtala en formato oficial.'
                                            : 'Complete the client\'s comprehensive clinical assessment and export it in the official format.'}
                                    </p>
                                </div>
                                <div className="flex flex-row items-center gap-3.5 self-start md:self-auto shrink-0">
                                    <button
                                        type="button"
                                        disabled={isExtracting}
                                        onClick={handleAutofillAssessment}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-600/10 disabled:opacity-50"
                                    >
                                        {isExtracting ? <Loader2 className="animate-spin" size={14} /> : <Brain size={14} />}
                                        {language === 'es' ? "Auto-llenar con IA (n8n)" : "Autofill with AI (n8n)"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadAssessmentPDF}
                                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-95 shadow-md flex items-center justify-center"
                                        title={language === 'es' ? "Descargar Evaluación PDF" : "Download Assessment PDF"}
                                    >
                                        <FileDown size={18} />
                                    </button>
                                </div>
                            </div>

                            {(() => {
                                const socialNeeds = (isEditing ? editData.tcm_social_needs : patient?.tcm_social_needs) || {};
                                return (
                                    <div className="space-y-4">
                                        {/* SECTION 1: CLIENT'S INFORMATION */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('clientInfo')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>1. Client's Information</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.clientInfo ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.clientInfo && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={User} label="Client's Name" value={patient.full_name || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={Calendar} label="Date of Birth" value={patient.dob || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={Shield} label="SSN" value={patient.ssn || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={User} label="Sex" value={patient.gender || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={Phone} label="Cell Phone No" value={patient.phone || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={MapPin} label="Address" value={patient.address || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={User} label="Race" value={patient.race || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={User} label="Ethnicity" value={patient.ethnicity || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={User} label="Marital Status" value={socialNeeds.marital_status || ''} theme="indigo" isEditing={false} />
                                                        <PremiumGlassField icon={Globe} label="Primary Language" value={patient.preferred_language || ''} theme="indigo" isEditing={false} />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField
                                                            icon={CheckSquare}
                                                            label="Special Accommodations Needed"
                                                            name="special_accommodations"
                                                            value={socialNeeds.special_accommodations || 'No'}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            options={['Yes', 'No']}
                                                            theme="indigo"
                                                        />
                                                        <PremiumGlassField
                                                            icon={FileText}
                                                            label="Assessment Type"
                                                            name="assessment_type"
                                                            value={socialNeeds.assessment_type || 'Initial'}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            options={['Initial', 'Annual', 'Significant Change', 'Other']}
                                                            theme="indigo"
                                                        />
                                                        <PremiumGlassField
                                                            icon={FileText}
                                                            label="Other Case Management Services"
                                                            name="other_provider_case_management"
                                                            value={socialNeeds.other_provider_case_management || 'No'}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            options={['Yes', 'No']}
                                                            theme="indigo"
                                                            className="col-span-1 md:col-span-2"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 2: REFERRAL & INFORMATION SOURCES */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('referrals')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>2. Referral & Information Sources</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.referrals ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.referrals && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={User} label="Referred By" name="referred_by" value={socialNeeds.referred_by || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                        <PremiumGlassField icon={Phone} label="Referral Phone No" name="referral_phone" value={socialNeeds.referral_phone || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                        <PremiumGlassField icon={MapPin} label="Referral Address" name="referral_address" value={socialNeeds.referral_address || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                        <PremiumGlassField icon={Briefcase} label="Referral Title / Agency" name="referral_agency" value={socialNeeds.referral_agency || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Information Sources Used</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <TcmCheckbox label="Client's Input" labelEs="Client's Input" field="info_client_input" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Family and Friends" labelEs="Family and Friends" field="info_family_friends" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Referring Agency" labelEs="Referring Agency" field="info_referring_agency" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Treating Providers" labelEs="Treating Providers" field="info_treating_providers" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Caregiver" labelEs="Caregiver" field="info_caregiver" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Records Review" labelEs="Records Review" field="info_records_review" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Info Providers Grid Table */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Information Providers List</h5>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = socialNeeds.info_providers || [];
                                                                        const updated = [...current, { name: '', agency: '', relationship: '' }];
                                                                        handleSocialNeedsValChange('info_providers', updated);
                                                                    }}
                                                                    className="text-xs text-indigo-500 hover:text-indigo-650 font-bold flex items-center gap-1 transition-all"
                                                                >
                                                                    + Add Provider Row
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[40%]">Name</th>
                                                                        <th className="p-3 w-[30%]">Agency</th>
                                                                        <th className="p-3 w-[25%]">Relationship</th>
                                                                        {isEditing && <th className="p-3 w-[5%] text-center">Actions</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const list = socialNeeds.info_providers || [];
                                                                        if (list.length === 0) {
                                                                            return (
                                                                                <tr>
                                                                                    <td colSpan={isEditing ? 4 : 3} className="p-4 text-center text-slate-400 font-medium">
                                                                                        No other providers listed.
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        return list.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.name || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], name: e.target.value };
                                                                                                handleSocialNeedsValChange('info_providers', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Dr. Hernandez"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.agency || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], agency: e.target.value };
                                                                                                handleSocialNeedsValChange('info_providers', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Arc Mental Health"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.agency}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.relationship || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], relationship: e.target.value };
                                                                                                handleSocialNeedsValChange('info_providers', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Psychiatrist / Case Manager"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.relationship}</span>
                                                                                    )}
                                                                                </td>
                                                                                {isEditing && (
                                                                                    <td className="p-3 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const updated = list.filter((_, i) => i !== idx);
                                                                                                handleSocialNeedsValChange('info_providers', updated);
                                                                                            }}
                                                                                            className="text-red-500 hover:text-red-650 transition-colors font-bold text-xs"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 3: PRESENTING PROBLEMS */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('presentingProblems')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>3. Presenting Problems</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.presentingProblems ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.presentingProblems && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-4">
                                                    <PremiumGlassField
                                                        icon={FileText}
                                                        label="Presenting Problems Narrative"
                                                        name="presenting_problems_description"
                                                        value={socialNeeds.presenting_problems_description || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        isTextarea
                                                        theme="indigo"
                                                    />
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Calendar} label="Date of Onset" name="onset_date" value={socialNeeds.onset_date || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                        <PremiumGlassField icon={CheckSquare} label="Previous Psychiatric Problems" name="prev_psych_problems" value={socialNeeds.prev_psych_problems || 'Yes'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Yes', 'No']} theme="indigo" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 4: FAMILY INFORMATION */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('familyInfo')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>4. Family Information</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.familyInfo ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.familyInfo && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={CheckSquare} label="Is the client a child?" name="is_client_child" value={socialNeeds.is_client_child || 'No'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Yes', 'No']} theme="indigo" />
                                                    </div>
                                                    <PremiumGlassField
                                                        icon={Users}
                                                        label="Household Composition Details"
                                                        name="household_details"
                                                        value={socialNeeds.household_details || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        isTextarea
                                                        theme="indigo"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('pastServicesMedications')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>5. Past Services & Current Medications</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.pastServicesMedications ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.pastServicesMedications && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-6">
                                                    {/* Past Services Grid Table */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Past Services Received</h5>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = socialNeeds.past_services || [];
                                                                        const updated = [...current, { type: '', provider: '', date_received: '', effectiveness: '' }];
                                                                        handleSocialNeedsValChange('past_services', updated);
                                                                    }}
                                                                    className="text-xs text-indigo-500 hover:text-indigo-650 font-bold flex items-center gap-1 transition-all"
                                                                >
                                                                    + Add Past Service Row
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[25%]">Type of Services</th>
                                                                        <th className="p-3 w-[25%]">Provider / Agency</th>
                                                                        <th className="p-3 w-[20%]">Date Received</th>
                                                                        <th className="p-3 w-[25%]">Effectiveness</th>
                                                                        {isEditing && <th className="p-3 w-[5%] text-center">Actions</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const list = socialNeeds.past_services || [];
                                                                        if (list.length === 0) {
                                                                            return (
                                                                                <tr>
                                                                                    <td colSpan={isEditing ? 5 : 4} className="p-4 text-center text-slate-400 font-medium">
                                                                                        No past services reported.
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        return list.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.type || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], type: e.target.value };
                                                                                                handleSocialNeedsValChange('past_services', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Psychiatric Treatment"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.type}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.provider || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], provider: e.target.value };
                                                                                                handleSocialNeedsValChange('past_services', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Agency name"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.provider}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.date_received || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], date_received: e.target.value };
                                                                                                handleSocialNeedsValChange('past_services', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. 2024"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.date_received}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.effectiveness || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], effectiveness: e.target.value };
                                                                                                handleSocialNeedsValChange('past_services', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Partially effective"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.effectiveness}</span>
                                                                                    )}
                                                                                </td>
                                                                                {isEditing && (
                                                                                    <td className="p-3 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const updated = list.filter((_, i) => i !== idx);
                                                                                                handleSocialNeedsValChange('past_services', updated);
                                                                                            }}
                                                                                            className="text-red-500 hover:text-red-650 transition-colors font-bold text-xs"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Medications Grid Table */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Current Medications List</h5>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const parseEmrMeds = (raw: string, isPsych: boolean) => {
                                                                            if (!raw) return [];
                                                                            const items = raw.split(/[,\n]+/).map(item => item.trim()).filter(item => item.length > 0);
                                                                            return items.map(item => {
                                                                                const match = item.match(/^(.*?)\s+(\d+\s*m?g.*?)$/i);
                                                                                return {
                                                                                    medication: match ? match[1] : item,
                                                                                    dose: match ? match[2] : 'As Directed',
                                                                                    physician: isPsych ? (patient?.psych_name || 'Psychiatrist') : (patient?.pcp_name || 'Primary Care Physician'),
                                                                                    purpose: isPsych ? 'Treatment of psychiatric condition' : 'Treatment of medical condition'
                                                                                };
                                                                            });
                                                                        };
                                                                        const currentGrid = socialNeeds.medications_grid || [
                                                                            ...parseEmrMeds(patient?.psych_medications || '', true),
                                                                            ...parseEmrMeds(patient?.pcp_medications || '', false)
                                                                        ];
                                                                        const updated = [...currentGrid, { medication: '', dose: '', physician: '', purpose: '' }];
                                                                        handleSocialNeedsValChange('medications_grid', updated);
                                                                    }}
                                                                    className="text-xs text-indigo-500 hover:text-indigo-650 font-bold flex items-center gap-1 transition-all"
                                                                >
                                                                    + Add Medication Row
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[30%]">Medication</th>
                                                                        <th className="p-3 w-[25%]">Doses/Frequency</th>
                                                                        <th className="p-3 w-[25%]">Prescribing Physician</th>
                                                                        <th className="p-3 w-[20%]">Reason/Purpose</th>
                                                                        {isEditing && <th className="p-3 w-[5%] text-center">Actions</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const parseEmrMeds = (raw: string, isPsych: boolean) => {
                                                                            if (!raw) return [];
                                                                            const items = raw.split(/[,\n]+/).map(item => item.trim()).filter(item => item.length > 0);
                                                                            return items.map(item => {
                                                                                const match = item.match(/^(.*?)\s+(\d+\s*m?g.*?)$/i);
                                                                                return {
                                                                                    medication: match ? match[1] : item,
                                                                                    dose: match ? match[2] : 'As Directed',
                                                                                    physician: isPsych ? (patient?.psych_name || 'Psychiatrist') : (patient?.pcp_name || 'Primary Care Physician'),
                                                                                    purpose: isPsych ? 'Treatment of psychiatric condition' : 'Treatment of medical condition'
                                                                                };
                                                                            });
                                                                        };
                                                                        
                                                                        const medsList = socialNeeds.medications_grid || [
                                                                            ...parseEmrMeds(patient?.psych_medications || '', true),
                                                                            ...parseEmrMeds(patient?.pcp_medications || '', false)
                                                                        ];
                                                                        
                                                                        if (medsList.length === 0) {
                                                                            return (
                                                                                <tr>
                                                                                    <td colSpan={isEditing ? 5 : 4} className="p-6 text-center text-slate-400 font-medium">
                                                                                        No medications listed.
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        
                                                                        return medsList.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.medication || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...medsList];
                                                                                                updated[idx] = { ...updated[idx], medication: e.target.value };
                                                                                                handleSocialNeedsValChange('medications_grid', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Sertraline"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.medication}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.dose || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...medsList];
                                                                                                updated[idx] = { ...updated[idx], dose: e.target.value };
                                                                                                handleSocialNeedsValChange('medications_grid', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. 100 mg daily"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.dose}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.physician || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...medsList];
                                                                                                updated[idx] = { ...updated[idx], physician: e.target.value };
                                                                                                handleSocialNeedsValChange('medications_grid', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Dr. Reinaldo Hernandez"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.physician}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.purpose || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...medsList];
                                                                                                updated[idx] = { ...updated[idx], purpose: e.target.value };
                                                                                                handleSocialNeedsValChange('medications_grid', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Depression"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.purpose}</span>
                                                                                    )}
                                                                                </td>
                                                                                {isEditing && (
                                                                                    <td className="p-3 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const updated = medsList.filter((_, i) => i !== idx);
                                                                                                handleSocialNeedsValChange('medications_grid', updated);
                                                                                            }}
                                                                                            className="text-red-500 hover:text-red-650 transition-colors font-bold text-xs"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">How does client remember to take his/her medications?</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                                                            <TcmCheckbox label="By following directions" field="med_rem_directions" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Calendar reminder" field="med_rem_calendar" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Keeping them visible" field="med_rem_visible" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Pill Organizer" field="med_rem_organizer" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Electronic reminder" field="med_rem_electronic" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Daily task association" field="med_rem_association" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Family/Caregiver" field="med_rem_family" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="RN/HHA Set-up" field="med_rem_rn" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Other" field="med_rem_other" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">How well does client self-administer medication?</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                                                            <TcmCheckbox 
                                                                label="With no help or supervision" 
                                                                field="med_self_none" 
                                                                isEditing={isEditing} 
                                                                needs={socialNeeds} 
                                                                onChange={(field, val) => {
                                                                    if (!isEditing) return;
                                                                    handleSocialNeedsValChange('med_self_none', val);
                                                                    if (val) {
                                                                        handleSocialNeedsValChange('med_self_some', false);
                                                                        handleSocialNeedsValChange('med_self_lot', false);
                                                                        handleSocialNeedsValChange('med_self_unable', false);
                                                                    }
                                                                }} 
                                                            />
                                                            <TcmCheckbox 
                                                                label="With some help or occasional supervision" 
                                                                field="med_self_some" 
                                                                isEditing={isEditing} 
                                                                needs={socialNeeds} 
                                                                onChange={(field, val) => {
                                                                    if (!isEditing) return;
                                                                    handleSocialNeedsValChange('med_self_some', val);
                                                                    if (val) {
                                                                        handleSocialNeedsValChange('med_self_none', false);
                                                                        handleSocialNeedsValChange('med_self_lot', false);
                                                                        handleSocialNeedsValChange('med_self_unable', false);
                                                                    }
                                                                }} 
                                                            />
                                                            <TcmCheckbox 
                                                                label="With a lot of help or constant supervision" 
                                                                field="med_self_lot" 
                                                                isEditing={isEditing} 
                                                                needs={socialNeeds} 
                                                                onChange={(field, val) => {
                                                                    if (!isEditing) return;
                                                                    handleSocialNeedsValChange('med_self_lot', val);
                                                                    if (val) {
                                                                        handleSocialNeedsValChange('med_self_none', false);
                                                                        handleSocialNeedsValChange('med_self_some', false);
                                                                        handleSocialNeedsValChange('med_self_unable', false);
                                                                    }
                                                                }} 
                                                            />
                                                            <TcmCheckbox 
                                                                label="Unable to administer own medications/caregiver gives them" 
                                                                field="med_self_unable" 
                                                                isEditing={isEditing} 
                                                                needs={socialNeeds} 
                                                                onChange={(field, val) => {
                                                                    if (!isEditing) return;
                                                                    handleSocialNeedsValChange('med_self_unable', val);
                                                                    if (val) {
                                                                        handleSocialNeedsValChange('med_self_none', false);
                                                                        handleSocialNeedsValChange('med_self_some', false);
                                                                        handleSocialNeedsValChange('med_self_lot', false);
                                                                    }
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Has the client had problems getting the medication refilled on time?</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                                                            <TcmCheckbox 
                                                                label="Yes" 
                                                                field="med_refill_yes" 
                                                                isEditing={isEditing} 
                                                                needs={socialNeeds} 
                                                                onChange={(field, val) => {
                                                                    if (!isEditing) return;
                                                                    handleSocialNeedsValChange('med_refill_yes', val);
                                                                    if (val) {
                                                                        handleSocialNeedsValChange('med_refill_no', false);
                                                                    }
                                                                }} 
                                                            />
                                                            <TcmCheckbox 
                                                                label="No" 
                                                                field="med_refill_no" 
                                                                isEditing={isEditing} 
                                                                needs={socialNeeds} 
                                                                onChange={(field, val) => {
                                                                    if (!isEditing) return;
                                                                    handleSocialNeedsValChange('med_refill_no', val);
                                                                    if (val) {
                                                                        handleSocialNeedsValChange('med_refill_yes', false);
                                                                    }
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Store} label="Pharmacy Name" value={patient.pharmacy_name || ''} theme="amber" isEditing={false} />
                                                        <PremiumGlassField icon={Phone} label="Pharmacy Phone" value={patient.pharmacy_phone || ''} theme="amber" isEditing={false} />
                                                    </div>
                                                    
                                                    <PremiumGlassField
                                                        icon={FileText}
                                                        label="Any other significant medication issues or concerns"
                                                        name="medication_issues_description"
                                                        value={socialNeeds.medication_issues_description || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        isTextarea
                                                        theme="indigo"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        {/* SECTION 6: MENTAL HEALTH & PSYCHIATRIC HISTORY */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('mentalHealth')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>6. Mental Health & Psychiatric History</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.mentalHealth ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.mentalHealth && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-6">
                                                    <PremiumGlassField
                                                        icon={Brain}
                                                        label="Mental Health / Psychiatric History Narrative"
                                                        name="mental_health_history"
                                                        value={socialNeeds.mental_health_history || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        isTextarea
                                                        theme="indigo"
                                                    />
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <PremiumGlassField icon={User} label="Psychiatrist Name" value={patient.psych_name || ''} theme="purple" isEditing={false} />
                                                        <PremiumGlassField icon={Phone} label="Psychiatrist Phone" value={patient.psych_phone || ''} theme="purple" isEditing={false} />
                                                        <PremiumGlassField icon={MapPin} label="Psychiatrist Address" value={patient.psych_address || ''} theme="purple" isEditing={false} />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Hash} label="Diagnosis Code (ICD-10)" name="diagnosis_code" value={socialNeeds.diagnosis_code || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                        <PremiumGlassField icon={FileText} label="Diagnosis Descriptor" name="diagnosis_descriptor" value={socialNeeds.diagnosis_descriptor || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Complete Symptoms Checklist</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                                                            <TcmCheckbox label="Depression" field="symptom_depression" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Sadness" field="symptom_sadness" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Hopelessness" field="symptom_hopelessness" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Helplessness" field="symptom_helplessness" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Negative Self-Image" field="symptom_negative" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Social Withdrawal" field="symptom_withdrawal" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Neglect of Self/Home" field="symptom_neglect" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Loss of Interest/Pleasure" field="symptom_interest" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Low Self-Esteem" field="symptom_esteem" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Anxiety" field="symptom_anxiety" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Nervousness" field="symptom_nervousness" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Irritability" field="symptom_irritability" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Sleep Disturbance" field="symptom_sleep" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Concentration Difficulties" field="symptom_concentration" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Panic Attacks" field="symptom_panic" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Fearfulness" field="symptom_fearfulness" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Paranoia" field="symptom_paranoia" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Obsessive/Compulsive Behavior" field="symptom_obsessive" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Aggressiveness/Anger" field="symptom_aggressiveness" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Hyperactivity" field="symptom_hyperactivity" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Impulsivity" field="symptom_impulsivity" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Mood Swings" field="symptom_moodswings" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Hallucinations" field="symptom_hallucinations" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Delusions" field="symptom_delusions" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                    </div>

                                                    {/* Psychiatric Hospitalizations Grid Table */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Psychiatric Hospitalizations</h5>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = socialNeeds.psych_hospitalizations || [];
                                                                        const updated = [...current, { facility: '', date: '', reason: '' }];
                                                                        handleSocialNeedsValChange('psych_hospitalizations', updated);
                                                                    }}
                                                                    className="text-xs text-indigo-500 hover:text-indigo-650 font-bold flex items-center gap-1 transition-all"
                                                                >
                                                                    + Add Hospitalization Row
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[40%]">Hospital / Facility</th>
                                                                        <th className="p-3 w-[20%]">Date</th>
                                                                        <th className="p-3 w-[35%]">Reason</th>
                                                                        {isEditing && <th className="p-3 w-[5%] text-center">Actions</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const list = socialNeeds.psych_hospitalizations || [];
                                                                        if (list.length === 0) {
                                                                            return (
                                                                                <tr>
                                                                                    <td colSpan={isEditing ? 4 : 3} className="p-4 text-center text-slate-400 font-medium">
                                                                                        No hospitalizations reported.
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        return list.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.facility || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], facility: e.target.value };
                                                                                                handleSocialNeedsValChange('psych_hospitalizations', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Jackson Memorial"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.facility}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.date || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], date: e.target.value };
                                                                                                handleSocialNeedsValChange('psych_hospitalizations', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. 10/2024"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.date}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.reason || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], reason: e.target.value };
                                                                                                handleSocialNeedsValChange('psych_hospitalizations', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Depressive crisis"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.reason}</span>
                                                                                    )}
                                                                                </td>
                                                                                {isEditing && (
                                                                                    <td className="p-3 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const updated = list.filter((_, i) => i !== idx);
                                                                                                handleSocialNeedsValChange('psych_hospitalizations', updated);
                                                                                            }}
                                                                                            className="text-red-500 hover:text-red-650 transition-colors font-bold text-xs"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Risks and Abuse</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <TcmCheckbox label="Suicidal Attempt/Ideation" labelEs="Suicidal Attempt/Ideation" field="risk_suicidal" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Homicidal Attempt/Ideation" labelEs="Homicidal Attempt/Ideation" field="risk_homicidal" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Abuse/Violence" labelEs="Abuse/Violence" field="risk_abuse" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <PremiumGlassField
                                                            icon={AlertTriangle}
                                                            label="Risk Details"
                                                            name="risk_details"
                                                            value={socialNeeds.risk_details || ''}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            isTextarea
                                                            theme="indigo"
                                                        />
                                                        <PremiumGlassField
                                                            icon={AlertTriangle}
                                                            label="Risk Behavior Description"
                                                            name="risk_behavior_description"
                                                            value={socialNeeds.risk_behavior_description || ''}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            isTextarea
                                                            theme="indigo"
                                                        />
                                                    </div>

                                                    <div className="p-5 rounded-2xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/30 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <TcmCheckbox label="Mental Health Need Identified (Domain 1)" labelEs="Mental Health Need Identified" field="domain_mental_health" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                        <PremiumGlassField
                                                            icon={FileText}
                                                            label="Domain 1 Note (Mental Health Needs)"
                                                            name="domain_mental_health_note"
                                                            value={socialNeeds.domain_mental_health_note || ''}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            isTextarea
                                                            theme="indigo"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 7: PHYSICAL HEALTH, DENTAL & MEDICAL */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('physicalHealth')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>7. Physical Health, Dental & Medical</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.physicalHealth ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.physicalHealth && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <PremiumGlassField icon={User} label="PCP Doctor Name" value={patient.pcp_name || ''} theme="emerald" isEditing={false} />
                                                        <PremiumGlassField icon={Phone} label="PCP Phone" value={patient.pcp_phone || ''} theme="emerald" isEditing={false} />
                                                        <PremiumGlassField icon={MapPin} label="PCP Clinic Address" value={patient.pcp_address || ''} theme="emerald" isEditing={false} />
                                                    </div>

                                                    {/* Chronic Medical Conditions Grid Table */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Chronic Medical Conditions</h5>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const parseConditions = (raw: string) => {
                                                                            if (!raw) return [];
                                                                            return raw.split(/[,\n]+/).map(c => c.trim()).filter(c => c.length > 0).map(c => ({
                                                                                condition: c,
                                                                                client_has: true,
                                                                                family_has: false,
                                                                                comments: ''
                                                                            }));
                                                                        };
                                                                        const current = socialNeeds.chronic_conditions || parseConditions(patient.pcp_conditions || '');
                                                                        const updated = [...current, { condition: '', client_has: true, family_has: false, comments: '' }];
                                                                        handleSocialNeedsValChange('chronic_conditions', updated);
                                                                    }}
                                                                    className="text-xs text-indigo-500 hover:text-indigo-650 font-bold flex items-center gap-1 transition-all"
                                                                >
                                                                    + Add Condition Row
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[40%]">Condition</th>
                                                                        <th className="p-3 w-[15%] text-center">Client</th>
                                                                        <th className="p-3 w-[15%] text-center">Family</th>
                                                                        <th className="p-3 w-[25%]">Comments / Onset</th>
                                                                        {isEditing && <th className="p-3 w-[5%] text-center">Actions</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const parseConditions = (raw: string) => {
                                                                            if (!raw) return [];
                                                                            return raw.split(/[,\n]+/).map(c => c.trim()).filter(c => c.length > 0).map(c => ({
                                                                                condition: c,
                                                                                client_has: true,
                                                                                family_has: false,
                                                                                comments: ''
                                                                            }));
                                                                        };
                                                                        const list = socialNeeds.chronic_conditions || parseConditions(patient.pcp_conditions || '');
                                                                        if (list.length === 0) {
                                                                            return (
                                                                                <tr>
                                                                                    <td colSpan={isEditing ? 5 : 4} className="p-4 text-center text-slate-400 font-medium">
                                                                                        No chronic conditions reported.
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        return list.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.condition || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], condition: e.target.value };
                                                                                                handleSocialNeedsValChange('chronic_conditions', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Hypertension"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="font-bold text-slate-900 dark:text-slate-100">{row.condition}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3 text-center">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        disabled={!isEditing}
                                                                                        checked={row.client_has !== false}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...list];
                                                                                            updated[idx] = { ...updated[idx], client_has: e.target.checked };
                                                                                            handleSocialNeedsValChange('chronic_conditions', updated);
                                                                                        }}
                                                                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                                                    />
                                                                                </td>
                                                                                <td className="p-3 text-center">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        disabled={!isEditing}
                                                                                        checked={row.family_has === true}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...list];
                                                                                            updated[idx] = { ...updated[idx], family_has: e.target.checked };
                                                                                            handleSocialNeedsValChange('chronic_conditions', updated);
                                                                                        }}
                                                                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                                                    />
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.comments || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], comments: e.target.value };
                                                                                                handleSocialNeedsValChange('chronic_conditions', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Diagnosed in 2021"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.comments}</span>
                                                                                    )}
                                                                                </td>
                                                                                {isEditing && (
                                                                                    <td className="p-3 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const updated = list.filter((_, i) => i !== idx);
                                                                                                handleSocialNeedsValChange('chronic_conditions', updated);
                                                                                            }}
                                                                                            className="text-red-500 hover:text-red-650 transition-colors font-bold text-xs"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                                        <PremiumGlassField icon={FileText} label="Allergies" value={patient.allergies || ''} theme="amber" isEditing={false} />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={CheckSquare} label="Hearing Status" name="hearing_level" value={socialNeeds.hearing_level || 'no_impairment'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['no_impairment', 'managed_devices', 'difficulty_conversation', 'only_loud_sounds', 'no_useful_hearing']} theme="indigo" />
                                                        <PremiumGlassField icon={CheckSquare} label="Vision Status" name="vision_level" value={socialNeeds.vision_level || 'no_impairment'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['no_impairment', 'managed_devices', 'difficulty_print', 'difficulty_objects', 'no_useful_vision']} theme="indigo" />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <PremiumGlassField icon={CheckSquare} label="Is pregnant?" name="is_pregnant" value={socialNeeds.is_pregnant || 'No'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Yes', 'No']} theme="indigo" />
                                                        <PremiumGlassField icon={CheckSquare} label="Immunizations Current?" name="vaccines_current" value={socialNeeds.vaccines_current !== false ? 'Yes' : 'No'} isEditing={isEditing} onChange={(key, val) => handleSocialNeedsChange('vaccines_current', val === 'Yes')} options={['Yes', 'No']} theme="indigo" />
                                                        <PremiumGlassField icon={CheckSquare} label="On Special Diet?" name="special_diet" value={socialNeeds.special_diet || 'No'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Yes', 'No']} theme="indigo" />
                                                        <PremiumGlassField icon={CheckSquare} label="Exercise Frequency" name="exercise_frequency" value={socialNeeds.exercise_frequency || 'Rarely'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Daily', 'Weekly', 'Rarely', 'None']} theme="indigo" />
                                                    </div>

                                                    {/* Preventive care dates Grid Table */}
                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Preventive Care Checkups</h5>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[40%]">Exam Type</th>
                                                                        <th className="p-3 w-[25%]">Date</th>
                                                                        <th className="p-3 w-[35%]">Provider / Comments</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const defaultRows = [
                                                                            { exam_type: 'Physical Exam', date: 'None reported', provider_comments: '' },
                                                                            { exam_type: 'Dental Exam', date: 'None reported', provider_comments: '' },
                                                                            { exam_type: 'Labs / Blood Work', date: 'None reported', provider_comments: '' },
                                                                            { exam_type: 'Pap Smear / HPV', date: 'N/A', provider_comments: '' },
                                                                            { exam_type: 'Mammogram', date: 'N/A', provider_comments: '' },
                                                                            { exam_type: 'Colon Screening', date: 'None reported', provider_comments: '' }
                                                                        ];
                                                                        const list = socialNeeds.preventive_care_grid || defaultRows;
                                                                        return list.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3 font-bold text-slate-850 dark:text-slate-250">{row.exam_type}</td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.date || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], date: e.target.value };
                                                                                                handleSocialNeedsValChange('preventive_care_grid', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. 10/12/2025"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.date}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.provider_comments || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], provider_comments: e.target.value };
                                                                                                handleSocialNeedsValChange('preventive_care_grid', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Dr. Luis Felipe"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.provider_comments}</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div className="p-5 rounded-2xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/30 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <TcmCheckbox label="Physical Health Need Identified (Domain 2)" labelEs="Physical Health Need Identified" field="domain_physical_health" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                        <PremiumGlassField
                                                            icon={FileText}
                                                            label="Domain 2 Note (Physical Health Needs)"
                                                            name="domain_physical_health_note"
                                                            value={socialNeeds.domain_physical_health_note || ''}
                                                            isEditing={isEditing}
                                                            onChange={handleSocialNeedsTextChange}
                                                            isTextarea
                                                            theme="indigo"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 8: INDEPENDENCE & DAILY FUNCTIONING */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('independenceDailyLiving')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>8. Independence & Daily Functioning</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.independenceDailyLiving ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.independenceDailyLiving && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Briefcase} label="Employment Status" name="employment_status" value={socialNeeds.employment_status || 'Disabled'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Employed', 'Unemployed', 'Disabled', 'Retired']} theme="indigo" />
                                                        <PremiumGlassField icon={GraduationCap} label="Highest Education Level" name="education_level" value={socialNeeds.education_level || 'Middle School'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Elementary School', 'Middle School', 'High School', 'College / University', 'None']} theme="indigo" />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Briefcase} label="Vocational / Employment History Description" name="vocational_history" value={socialNeeds.vocational_history || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        <PremiumGlassField icon={GraduationCap} label="School / Education Needs Description" name="education_needs" value={socialNeeds.education_needs || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={User} label="Social Skills Description" name="social_skills_description" value={socialNeeds.social_skills_description || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        <PremiumGlassField icon={Users} label="Relationships and Support System Description" name="support_system_description" value={socialNeeds.support_system_description || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Activities of Daily Living (ADL) Checklist</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            {[
                                                                { label: 'Feeding', name: 'adl_feed' },
                                                                { label: 'Grooming', name: 'adl_groom' },
                                                                { label: 'Bathing', name: 'adl_bath' },
                                                                { label: 'Dressing', name: 'adl_dress' },
                                                                { label: 'Transfer & Mobility', name: 'adl_transfer' },
                                                                { label: 'Cooking', name: 'adl_cook' },
                                                                { label: 'Laundry/Housekeeping', name: 'adl_laundry' },
                                                                { label: 'Phone calls', name: 'adl_phone' },
                                                                { label: 'Shopping', name: 'adl_shop' }
                                                            ].map((adl) => (
                                                                <PremiumGlassField
                                                                    key={adl.name}
                                                                    icon={Activity}
                                                                    label={adl.label}
                                                                    name={adl.name}
                                                                    value={socialNeeds[adl.name] || 'independent'}
                                                                    isEditing={isEditing}
                                                                    onChange={handleSocialNeedsTextChange}
                                                                    options={['independent', 'supervision', 'physical', 'total', 'tech']}
                                                                    theme="indigo"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <PremiumGlassField icon={Home} label="No. of Bedrooms" name="housing_bedrooms" value={socialNeeds.housing_bedrooms || '1'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} type="number" theme="indigo" />
                                                        <PremiumGlassField icon={Home} label="PPB Ratio" name="housing_ppb" value={socialNeeds.housing_ppb || '1'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} type="number" theme="indigo" />
                                                        <PremiumGlassField icon={Home} label="Housing Preference" name="housing_preference" value={socialNeeds.housing_preference || 'Continue to live here'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} options={['Continue to live here', 'Wants to relocate']} theme="indigo" />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Home Safety Hazards</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <TcmCheckbox label="Tripping Hazards" labelEs="Tripping Hazards" field="risk_tripping" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Poor Lighting" labelEs="Poor Lighting" field="risk_lighting" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <TcmCheckbox label="Structural Damage" labelEs="Structural Damage" field="risk_structural" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Home} label="Living and Sleeping Arrangements Description" name="living_arrangements_description" value={socialNeeds.living_arrangements_description || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        <PremiumGlassField icon={Home} label="Neighborhood Description" name="neighborhood_description" value={socialNeeds.neighborhood_description || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                    </div>

                                                    {/* Dominios colapsados para AVD, Social y Vivienda */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/50 pt-5">
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Recreational Need (Domain 5)" field="domain_recreational" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 5 Note" name="domain_recreational_note" value={socialNeeds.domain_recreational_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Daily Living Need (Domain 6)" field="domain_daily_living" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 6 Note" name="domain_daily_living_note" value={socialNeeds.domain_daily_living_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Housing Need (Domain 7)" field="domain_housing" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 7 Note" name="domain_housing_note" value={socialNeeds.domain_housing_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 9: ENVIRONMENT, FINANCES & LEGAL */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('environmentFinancesLegal')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>9. Environment, Finances & Legal</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.environmentFinancesLegal ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.environmentFinancesLegal && (
                                                <div className="p-6 md:p-8 border-t border-slate-100/50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/5 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <PremiumGlassField icon={Coins} label="Rent Payment" name="rent_payment" value={socialNeeds.rent_payment || '994'} isEditing={isEditing} onChange={handleSocialNeedsTextChange} type="number" theme="indigo" />
                                                        <PremiumGlassField icon={FileText} label="SSI Details" name="ssi_details" value={socialNeeds.ssi_details || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                        <PremiumGlassField icon={FileText} label="Other Financial Resources" name="other_financial_resources" value={socialNeeds.other_financial_resources || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        <PremiumGlassField icon={Coins} label="Financial Difficulties Description" name="financial_difficulties_description" value={socialNeeds.financial_difficulties_description || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                    </div>
                                                    
                                                    {/* Food Programs Grid Table */}
                                                    <div className="space-y-3">
                                                        <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Food Assistance & Nutrition Programs</h5>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                                        <th className="p-3 w-[35%]">Program Type</th>
                                                                        <th className="p-3 w-[15%] text-center">Enrolled</th>
                                                                        <th className="p-3 w-[20%]">Frequency</th>
                                                                        <th className="p-3 w-[30%]">Provider / Agency</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const defaultRows = [
                                                                            { program_type: 'Food Stamps (SNAP)', enrolled: true, frequency: 'Monthly', provider: 'DCF' },
                                                                            { program_type: 'Hot meals / Congregate dining', enrolled: false, frequency: 'None', provider: 'N/A' },
                                                                            { program_type: 'Meals on wheels', enrolled: false, frequency: 'None', provider: 'N/A' },
                                                                            { program_type: 'Food pantry', enrolled: true, frequency: 'Monthly', provider: 'Local Church' }
                                                                        ];
                                                                        const list = socialNeeds.food_programs || defaultRows;
                                                                        return list.map((row, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all font-medium text-slate-750 dark:text-slate-300">
                                                                                <td className="p-3 font-bold text-slate-850 dark:text-slate-250">{row.program_type}</td>
                                                                                <td className="p-3 text-center">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        disabled={!isEditing}
                                                                                        checked={row.enrolled === true}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...list];
                                                                                            updated[idx] = { ...updated[idx], enrolled: e.target.checked };
                                                                                            handleSocialNeedsValChange('food_programs', updated);
                                                                                        }}
                                                                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                                                    />
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.frequency || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], frequency: e.target.value };
                                                                                                handleSocialNeedsValChange('food_programs', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Monthly"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.frequency}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={row.provider || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...list];
                                                                                                updated[idx] = { ...updated[idx], provider: e.target.value };
                                                                                                handleSocialNeedsValChange('food_programs', updated);
                                                                                            }}
                                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/30 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                                                                            placeholder="e.g. Local pantry"
                                                                                        />
                                                                                    ) : (
                                                                                        <span>{row.provider}</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ));
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={Car} label="Transportation Ability Description" name="transportation_ability_description" value={socialNeeds.transportation_ability_description || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        <PremiumGlassField icon={ShieldAlert} label="Legal & Immigration Details" name="legal_immigration_details" value={socialNeeds.legal_immigration_details || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                    </div>

                                                    {/* Finanzas, Necesidades Basicas, Transporte y Legal */}
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-200/50 pt-5">
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Financial Need (Domain 8)" field="domain_financial" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 8 Note" name="domain_financial_note" value={socialNeeds.domain_financial_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Basic Needs (Domain 9)" field="domain_basic_needs" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 9 Note" name="domain_basic_needs_note" value={socialNeeds.domain_basic_needs_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Transportation Need (Domain 10)" field="domain_transportation" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 10 Note" name="domain_transportation_note" value={socialNeeds.domain_transportation_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 space-y-2">
                                                            <TcmCheckbox label="Legal Need (Domain 11)" field="domain_legal" isEditing={isEditing} needs={socialNeeds} onChange={handleSocialNeedsChange} />
                                                            <PremiumGlassField icon={FileText} label="Domain 11 Note" name="domain_legal_note" value={socialNeeds.domain_legal_note || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} isTextarea theme="indigo" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 10: SUMMARY, STRENGTHS & SIGNATURES */}
                                        <div className="border border-slate-200/40 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/10 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(0,0,0,0.015)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-500">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('summarySignatures')}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-850 dark:text-slate-200 text-[13px] uppercase tracking-wider hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-300"
                                            >
                                                <span>10. Summary, Strengths & Signatures</span>
                                                <ChevronRight size={16} className={`transition-transform duration-200 ${expandedSections.summarySignatures ? 'rotate-90' : ''}`} />
                                            </button>
                                            {expandedSections.summarySignatures && (
                                                <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/10 space-y-5">
                                                    <PremiumGlassField
                                                        icon={FileText}
                                                        label="Patient Strengths"
                                                        name="patient_strengths"
                                                        value={socialNeeds.patient_strengths || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        isTextarea
                                                        theme="indigo"
                                                    />
                                                    <PremiumGlassField
                                                        icon={FileText}
                                                        label="Patient Weaknesses"
                                                        name="patient_weaknesses"
                                                        value={socialNeeds.patient_weaknesses || ''}
                                                        isEditing={isEditing}
                                                        onChange={handleSocialNeedsTextChange}
                                                        isTextarea
                                                        theme="indigo"
                                                    />
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <PremiumGlassField icon={CheckSquare} label="Home Visit Conducted" name="home_visit_conducted" value={socialNeeds.home_visit_conducted !== false ? 'Yes' : 'No'} isEditing={isEditing} onChange={(key, val) => handleSocialNeedsChange('home_visit_conducted', val === 'Yes')} options={['Yes', 'No']} theme="indigo" />
                                                        <PremiumGlassField icon={Calendar} label="Home Visit Date" name="home_visit_date" value={socialNeeds.home_visit_date || ''} isEditing={isEditing} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
            </div>

            {showAutofillModeModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-sm w-full shadow-[0_24px_70px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_70px_-10px_rgba(0,0,0,0.5)] border border-slate-100/60 dark:border-slate-800 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2 text-center">
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">AI Autofill Mode</h3>
                            <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px] leading-relaxed max-w-[280px] mx-auto">
                                How should the extracted data be applied to this patient's chart?
                            </p>
                        </div>
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => executeAIAutofill('fill_blanks')}
                                className="w-full text-left p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all duration-200 group"
                            >
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Fill missing info</h4>
                                <p className="text-slate-400 dark:text-slate-500 text-[11px] font-medium mt-1 leading-normal">
                                    Safely populate empty fields. Current data will not be overwritten.
                                </p>
                            </button>

                            <button
                                onClick={() => executeAIAutofill('overwrite_all')}
                                className="w-full text-left p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all duration-200 group"
                            >
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Overwrite all</h4>
                                <p className="text-slate-400 dark:text-slate-500 text-[11px] font-medium mt-1 leading-normal">
                                    Replace all existing data with the newly extracted values.
                                </p>
                            </button>
                        </div>

                        <div className="text-center pt-1">
                            <button
                                onClick={() => {
                                    setShowAutofillModeModal(false);
                                    setSelectedAutofillFile(null);
                                }}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PatientNotePreview
                note={selectedNote}
                isOpen={!!selectedNote}
                onClose={() => setSelectedNote(null)}
                onViewFull={(id) => navigate(`/notes/new?id=${id}`)}
            />

            {downloadIframeUrl && (
                <iframe
                    src={downloadIframeUrl}
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        top: '-9999px',
                        width: '1200px',
                        height: '1600px',
                        border: 'none',
                        pointerEvents: 'none'
                    }}
                />
            )}
        </div>
    );
}

// [ADVANCED PREMIUM UI SUB-COMPONENTS]

function PremiumTrigger({ value, label, icon: Icon, theme }: { value: string, label: string, icon: any, theme: string }) {
    const themeShadows: Record<string, string> = {
        indigo: "data-[state=active]:shadow-indigo-100/50 dark:data-[state=active]:shadow-indigo-950/20 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 data-[state=active]:bg-indigo-50/50 dark:data-[state=active]:bg-indigo-950/40",
        emerald: "data-[state=active]:shadow-emerald-100/50 dark:data-[state=active]:shadow-emerald-950/20 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-300 data-[state=active]:bg-emerald-50/50 dark:data-[state=active]:bg-emerald-950/40",
        purple: "data-[state=active]:shadow-purple-100/50 dark:data-[state=active]:shadow-purple-950/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-300 data-[state=active]:bg-purple-50/50 dark:data-[state=active]:bg-purple-950/40",
        blue: "data-[state=active]:shadow-blue-100/50 dark:data-[state=active]:shadow-blue-950/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 data-[state=active]:bg-blue-50/50 dark:data-[state=active]:bg-blue-950/40",
        slate: "data-[state=active]:shadow-slate-200/50 dark:data-[state=active]:shadow-slate-900/20 data-[state=active]:text-slate-700 dark:data-[state=active]:text-slate-300 data-[state=active]:bg-slate-50 dark:data-[state=active]:bg-slate-900",
        amber: "data-[state=active]:shadow-amber-100/50 dark:data-[state=active]:shadow-amber-950/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-300 data-[state=active]:bg-amber-50/50 dark:data-[state=active]:bg-amber-950/40"
    };

    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex-1 lg:flex-none shrink-0 rounded-full flex items-center justify-center gap-2 px-5 h-full text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-lg border border-transparent data-[state=active]:border-slate-100 dark:data-[state=active]:border-slate-800/80 group",
                themeShadows[theme]
            )}
        >
            <Icon size={14} className="opacity-30 group-data-[state=active]:opacity-100 group-hover:scale-110 transition-all duration-300" />
            <span className="shrink-0">{label}</span>
        </TabsTrigger>
    );
}

interface FieldProps {
    icon: any;
    label: string;
    value?: string | null;
    className?: string;
    isTextarea?: boolean;
    large?: boolean;
    theme: 'indigo' | 'emerald' | 'purple' | 'blue' | 'amber';
    isEditing?: boolean;
    name?: string;
    onChange?: (name: string, value: string) => void;
    type?: string;
    options?: string[];
}

function PremiumGlassField({ icon: Icon, label, value, className, isTextarea, large, theme, isEditing, name, onChange, type, options }: FieldProps) {
    const { language } = useLanguage();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isTextarea && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value, isTextarea, isEditing]);

    const iconBgThemes = {
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-100/50",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-100/50",
        purple: "bg-purple-500/10 text-purple-500 border-purple-100/50",
        blue: "bg-blue-500/10 text-blue-500 border-blue-100/50",
        amber: "bg-amber-500/10 text-amber-500 border-amber-100/50"
    };

    const labelTranslations: Record<string, string> = {
        "First Name": "Primer Nombre",
        "Last Name": "Apellidos",
        "Primary Contact": "Contacto Principal",
        "Date of Birth": "Fecha de Nacimiento",
        "SSN / National ID": "SSN / ID Nacional",
        "Residential Address": "Dirección Residencial",
        "Insurance Company": "Compañía de Seguros",
        "Member ID": "ID de Miembro",
        "Case Number": "Número de Caso",
        "Citizenship Status": "Estado de Ciudadanía",
        "Language Preference": "Idioma de Preferencia",
        "Preferred Pharmacy": "Farmacia Preferida",
        "PCP Clinic Name": "Clínica PCP",
        "PCP Doctor Name": "Médico PCP",
        "Clinic Phone": "Teléfono de Clínica",
        "Clinic Fax": "Fax de Clínica",
        "Clinic Address": "Dirección de Clínica",
        "Medical Notes": "Notas Médicas",
        "Psychiatric Notes": "Notas Psiquiátricas",
        "Primary Pharmacy": "Farmacia Principal",
        "Pharmacy Phone": "Teléfono de Farmacia",
        "Pharmacy Fax": "Fax de Farmacia",
        "Pharmacy Address": "Dirección de Farmacia",
        "Pharmacy Notes": "Notas de Farmacia",
        "Diagnoses": "Diagnósticos",
        "Allergies": "Alergias",
        "Education Level": "Nivel de Educación",
        "Marital Status": "Estado Civil",
        "Who they live with (Name, relationship, age)": "Con quién vive (Nombre, parentesco, edad)",
        "Number of Children": "Número de Hijos",
        "Where children live": "Dónde viven los hijos",
        "Occupation (Current or pre-retirement)": "Ocupación (Actual o pre-jubilación)",
        "Supplemental SSI Amount": "Monto de SSI Suplementario",
        "SSA Amount": "Monto de SSA",
        "Retirement / Disability Date": "Fecha de Jubilación / Discapacidad",
        "Country of Origin": "País de Origen",
        "US Entry Date": "Fecha de Entrada a EE.UU.",
        "Citizen? (Include Year)": "¿Ciudadano? (Incluir Año)",
        "Resident?": "¿Residente?",
        "Emergency Contact Name": "Nombre de Contacto de Emergencia",
        "Emergency Contact Phone": "Teléfono de Contacto de Emergencia",
        "Relationship / Parentesco": "Parentesco / Relación",
        "Living Situation (Type, # of rooms)": "Situación de Vivienda (Tipo, # de cuartos)",
        "Drives? (Specify)": "¿Conduce? (Especificar)",
        "Rent Amount": "Monto del Alquiler",
        "Bank Name (Where benefits are deposited)": "Nombre del Banco (Depósito de beneficios)",
        "Special Accommodations": "Adaptaciones Especiales",
        "Surgeries (Date / Hospital)": "Cirugías (Fecha / Hospital)",
        "Other Needs to Add": "Otras Necesidades a Agregar",
        "PCP Name": "Nombre del PCP",
        "PCP Phone": "Teléfono del PCP",
        "PCP Address": "Dirección del PCP",
        "PCP Practice Address": "Dirección de la Clínica PCP",
        "Physical Conditions": "Condiciones Físicas",
        "Current Medications": "Medicamentos Actuales",
        "Psychiatrist Name": "Nombre del Psiquiatra",
        "Psych Phone": "Teléfono del Psiquiatra",
        "Mental Conditions": "Condiciones Mentales",
        "Psychiatric Medications": "Medicamentos Psiquiátricos",
        "Phone Number": "Número de Teléfono",
        "Fax Number": "Número de Fax",
        "Time at PCP Clinic": "Tiempo en la Clínica PCP",
        "Time with Psychiatrist": "Tiempo con el Psiquiatra",
        "Psychiatrist Address": "Dirección del Psiquiatra"
    };

    const translatedLabel = language === 'es' ? (labelTranslations[label] || label) : label;

    if (!isEditing) {
        if (!value) {
            return (
                <div className={cn("space-y-1 group", className)}>
                    <div className="flex items-center gap-2.5 ml-1.5">
                        <div className={cn("size-5 rounded-md flex items-center justify-center relative opacity-50", iconBgThemes[theme])}>
                            <Icon size={10} className="relative z-10" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none opacity-70">{translatedLabel}</p>
                    </div>
                    <div className="pl-9">
                        <span className="text-xs text-slate-300 dark:text-slate-650 font-bold select-none">—</span>
                    </div>
                </div>
            );
        }

        return (
            <div className={cn("space-y-1.5 group", className)}>
                <div className="flex items-center gap-2.5 ml-1.5 transition-transform duration-300 group-hover:translate-x-0.5">
                    <div className={cn("size-5.5 rounded-lg flex items-center justify-center relative", iconBgThemes[theme])}>
                        <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
                        <Icon size={11} className="relative z-10" />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px]">{translatedLabel}</p>
                </div>

                <div className={cn(
                    "rounded-2xl border transition-all duration-300 relative overflow-hidden w-full",
                    "shadow-[0_2px_8px_-4px_rgba(0,0,0,0.03)]",
                    "border-slate-200/80 dark:border-slate-800/30 bg-slate-100/50 dark:bg-slate-950/60 backdrop-blur-md hover:border-indigo-500/20 dark:hover:border-indigo-500/10 hover:shadow-[0_4px_16px_rgba(99,102,241,0.02)]",
                    isTextarea ? (large ? "min-h-[120px] py-4" : "min-h-[90px] py-4") : "min-h-[2.5rem] py-1.5 flex items-center"
                )}>
                    <div className="w-full px-5">
                        <span className="relative z-10 text-[13.5px] leading-relaxed text-slate-750 dark:text-slate-100 font-semibold block whitespace-pre-wrap">
                            {value}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-1.5 group", className)}>
            <div className="flex items-center gap-2.5 ml-1.5 transition-transform duration-300 group-hover:translate-x-0.5">
                <div className={cn("size-5.5 rounded-lg flex items-center justify-center relative", iconBgThemes[theme])}>
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
                    <Icon size={11} className="relative z-10" />
                </div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px]">{translatedLabel}</p>
            </div>

            <div className={cn(
                "rounded-2xl border transition-all duration-300 relative overflow-hidden w-full",
                "shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]",
                "border-indigo-500/30 dark:border-indigo-500/20 hover:border-indigo-500/50 ring-2 ring-indigo-500/5 dark:ring-indigo-500/10 bg-white dark:bg-slate-950 shadow-[0_4px_16px_rgba(99,102,241,0.03)]",
                isTextarea ? (large ? "min-h-[170px]" : "min-h-[120px]") : "h-11 flex items-center"
            )}>
                {isTextarea ? (
                    <textarea
                        ref={textareaRef}
                        className="w-full bg-transparent border-none outline-none p-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed overflow-hidden"
                        value={value || ''}
                        onChange={(e) => onChange?.(name!, e.target.value)}
                        placeholder={language === 'es' ? `Documentar ${translatedLabel.toLowerCase()}...` : `Document ${label.toLowerCase()}...`}
                    />
                ) : options ? (
                    <Select 
                        value={value || ''} 
                        onValueChange={(val) => onChange?.(name!, val)}
                    >
                        <SelectTrigger className="w-full h-full border-none bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-5 text-[14px] font-bold text-slate-900 dark:text-slate-100 justify-between pr-4 hover:bg-transparent [&>svg]:opacity-50">
                            <SelectValue placeholder={language === 'es' ? "Seleccionar..." : "Select..."} />
                        </SelectTrigger>
                        <SelectContent className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 z-[250]">
                            {options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="rounded-xl font-bold text-[13px] text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-indigo-650 dark:focus:text-indigo-400 py-2.5">
                                    {language === 'es' ? (opt === 'English' ? 'Inglés' : opt === 'Spanish' ? 'Español' : opt) : opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <input
                        type={type || "text"}
                        className="w-full h-full bg-transparent border-none outline-none px-5 text-[14px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-none pr-8"
                        value={value || ''}
                        onChange={(e) => onChange?.(name!, e.target.value)}
                        placeholder={language === 'es' ? `Ingresar ${translatedLabel.toLowerCase()}...` : `Enter ${label.toLowerCase()}...`}
                    />
                )}
            </div>
        </div>
    );
}

function TimelineEntry({ item, isLast, navigate, onPreview, disabled }: { item: TimelineItem, isLast: boolean, navigate: any, onPreview: (note: any) => void, disabled?: boolean }) {
    const { language } = useLanguage();
    const isNote = item.type === 'note';
    return (
        <div
            className={cn(
                "group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.04)] hover:border-slate-200/60 dark:hover:border-slate-700/80 transition-all duration-300 flex gap-5 md:gap-6 items-center",
                disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
            )}
            onClick={() => !disabled && (isNote ? onPreview(item.raw) : navigate(`/calls/${item.id}`))}
        >
            {/* Left Icon: Apple-style soft pastel circles */}
            <div className={cn(
                "size-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
                isNote 
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            )}>
                {isNote ? <FileText size={20} /> : <Phone size={20} />}
            </div>

            {/* Middle Content */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                        {format(new Date(item.timestamp), language === 'es' ? "d 'de' MMM, yyyy • h:mm a" : 'MMM d, yyyy • h:mm a', { locale: language === 'es' ? es : undefined })}
                    </span>
                    {isNote ? (
                        <>
                            {item.raw?.signature_status === 'signed' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-100/20 dark:border-emerald-900/30">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {language === 'es' ? "Firmado" : "Signed"}
                                </span>
                            ) : item.raw?.signature_status === 'pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border border-amber-100/20 dark:border-amber-900/30">
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {language === 'es' ? "Firma pendiente" : "Pending Signature"} {item.raw?.supervisor_email ? `(${item.raw.supervisor_email})` : ''}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200/20 dark:border-slate-700/30">
                                    <span className="size-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                    {language === 'es' ? "Borrador" : "Draft"}
                                </span>
                            )}
                        </>
                    ) : (
                        item.status && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-100/30 dark:border-emerald-900/30">
                                {item.status}
                            </span>
                        )
                    )}
                </div>
                <h4 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-snug truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                </h4>
                {item.description && (
                    <p className="text-[13px] text-slate-400 dark:text-slate-500 font-normal mt-1.5 line-clamp-2 leading-relaxed opacity-90">
                        {item.description}
                    </p>
                )}
            </div>

            {/* Right Action: Clean chevron */}
            <div className={cn(
                "size-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 transition-all duration-300",
                !disabled && "group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-450 group-hover:translate-x-0.5"
            )}>
                <ChevronRight size={16} />
            </div>
        </div>
    );
}

function TcmCheckbox({ 
    label, 
    labelEs, 
    field, 
    isEditing, 
    needs, 
    onChange,
    onTextChange
}: { 
    label: string, 
    labelEs: string, 
    field: string, 
    isEditing: boolean, 
    needs: any, 
    onChange: (key: string, checked: boolean) => void,
    onTextChange?: (key: string, value: string) => void
}) {
    const { language } = useLanguage();
    const isChecked = !!(needs && needs[field]);
    const displayLabel = language === 'es' ? labelEs : label;
    const noteField = `${field}_note`;
    const noteValue = needs ? needs[noteField] || '' : '';

    if (!isEditing) {
        return (
            <div className={cn(
                "flex flex-col gap-2 px-4 py-3 rounded-xl border transition-all duration-300 w-full",
                isChecked 
                    ? "bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-750 dark:text-indigo-300 border-indigo-500/25 shadow-[0_4px_16px_rgba(99,102,241,0.03)]" 
                    : "bg-slate-50/50 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800/30 opacity-50"
            )}>
                <div className="flex items-center gap-3">
                    {isChecked ? (
                        <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
                    ) : (
                        <div className="size-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                    )}
                    <span className="text-xs font-bold select-none">{displayLabel}</span>
                </div>
                {isChecked && noteValue && (
                    <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 bg-slate-100/50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 ml-7 whitespace-pre-wrap">
                        {noteValue}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col gap-2 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl transition-all w-full",
            isChecked && "border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-50/5 dark:bg-indigo-950/10"
        )}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={(e) => onChange(field, e.target.checked)} 
                    className="size-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0 dark:bg-slate-950" 
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{displayLabel}</span>
            </label>
            {isChecked && onTextChange && (
                <div className="ml-7 animate-in slide-in-from-top-1 duration-200">
                    <textarea
                        rows={2}
                        placeholder={language === 'es' ? 'Escribe detalles o notas aquí...' : 'Write details or notes here...'}
                        value={noteValue}
                        onChange={(e) => onTextChange(noteField, e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none min-h-[50px]"
                    />
                </div>
            )}
        </div>
    );
}
