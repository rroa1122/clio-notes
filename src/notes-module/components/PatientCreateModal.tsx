import { useEffect, useState, useRef } from 'react';
import {
    UserPlus,
    X,
    Loader2,
    User,
    Calendar,
    Phone,
    Mail,
    Shield,
    Briefcase,
    MapPin,
    Stethoscope,
    Brain,
    Activity,
    HeartPulse,
    ClipboardList,
    BadgeCheck,
    Stethoscope as DoctorIcon,
    Brain as PsychIcon,
    FileText,
    Save,
    Store,
    Plus,
    UploadCloud,
    Hash,
    Coins,
    DollarSign,
    Heart,
    ShieldAlert,
    Users,
    GraduationCap,
    Globe,
    UserCheck,
    CheckSquare,
    MoreHorizontal,
    AlertTriangle
} from 'lucide-react';
import { extractPatientData, processAmexzoneWithN8nAI } from '../../lib/services/patientIntakeService';
import { processAmexzoneData } from '../../lib/services/amexzoneIntakeProcessor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storage, type Patient } from '../lib/storage';
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { searchDiagnoses, type DiagnosisCode } from '../lib/diagnosisCatalog';
import { pollTaskUntilTerminal } from '../lib/taskPolling';
import { cn } from "@/lib/utils";
import { supabase } from '../../lib/supabaseClient';

const SOCIAL_DOMAINS = [
    { id: "domain_mental_health", label: "Mental Health / Substance Abuse" },
    { id: "domain_physical_health", label: "Physical Health / Medical" },
    { id: "domain_vocational", label: "Vocational / Employment" },
    { id: "domain_education", label: "Educational / School" },
    { id: "domain_recreational", label: "Social Support / Recreational" },
    { id: "domain_daily_living", label: "Activities of Daily Living (ADLs)" },
    { id: "domain_housing", label: "Housing & Shelter" },
    { id: "domain_financial", label: "Financial & Economic" },
    { id: "domain_basic_needs", label: "Basic Needs" },
    { id: "domain_transportation", label: "Transportation" },
    { id: "domain_legal", label: "Legal & Immigration" },
    { id: "domain_other", label: "Other" }
];

interface PatientCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (patient: Patient) => void;
    context?: 'directory' | 'encounter';
}

export function PatientCreateModal({ isOpen, onClose, onCreated, context = 'encounter' }: PatientCreateModalProps) {
    const [formData, setFormData] = useState<Partial<Patient>>({
        first_name: '',
        last_name: '',
        full_name: '',
        dob: '',
        phone: '',
        email: '',
        emr_id: '',
        amexzone_id: '',
        gender: '',
        diagnoses: '',
        ssn: '',
        address: '',
        citizenship: '',
        case_manager: '',
        insurance_company: '',
        insurance_id: '',
        case_number: '',
        preferred_language: 'English',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        pcp_name: '',
        pcp_clinic_name: '',
        pcp_phone: '',
        pcp_address: '',
        pcp_conditions: '',
        pcp_medications: '',
        psych_name: '',
        psych_phone: '',
        psych_address: '',
        psych_conditions: '',
        psych_medications: '',
        pharmacy_name: '',
        pharmacy_phone: '',
        pharmacy_fax: '',
        pharmacy_address: '',
        presenting_problems: '',
        tcm_social_needs: {}
    });

    const [suggestions, setSuggestions] = useState<DiagnosisCode[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeTab, setActiveTab] = useState('client');

    // Amexzone Search States
    const [amexSearchName, setAmexSearchName] = useState('');
    const [amexSearchDob, setAmexSearchDob] = useState('');
    const handleAmexSearchDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        const isDeleting = val.length < amexSearchDob.length;
        
        if (!isDeleting) {
            const clean = val.replace(/\D/g, '').slice(0, 8);
            if (clean.length > 4) {
                val = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
            } else if (clean.length > 2) {
                val = `${clean.slice(0, 2)}/${clean.slice(2)}`;
            } else {
                val = clean;
            }
        }
        setAmexSearchDob(val);
    };
    const isMobile = false; // dummy or check existing variables if any
    const [isAmexSearching, setIsAmexSearching] = useState(false);
    const [amexLookupStage, setAmexLookupStage] = useState<'idle' | 'queued' | 'searching' | 'ai' | 'success'>('idle');
    const amexLookupAbortRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            amexLookupAbortRef.current?.abort();
        };
    }, []);

    const handleAmexzoneLookup = async () => {
        if (isAmexSearching) return;
        if (!amexSearchName.trim()) {
            toast.error("Please enter a patient name to search.");
            return;
        }

        const controller = new AbortController();
        amexLookupAbortRef.current?.abort();
        amexLookupAbortRef.current = controller;
        setIsAmexSearching(true);
        setAmexLookupStage('queued');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be logged in to search Amexzone.");
                setIsAmexSearching(false);
                setAmexLookupStage('idle');
                return;
            }

            const clinicId = await storage.getClinicId();

            // Insert pending task into database
            const { data: task, error } = await supabase
                .from('amexzone_note_tasks')
                .insert({
                    user_id: user.id,
                    clinic_id: clinicId,
                    patient_name: amexSearchName.trim(),
                    patient_dob: amexSearchDob || null,
                    note_text: '[IMPORT_PATIENT]',
                    status: 'pending'
                })
                .select()
                .single();

            if (error || !task) {
                throw new Error('Unable to queue the Amexzone search task.');
            }

            toast.info("Search task queued. Waiting for local bot to execute...", { duration: 4000 });

            const pollingResult = await pollTaskUntilTerminal({
                signal: controller.signal,
                maxAttempts: 120,
                fetchTask: async () => {
                    const { data, error: pollError } = await supabase
                        .from('amexzone_note_tasks')
                        .select('status, error_message, result_summary')
                        .eq('id', task.id)
                        .single();

                    if (pollError || !data) throw new Error('Task status is temporarily unavailable.');
                    if (data.status === 'in_progress' || data.status === 'processing') {
                        setAmexLookupStage('searching');
                    }
                    return data;
                },
                onPollError: () => console.warn('Amexzone task status is temporarily unavailable.'),
            });

            if (!isMountedRef.current) return;
            if (pollingResult.state === 'failed') {
                setAmexLookupStage('idle');
                toast.error('The Amexzone search failed. Check the bot status and try again.');
                return;
            }
            if (pollingResult.state === 'timeout') {
                setAmexLookupStage('idle');
                toast.error('Search timed out. Make sure the Amexzone bot is running.');
                return;
            }

            const data = pollingResult.task.result_summary;
            if (!data || typeof data !== 'object') {
                setAmexLookupStage('idle');
                toast.error('The Amexzone task completed without patient data. Nothing was imported.');
                return;
            }

            setAmexLookupStage('ai');
            toast.info("Synthesizing clinical data with AI...", { icon: "🧠" });
            const processed = await processAmexzoneWithN8nAI(data, formData);
            setAmexLookupStage('success');
            if (data.assessment_data && data.service_plan_data) {
                toast.success("Demográficos, Assessment y Service Plan importados exitosamente!", { icon: "📋" });
            } else if (data.assessment_data) {
                toast.success("Demográficos y Assessment importados exitosamente!", { icon: "📋" });
            } else if (data.service_plan_data) {
                toast.success("Demográficos y Service Plan importados exitosamente!", { icon: "📋" });
            } else {
                toast.success("Patient demographics & clinical record imported successfully!", { icon: "✨" });
            }
            setTimeout(() => {
                if (isMountedRef.current) setAmexLookupStage('idle');
            }, 4000);
            setFormData(prev => {
                const newState = {
                    ...prev,
                    ...processed,
                    case_number: data.case_number || data.assessment_data?.case_number || prev.case_number || '',
                    ssn: data.ssn || data.assessment_data?.ssn || prev.ssn || '',
                    amexzone_id: data.amexzone_id || prev.amexzone_id || '',
                    tcm_social_needs: {
                        ...(prev.tcm_social_needs || {}),
                        ...(data.tcm_social_needs || {}),
                        ...(data.assessment_data || {}),
                        ...(data.service_plan_data || {}),
                        ...(processed.tcm_social_needs || {}),
                                    marital_status: data.marital_status || (prev.tcm_social_needs && prev.tcm_social_needs.marital_status) || '',
                                    education_level: data.education_level || (prev.tcm_social_needs && prev.tcm_social_needs.education_level) || '',
                                    ssi_details: data.ssi_details || (prev.tcm_social_needs && prev.tcm_social_needs.ssi_details) || '',
                                    medicaid_details: data.medicaid_status || (prev.tcm_social_needs && prev.tcm_social_needs.medicaid_details) || '',
                                    medicare_details: data.medicare_status || (prev.tcm_social_needs && prev.tcm_social_needs.medicare_details) || '',
                                    religion: data.religion || (prev.tcm_social_needs && prev.tcm_social_needs.religion) || '',
                                    food_stamps_amount: data.food_stamps_amount || (prev.tcm_social_needs && prev.tcm_social_needs.food_stamps_amount) || '',
                                    food_stamps_since: data.food_stamps_since || (prev.tcm_social_needs && prev.tcm_social_needs.food_stamps_since) || '',
                                    ssi_amount: data.ssi_amount || (prev.tcm_social_needs && prev.tcm_social_needs.ssi_amount) || '',
                                    ssa_amount: data.ssa_amount || (prev.tcm_social_needs && prev.tcm_social_needs.ssa_amount) || '',
                                    occupation: data.occupation || (prev.tcm_social_needs && prev.tcm_social_needs.occupation) || '',
                                    retirement_date: data.retirement_date || (prev.tcm_social_needs && prev.tcm_social_needs.retirement_date) || '',
                                    origin_country: data.origin_country || (prev.tcm_social_needs && prev.tcm_social_needs.origin_country) || '',
                                    us_entry_date: data.us_entry_date || (prev.tcm_social_needs && prev.tcm_social_needs.us_entry_date) || '',
                                    citizenship_status: data.citizenship_status || (prev.tcm_social_needs && prev.tcm_social_needs.citizenship_status) || '',
                                    residence_status: data.residence_status || (prev.tcm_social_needs && prev.tcm_social_needs.residence_status) || '',
                                    co_habitants: data.co_habitants || (prev.tcm_social_needs && prev.tcm_social_needs.co_habitants) || '',
                                    children_count: data.children_count || (prev.tcm_social_needs && prev.tcm_social_needs.children_count) || '',
                                    children_location: data.children_location || (prev.tcm_social_needs && prev.tcm_social_needs.children_location) || '',
                                    emergency_contact_relationship: data.emergency_contact_relationship || (prev.tcm_social_needs && prev.tcm_social_needs.emergency_contact_relationship) || '',
                                    housing_type: data.housing_type || (prev.tcm_social_needs && prev.tcm_social_needs.housing_type) || '',
                                    drives: data.drives || (prev.tcm_social_needs && prev.tcm_social_needs.drives) || '',
                                    rent_payment: data.rent_payment || (prev.tcm_social_needs && prev.tcm_social_needs.rent_payment) || '',
                                    regular_rent: data.regular_rent ?? (prev.tcm_social_needs && prev.tcm_social_needs.regular_rent) ?? false,
                                    plan_8: data.plan_8 ?? (prev.tcm_social_needs && prev.tcm_social_needs.plan_8) ?? false,
                                    low_income: data.low_income ?? (prev.tcm_social_needs && prev.tcm_social_needs.low_income) ?? false,
                                    bank_name: data.bank_name || (prev.tcm_social_needs && prev.tcm_social_needs.bank_name) || '',
                                    special_accommodation: data.special_accommodation || (prev.tcm_social_needs && prev.tcm_social_needs.special_accommodation) || '',
                                    domain_mental_health: data.domain_mental_health ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_mental_health) ?? false,
                                    domain_physical_health: data.domain_physical_health ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_physical_health) ?? false,
                                    domain_housing: data.domain_housing ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_housing) ?? false,
                                    domain_financial: data.domain_financial ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_financial) ?? false,
                                    domain_basic_needs: data.domain_basic_needs ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_basic_needs) ?? false,
                                    domain_transportation: data.domain_transportation ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_transportation) ?? false,
                                    domain_daily_living: data.domain_daily_living ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_daily_living) ?? false,
                                    domain_recreational: data.domain_recreational ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_recreational) ?? false,
                                    domain_education: data.domain_education ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_education) ?? false,
                                    domain_vocational: data.domain_vocational ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_vocational) ?? false,
                                    domain_legal: data.domain_legal ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_legal) ?? false,
                                    domain_other: data.domain_other ?? (prev.tcm_social_needs && prev.tcm_social_needs.domain_other) ?? false
                                }
                            };
                            return newState;
                        });
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.error("Amexzone lookup failed.");
            toast.error("An error occurred starting the search.");
        } finally {
            if (amexLookupAbortRef.current === controller) {
                amexLookupAbortRef.current = null;
            }
            if (isMountedRef.current) setIsAmexSearching(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
        let file: File | null = null;
        if ('dataTransfer' in e) {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                file = e.dataTransfer.files[0];
            }
        } else if ('target' in e) {
            if (e.target?.files && e.target.files[0]) {
                file = e.target.files[0];
            }
        }

        if (!file) return;

        setIsExtracting(true);
        try {
            const extractedData = await extractPatientData(file);
            
            // Extract first and last name from full name if present
            let extractedFirstName = '';
            let extractedLastName = '';
            if (extractedData.full_name) {
                const fullName = extractedData.full_name.trim();
                if (fullName.includes(',')) {
                    const commaParts = fullName.split(',');
                    extractedLastName = commaParts[0].trim();
                    extractedFirstName = commaParts.slice(1).join(',').trim();
                } else {
                    const parts = fullName.split(/\s+/);
                    if (parts.length > 1) {
                        extractedFirstName = parts[0];
                        extractedLastName = parts.slice(1).join(' ');
                    } else {
                        extractedFirstName = parts[0];
                        extractedLastName = '';
                    }
                }
            }

            const updatedData = {
                ...formData,
                ...extractedData,
                first_name: extractedData.first_name || extractedFirstName || formData.first_name || '',
                last_name: extractedData.last_name || extractedLastName || formData.last_name || '',
                full_name: extractedData.full_name || `${extractedFirstName} ${extractedLastName}`.trim(),
            };

            setFormData(updatedData);

            if (!updatedData.first_name || !updatedData.last_name) {
                toast.warning("Data extracted, but first or last name is missing. Please complete the form.");
                return;
            }

            const newPatient = await storage.upsertPatient(updatedData as Patient);
            
            if (newPatient) {
                toast.success("Patient created automatically", { icon: "✨" });
                onCreated(newPatient);
                onClose();
                // Reset form
                setFormData({
                    first_name: '',
                    last_name: '',
                    full_name: '',
                    dob: '',
                    phone: '',
                    email: '',
                    emr_id: '',
                    gender: '',
                    diagnoses: '',
                    ssn: '',
                    address: '',
                    citizenship: '',
                    case_manager: '',
                    insurance_company: '',
                    insurance_id: '',
                    case_number: '',
                    preferred_language: 'English',
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    pcp_name: '',
                    pcp_clinic_name: '',
                    pcp_phone: '',
                    pcp_address: '',
                    pcp_conditions: '',
                    pcp_medications: '',
                    psych_name: '',
                    psych_phone: '',
                    psych_address: '',
                    psych_conditions: '',
                    psych_medications: '',
                    pharmacy_name: '',
                    pharmacy_phone: '',
                    pharmacy_fax: '',
                    pharmacy_address: '',
                    presenting_problems: ''
                });
            } else {
                toast.error("Error saving patient");
            }
        } catch (error) {
            console.error("Extraction error:", error);
            toast.error("Error extracting document data");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleFieldChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialNeedsChange = (field: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            tcm_social_needs: {
                ...(prev.tcm_social_needs || {}),
                [field]: checked
            }
        }));
    };

    const handleSocialNeedsTextChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            tcm_social_needs: {
                ...(prev.tcm_social_needs || {}),
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const firstName = formData.first_name?.trim() || '';
        const lastName = formData.last_name?.trim() || '';
        const fullName = `${firstName} ${lastName}`.trim();

        if (!firstName || !lastName) {
            toast.error("First name and Last name are required");
            return;
        }

        setIsSaving(true);
        try {
            const newPatient = await storage.upsertPatient({
                ...formData,
                full_name: fullName
            } as Patient);

            if (newPatient) {
                toast.success("Client created successfully");
                onCreated(newPatient);
                onClose();
                // Reset form
                setFormData({
                    first_name: '',
                    last_name: '',
                    full_name: '',
                    dob: '',
                    phone: '',
                    email: '',
                    emr_id: '',
                    gender: '',
                    diagnoses: '',
                    ssn: '',
                    address: '',
                    citizenship: '',
                    case_manager: '',
                    insurance_company: '',
                    insurance_id: '',
                    case_number: '',
                    preferred_language: 'English',
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    pcp_name: '',
                    pcp_clinic_name: '',
                    pcp_phone: '',
                    pcp_address: '',
                    pcp_conditions: '',
                    pcp_medications: '',
                    psych_name: '',
                    psych_phone: '',
                    psych_address: '',
                    psych_conditions: '',
                    psych_medications: '',
                    pharmacy_name: '',
                    pharmacy_phone: '',
                    pharmacy_fax: '',
                    pharmacy_address: '',
                    presenting_problems: ''
                });
            } else {
                toast.error("Database returned no data - Possible permission issue");
            }
        } catch (err) {
            console.error("Failed to create patient:", err);
            toast.error(err instanceof Error ? err.message : "Failed to create client record");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                className="max-w-[1024px] h-[85vh] max-h-[85vh] p-0 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl translate-x-0 translate-y-0 inset-0 m-auto flex flex-col"
            >
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-5 pb-4 border-b border-slate-200/70 dark:border-slate-800/70 relative overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 dark:from-indigo-500/25 dark:to-purple-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-500/30 shadow-xs">
                                    <UserPlus size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                                            Register New Patient
                                        </DialogTitle>
                                        <Badge variant="outline" className="bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/50 font-bold text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-2xs">
                                            Clinical Intake
                                        </Badge>
                                    </div>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Create a comprehensive clinical record with intake scanning or manual registry.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </div>
 
                    <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                        {/* Tabs Navigation */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-8 py-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800/60">
                                <TabsList className="bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md p-1 h-11 rounded-full border border-slate-200/80 dark:border-slate-800/80 shadow-xs w-full grid grid-cols-4 overflow-hidden gap-1">
                                    <PremiumTrigger value="client" label="Client" icon={User} theme="indigo" />
                                    <PremiumTrigger value="medical" label="Medical" icon={DoctorIcon} theme="emerald" />
                                    <PremiumTrigger value="psychiatric" label="Psychiatric" icon={PsychIcon} theme="purple" />
                                    <PremiumTrigger value="social" label="Social" icon={ClipboardList} theme="blue" />
                                </TabsList>
                            </div>
 
                            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20">
                                {/* [CLIENT TAB] */}
                                <TabsContent value="client" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {/* AI Extraction Dropzone */}
                                        <div 
                                            className={cn(
                                                "relative rounded-2xl border border-dashed overflow-hidden transition-all duration-300 group flex flex-col justify-center min-h-[280px]",
                                                isExtracting 
                                                    ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-[inset_0_2px_20px_rgba(99,102,241,0.15)]" 
                                                    : "border-slate-300/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/40 hover:border-indigo-400/80 hover:bg-gradient-to-b hover:from-white hover:to-indigo-50/20 dark:hover:from-slate-900 dark:hover:to-indigo-950/20 hover:shadow-lg transition-all"
                                            )}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handleFileUpload}
                                        >
                                            <input 
                                                type="file" 
                                                id="intake-upload" 
                                                accept=".pdf,image/*"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                onChange={handleFileUpload}
                                                disabled={isExtracting || isAmexSearching}
                                            />
                                            <div className="flex flex-col items-center justify-center p-6 text-center relative z-0">
                                                {isExtracting ? (
                                                    <div className="animate-in fade-in duration-300 flex flex-col items-center">
                                                        <div className="size-14 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 relative">
                                                            <Loader2 className="absolute h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                                                            <FileText className="h-6 w-6 opacity-20" />
                                                        </div>
                                                        <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-widest mb-1">Analyzing Intake...</h3>
                                                        <p className="text-[11px] font-medium text-indigo-600/80 dark:text-indigo-400 tracking-tight leading-relaxed max-w-[200px]">Extracting demographics & clinical details via AI</p>
                                                    </div>
                                                ) : (
                                                    <div className="animate-in fade-in duration-300 flex flex-col items-center transition-all duration-300 group-hover:-translate-y-0.5">
                                                        <div className="size-14 rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm border border-slate-200/80 dark:border-slate-700/80 mb-4 group-hover:scale-105 group-hover:border-indigo-300/80 group-hover:shadow-md transition-all duration-300 relative">
                                                            <UploadCloud size={26} className="relative z-10" />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">Upload Clinical Intake</h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] mb-4 leading-relaxed">
                                                            Drag & drop patient forms to <span className="text-indigo-600 dark:text-indigo-400 font-bold">auto-fill</span> this entire profile automatically.
                                                        </p>
                                                        <Badge variant="outline" className="bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold px-3 py-1 text-[10px] uppercase tracking-wider rounded-full shadow-2xs">
                                                            PDF • JPG • PNG
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
 
                                        {/* Amexzone Lookup */}
                                        <div className="relative rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 flex flex-col justify-between shadow-xs overflow-hidden group min-h-[280px] hover:border-indigo-400/40 hover:shadow-lg transition-all duration-300">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                            
                                            <div className="flex flex-col h-full justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="size-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xs relative overflow-hidden">
                                                            {isAmexSearching && <span className="absolute inset-0 bg-indigo-500/20 animate-pulse" />}
                                                            <Activity size={16} className="relative z-10" />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider leading-none">
                                                            Amexzone Lookup
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                                        Retrieve demographic, social and provider coordination details in real-time.
                                                    </p>
 
                                                    {/* Input Fields */}
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block ml-1">Patient Name</label>
                                                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 h-10 relative overflow-hidden focus-within:border-indigo-500/60 dark:focus-within:border-indigo-400/60 focus-within:ring-4 focus-within:ring-indigo-500/15 dark:focus-within:ring-indigo-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)] transition-all">
                                                                <input
                                                                    type="text"
                                                                    placeholder="E.g. Olga Aguila"
                                                                    value={ameSearchNameOverride(amexSearchName)}
                                                                    onChange={(e) => setAmexSearchName(e.target.value)}
                                                                    disabled={isAmexSearching || isExtracting}
                                                                    className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-4 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block ml-1">Date of Birth (Optional)</label>
                                                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 h-10 relative overflow-hidden focus-within:border-indigo-500/60 dark:focus-within:border-indigo-400/60 focus-within:ring-4 focus-within:ring-indigo-500/15 dark:focus-within:ring-indigo-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)] transition-all">
                                                                <input
                                                                    type="text"
                                                                    placeholder="MM/DD/YYYY"
                                                                    value={amexSearchDob}
                                                                    onChange={handleAmexSearchDobChange}
                                                                    disabled={isAmexSearching || isExtracting}
                                                                    className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-4 text-xs font-semibold text-slate-900 dark:text-slate-100 text-left cursor-text placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
 
                                                <Button
                                                    type="button"
                                                    onClick={handleAmexzoneLookup}
                                                    disabled={isAmexSearching || isExtracting || !amexSearchName.trim()}
                                                    className={cn(
                                                        "w-full h-10 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer",
                                                        isAmexSearching || isExtracting || !amexSearchName.trim()
                                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-800 cursor-not-allowed shadow-none"
                                                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01]"
                                                    )}
                                                >
                                                    {amexLookupStage === 'queued' && (
                                                        <>
                                                            <Loader2 size={14} className="animate-spin text-amber-400" />
                                                            <span className="text-amber-300 dark:text-amber-300">In Queue...</span>
                                                        </>
                                                    )}
                                                    {amexLookupStage === 'searching' && (
                                                        <>
                                                            <Loader2 size={14} className="animate-spin text-sky-400" />
                                                            <span className="text-sky-200 dark:text-sky-200">Searching Amexzone...</span>
                                                        </>
                                                    )}
                                                    {amexLookupStage === 'ai' && (
                                                        <>
                                                            <Brain size={14} className="animate-pulse text-purple-300" />
                                                            <span className="text-purple-200 dark:text-purple-200">Synthesizing with AI...</span>
                                                        </>
                                                    )}
                                                    {amexLookupStage === 'success' && (
                                                        <>
                                                            <CheckSquare size={14} className="text-emerald-400" />
                                                            <span className="text-emerald-300 dark:text-emerald-300">Import Complete!</span>
                                                        </>
                                                    )}
                                                    {amexLookupStage === 'idle' && (
                                                        <>
                                                            <UserCheck size={14} />
                                                            <span>Search & Import</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn("transition-all duration-500 space-y-6", isExtracting && "opacity-40 blur-[2px] pointer-events-none scale-[0.99]")}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Left Column: Identity & Contact */}
                                            <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
                                                <div className="mb-1">
                                                    <h4 className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Identity & Contact</h4>
                                                </div>
                                                <PremiumGlassField icon={User} label="First Name" name="first_name" value={formData.first_name} onChange={handleFieldChange} theme="indigo" placeholder="E.g. Alice" required />
                                                <PremiumGlassField icon={User} label="Last Name" name="last_name" value={formData.last_name} onChange={handleFieldChange} theme="indigo" placeholder="E.g. Wonder" required />
                                                <PremiumGlassField icon={Phone} label="Primary Contact" name="phone" value={formData.phone} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="Date of Birth" name="dob" value={formData.dob} onChange={handleFieldChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={Shield} label="SSN / National ID" name="ssn" value={formData.ssn} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={MapPin} label="Residential Address" name="address" value={formData.address} onChange={handleFieldChange} theme="indigo" />
                                            </div>

                                            {/* Right Column: Clinical Coordination */}
                                            <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
                                                <div className="mb-1">
                                                    <h4 className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Clinical Coordination</h4>
                                                </div>
                                                <PremiumGlassField icon={Shield} label="Insurance Company" name="insurance_company" value={formData.insurance_company} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Shield} label="Member ID" name="insurance_id" value={formData.insurance_id} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Hash} label="Case Number" name="case_number" value={formData.case_number} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={BadgeCheck} label="Citizenship Status" name="citizenship" value={formData.citizenship} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={User} label="Preferred Language" name="preferred_language" value={formData.preferred_language} onChange={handleFieldChange} theme="indigo" options={['English', 'Spanish']} />

                                                {/* Emergency Protocol */}
                                                <div className="mt-2 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Emergency Protocol</p>
                                                    <div className="space-y-3">
                                                        <PremiumGlassField icon={User} label="Emergency Contact" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleFieldChange} theme="amber" />
                                                        <PremiumGlassField icon={Phone} label="Emergency Phone" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleFieldChange} theme="amber" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Clinical Overview & ICD-10 */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
                                            <div className="space-y-4">
                                                <div className="mb-1">
                                                    <h4 className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Clinical Overview</h4>
                                                </div>
                                                <PremiumGlassField icon={ClipboardList} label="Primary Case Narrative" name="presenting_problems" value={formData.presenting_problems} onChange={handleFieldChange} theme="indigo" isTextarea large className="col-span-2" />
                                                
                                                <div className="space-y-3 px-0.5 mt-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="size-6 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                                                            <Activity size={13} />
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Diagnostic Registry (ICD-10)</p>
                                                    </div>

                                                    <div className="relative group">
                                                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 transition-all duration-200 relative overflow-hidden focus-within:border-indigo-500/60 dark:focus-within:border-indigo-400/60 focus-within:ring-4 focus-within:ring-indigo-500/15 dark:focus-within:ring-indigo-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]">
                                                            <textarea
                                                                className="w-full min-h-[110px] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed relative z-10"
                                                                value={formData.diagnoses || ''}
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
                                                        </div>

                                                        {suggestions.length > 0 && (
                                                            <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-4">
                                                                    Clinical Suggestions
                                                                </div>
                                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                    {suggestions.map((s) => (
                                                                        <button
                                                                            key={s.code}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const lines = (formData.diagnoses || '').split('\n');
                                                                                lines[lines.length - 1] = `${s.code} - ${s.description} `;
                                                                                handleFieldChange('diagnoses', lines.join('\n') + '\n');
                                                                                setSuggestions([]);
                                                                            }}
                                                                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 transition-colors border-b border-slate-100 dark:border-slate-850 last:border-0 group flex items-center justify-between gap-3 cursor-pointer"
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">{s.code}</span>
                                                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.description}</span>
                                                                            </div>
                                                                            <Plus size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [MEDICAL TAB] */}
                                <TabsContent value="medical" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <PremiumGlassField icon={DoctorIcon} label="PCP Name" name="pcp_name" value={formData.pcp_name} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Store} label="PCP Clinic Name" name="pcp_clinic_name" value={formData.pcp_clinic_name} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Phone} label="PCP Phone" name="pcp_phone" value={formData.pcp_phone} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={MapPin} label="PCP Practice Address" name="pcp_address" value={formData.pcp_address} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Activity} label="Physical Conditions" name="pcp_conditions" value={formData.pcp_conditions} onChange={handleFieldChange} theme="emerald" isTextarea />
                                            <PremiumGlassField icon={HeartPulse} label="Current Medications" name="pcp_medications" value={formData.pcp_medications} onChange={handleFieldChange} theme="emerald" isTextarea />
                                            <div className="col-span-1 md:col-span-2 mt-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                                                    <Store size={14} className="text-amber-500" />
                                                    Preferred Pharmacy
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                    <PremiumGlassField icon={Store} label="Pharmacy Name" name="pharmacy_name" value={formData.pharmacy_name} onChange={handleFieldChange} theme="amber" />
                                                    <PremiumGlassField icon={Phone} label="Pharmacy Phone" name="pharmacy_phone" value={formData.pharmacy_phone} onChange={handleFieldChange} theme="amber" />
                                                    <PremiumGlassField icon={MapPin} label="Pharmacy Address" name="pharmacy_address" value={formData.pharmacy_address} onChange={handleFieldChange} theme="amber" className="col-span-1 md:col-span-2" />
                                                    <PremiumGlassField icon={FileText} label="Pharmacy Fax" name="pharmacy_fax" value={formData.pharmacy_fax} onChange={handleFieldChange} theme="amber" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [PSYCHIATRIC TAB] */}
                                <TabsContent value="psychiatric" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <PremiumGlassField icon={Brain} label="Psychiatrist Name" name="psych_name" value={formData.psych_name} onChange={handleFieldChange} theme="purple" />
                                            <PremiumGlassField icon={Phone} label="Psych Phone" name="psych_phone" value={formData.psych_phone} onChange={handleFieldChange} theme="purple" />
                                            <PremiumGlassField icon={MapPin} label="Clinic Address" name="psych_address" value={formData.psych_address} onChange={handleFieldChange} theme="purple" className="col-span-1 md:col-span-2" />
                                            <PremiumGlassField icon={Activity} label="Mental Conditions" name="psych_conditions" value={formData.psych_conditions} onChange={handleFieldChange} theme="purple" isTextarea />
                                            <PremiumGlassField icon={HeartPulse} label="Psychiatric Medications" name="psych_medications" value={formData.psych_medications} onChange={handleFieldChange} theme="purple" isTextarea />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [SOCIAL TAB] */}
                                <TabsContent value="social" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="space-y-6">
                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <Coins size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    1. Government Assistance
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                <PremiumGlassField icon={DollarSign} label="Food Stamps Amount" name="food_stamps_amount" value={formData.tcm_social_needs?.food_stamps_amount || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="Food Stamps Since" name="food_stamps_since" value={formData.tcm_social_needs?.food_stamps_since || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={FileText} label="Medicaid Status/No." name="medicaid_details" value={formData.tcm_social_needs?.medicaid_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" className="col-span-1 md:col-span-2" />
                                                <PremiumGlassField icon={FileText} label="Medicare Status/No." name="medicare_details" value={formData.tcm_social_needs?.medicare_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={FileText} label="SSI Details" name="ssi_details" value={formData.tcm_social_needs?.ssi_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <Users size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    2. Family & Cohabitation
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                <PremiumGlassField icon={GraduationCap} label="Education Level" name="education_level" value={formData.tcm_social_needs?.education_level || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Heart} label="Marital Status" name="marital_status" value={formData.tcm_social_needs?.marital_status || ''} onChange={handleSocialNeedsTextChange} theme="indigo" options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated']} />
                                                <PremiumGlassField icon={Users} label="Who they live with (Name, relationship, age)" name="co_habitants" value={formData.tcm_social_needs?.co_habitants || ''} onChange={handleSocialNeedsTextChange} theme="indigo" className="col-span-1 md:col-span-2" isTextarea />
                                                <PremiumGlassField icon={Users} label="Number of Children" name="children_count" value={formData.tcm_social_needs?.children_count || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="number" />
                                                <PremiumGlassField icon={MapPin} label="Where children live" name="children_location" value={formData.tcm_social_needs?.children_location || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <Briefcase size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    3. Employment & Financials
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                <PremiumGlassField icon={Briefcase} label="Occupation" name="occupation" value={formData.tcm_social_needs?.occupation || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="Retirement / Disability Date" name="retirement_date" value={formData.tcm_social_needs?.retirement_date || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={DollarSign} label="Supplemental SSI Amount" name="ssi_amount" value={formData.tcm_social_needs?.ssi_amount || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={DollarSign} label="SSA Amount" name="ssa_amount" value={formData.tcm_social_needs?.ssa_amount || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <Globe size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    4. Origin & Immigration
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                <PremiumGlassField icon={Globe} label="Country of Origin" name="origin_country" value={formData.tcm_social_needs?.origin_country || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="US Entry Date" name="us_entry_date" value={formData.tcm_social_needs?.us_entry_date || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={UserCheck} label="Citizen? (Include Year)" name="citizenship_status" value={formData.tcm_social_needs?.citizenship_status || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={UserCheck} label="Resident?" name="residence_status" value={formData.tcm_social_needs?.residence_status || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <Coins size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    5. Government & Financial Support Checklist
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <TcmModalCheckbox label="SSI Recipient" field="ssi_recipient" value={formData.tcm_social_needs?.ssi_recipient} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="SNAP Recipient (Food Stamps)" field="snap_recipient" value={formData.tcm_social_needs?.snap_recipient} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Medicaid Recipient" field="medicaid_recipient" value={formData.tcm_social_needs?.medicaid_recipient} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Medicare Recipient" field="medicare_recipient" value={formData.tcm_social_needs?.medicare_recipient} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="LIHEAP Needed (Utility Assistance)" field="liheap_needed" value={formData.tcm_social_needs?.liheap_needed} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Lifeline Free Phone Needed" field="lifeline_needed" value={formData.tcm_social_needs?.lifeline_needed} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Section 8 / Housing Voucher Needed" field="housing_voucher" value={formData.tcm_social_needs?.housing_voucher} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Regular Rent" field="regular_rent" value={formData.tcm_social_needs?.regular_rent} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Plan 8 / Section 8 (Current)" field="plan_8" value={formData.tcm_social_needs?.plan_8} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Low Income Housing (Current)" field="low_income" value={formData.tcm_social_needs?.low_income} onChange={handleSocialNeedsChange} />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <CheckSquare size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    6. Services Needed (12 Domains)
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                {SOCIAL_DOMAINS.map((domain) => (
                                                    <TcmModalCheckbox
                                                        key={domain.id}
                                                        label={domain.label}
                                                        field={domain.id}
                                                        value={formData.tcm_social_needs?.[domain.id]}
                                                        onChange={handleSocialNeedsChange}
                                                        onTextChange={handleSocialNeedsTextChange}
                                                        noteValue={formData.tcm_social_needs?.[`${domain.id}_note`]}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
                                            <div className="mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 flex items-center gap-2">
                                                <MoreHorizontal size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    7. Other Details & Surgeries
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                                <PremiumGlassField icon={FileText} label="Other Details" name="other_details" value={formData.tcm_social_needs?.other_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" isTextarea />
                                                <PremiumGlassField icon={FileText} label="Surgeries" name="surgeries" value={formData.tcm_social_needs?.surgeries || ''} onChange={handleSocialNeedsTextChange} theme="indigo" isTextarea />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* Footer Actions */}
                        <div className="px-8 py-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-4">
                            <div className="hidden md:flex items-center gap-2.5">
                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clinical Registry Ready</span>
                            </div>

                            <div className="flex items-center gap-3 flex-1 md:flex-none justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="h-10 px-6 rounded-full font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
                                >
                                    Discard
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !formData.first_name || !formData.last_name}
                                    className={cn(
                                        "h-10 px-8 rounded-full font-bold text-xs uppercase tracking-widest text-white transition-all duration-200 active:scale-95 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] border border-indigo-400/20 cursor-pointer flex items-center justify-center gap-2",
                                        isSaving || !formData.first_name || !formData.last_name
                                            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 shadow-none cursor-not-allowed hover:scale-100"
                                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600"
                                    )}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            <span>Registering...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} className="opacity-90" />
                                            <span>Register Patient</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// [SUB-COMPONENTS]

function ameSearchNameOverride(val: string) {
    return val;
}

function PremiumTrigger({ value, label, icon: Icon, theme }: { value: string, label: string, icon: any, theme: string }) {
    const themeStyles: Record<string, string> = {
        indigo: "data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-indigo-100 dark:data-[state=active]:border-indigo-900/40",
        emerald: "data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-emerald-100 dark:data-[state=active]:border-emerald-900/40",
        purple: "data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-purple-100 dark:data-[state=active]:border-purple-900/40",
        blue: "data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/40",
        amber: "data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-amber-100 dark:data-[state=active]:border-amber-900/40"
    };

    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex-1 rounded-full flex items-center justify-center gap-2 px-3 h-full text-[11px] font-bold uppercase tracking-wider transition-all duration-200 text-slate-500 dark:text-slate-400 border border-transparent group cursor-pointer",
                themeStyles[theme]
            )}
        >
            <Icon size={14} className="opacity-70 group-data-[state=active]:opacity-100 group-hover:scale-110 transition-transform duration-200" />
            <span className="shrink-0">{label}</span>
        </TabsTrigger>
    );
}

interface ModalFieldProps {
    icon: any;
    label: string;
    name: string;
    value?: string | null;
    onChange: (name: string, value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    isTextarea?: boolean;
    large?: boolean;
    required?: boolean;
    theme: 'indigo' | 'emerald' | 'purple' | 'blue' | 'amber';
    options?: string[];
}

function PremiumGlassField({ icon: Icon, label, name, value, onChange, placeholder, type = 'text', className, isTextarea, large, required, theme, options }: ModalFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    
    const iconBgThemes = {
        indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30",
        emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
        purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/30",
        blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30"
    };

    const focusGlowThemes = {
        indigo: "focus-within:border-indigo-500/60 dark:focus-within:border-indigo-400/60 focus-within:ring-4 focus-within:ring-indigo-500/15 dark:focus-within:ring-indigo-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]",
        emerald: "focus-within:border-emerald-500/60 dark:focus-within:border-emerald-400/60 focus-within:ring-4 focus-within:ring-emerald-500/15 dark:focus-within:ring-emerald-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]",
        purple: "focus-within:border-purple-500/60 dark:focus-within:border-purple-400/60 focus-within:ring-4 focus-within:ring-purple-500/15 dark:focus-within:ring-purple-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(168,85,247,0.15)]",
        blue: "focus-within:border-blue-500/60 dark:focus-within:border-blue-400/60 focus-within:ring-4 focus-within:ring-blue-500/15 dark:focus-within:ring-blue-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]",
        amber: "focus-within:border-amber-500/60 dark:focus-within:border-amber-400/60 focus-within:ring-4 focus-within:ring-amber-500/15 dark:focus-within:ring-amber-400/20 focus-within:shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]"
    };

    return (
        <div className={cn("space-y-1.5 group", className)}>
            <div className="flex items-center gap-2 ml-1">
                <div className={cn("size-5 rounded-md flex items-center justify-center relative border", iconBgThemes[theme])}>
                    <Icon size={12} className="relative z-10" />
                </div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider leading-none">
                    {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                </label>
            </div>

            <div className={cn(
                "rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-sm transition-all duration-200 relative overflow-hidden",
                "shadow-2xs hover:border-slate-300 dark:hover:border-slate-700",
                focusGlowThemes[theme],
                isTextarea ? (large ? "min-h-[140px]" : "min-h-[100px]") : "h-10"
            )}>
                {isTextarea ? (
                    <textarea
                        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed"
                        value={value || ''}
                        onChange={(e) => onChange(name, e.target.value)}
                        placeholder={placeholder || `Document ${label.toLowerCase()}...`}
                    />
                ) : options ? (
                    <div className="relative h-full flex items-center w-full">
                        <Select 
                            value={value || ''} 
                            onValueChange={(val) => onChange(name, val)}
                        >
                            <SelectTrigger className="w-full h-full border-none bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-4 text-xs font-semibold text-slate-900 dark:text-slate-100 justify-between hover:bg-transparent">
                                <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-[250]">
                                {options.map((opt) => (
                                    <SelectItem key={opt} value={opt} className="rounded-lg font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-indigo-600 dark:focus:text-indigo-400 py-2">
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="relative h-full flex items-center w-full">
                        {type === 'date' ? (
                            <DatePicker 
                                date={value || ''} 
                                setDate={(newDate) => onChange(name, newDate)} 
                                className="w-full h-full bg-transparent border-none shadow-none ring-0 focus-within:ring-0 px-4 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:placeholder-slate-400 dark:placeholder:placeholder-slate-500"
                                placeholder={placeholder || "MM/DD/YYYY"}
                                mode="input"
                            />
                        ) : (
                            <input
                                ref={inputRef}
                                type={type}
                                className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-4 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-none"
                                value={value || ''}
                                onChange={(e) => onChange(name, e.target.value)}
                                placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TcmModalCheckbox({ 
    label, 
    field, 
    value, 
    onChange,
    onTextChange,
    noteValue
}: { 
    label: string, 
    field: string, 
    value: boolean | undefined, 
    onChange: (field: string, checked: boolean) => void,
    onTextChange?: (field: string, value: string) => void,
    noteValue?: string
}) {
    const isChecked = !!value;
    const noteField = `${field}_note`;

    return (
        <div className={cn(
            "flex flex-col gap-2 p-3 bg-white/80 dark:bg-slate-950/60 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl transition-all duration-200 w-full hover:border-indigo-300 dark:hover:border-indigo-800",
            isChecked && "border-indigo-500/50 dark:border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs"
        )}>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={(e) => onChange(field, e.target.checked)} 
                    className="size-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0 dark:bg-slate-950 cursor-pointer" 
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
            </label>
            {isChecked && onTextChange && (
                <div className="ml-6.5 animate-in slide-in-from-top-1 duration-200">
                    <textarea
                        rows={2}
                        placeholder="Write details or notes here..."
                        value={noteValue || ''}
                        onChange={(e) => onTextChange(noteField, e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none min-h-[50px]"
                    />
                </div>
            )}
        </div>
    );
}
