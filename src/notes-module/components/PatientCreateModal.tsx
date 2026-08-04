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
import { extractPatientData } from '../../lib/services/patientIntakeService';
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
    { id: "domain_mental_health", label: "Salud Mental / Mental Health" },
    { id: "domain_physical_health", label: "Salud Física / Physical Health" },
    { id: "domain_vocational", label: "Vocacional / Employment" },
    { id: "domain_education", label: "Educación / Education" },
    { id: "domain_recreational", label: "Apoyo Social / Social Support" },
    { id: "domain_daily_living", label: "Actividades de la Vida Diaria / ADLs" },
    { id: "domain_housing", label: "Vivienda / Housing & Shelter" },
    { id: "domain_financial", label: "Financiero / Financial & Economic" },
    { id: "domain_basic_needs", label: "Necesidades Básicas / Basic Needs" },
    { id: "domain_transportation", label: "Transporte / Transportation" },
    { id: "domain_legal", label: "Legal / Immigration" },
    { id: "domain_other", label: "Otros / Other" }
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
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be logged in to search Amexzone.");
                setIsAmexSearching(false);
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

            toast.info("Search task queued. Waiting for local bot to execute...", { duration: 5000 });

            const pollingResult = await pollTaskUntilTerminal({
                signal: controller.signal,
                fetchTask: async () => {
                    const { data, error: pollError } = await supabase
                        .from('amexzone_note_tasks')
                        .select('status, error_message, result_summary')
                        .eq('id', task.id)
                        .single();

                    if (pollError || !data) throw new Error('Task status is temporarily unavailable.');
                    return data;
                },
                onPollError: () => console.warn('Amexzone task status is temporarily unavailable.'),
            });

            if (!isMountedRef.current) return;
            if (pollingResult.state === 'failed') {
                toast.error('The Amexzone search failed. Check the bot status and try again.');
                return;
            }
            if (pollingResult.state === 'timeout') {
                toast.error('Search timed out. Make sure the Amexzone bot is running.');
                return;
            }

            const data = pollingResult.task.result_summary;
            if (!data || typeof data !== 'object') {
                toast.error('The Amexzone task completed without patient data. Nothing was imported.');
                return;
            }

            toast.success("Patient demographics imported successfully!", { icon: "✨" });
                        setFormData(prev => {
                            const newState = {
                                ...prev,
                                first_name: data.first_name || prev.first_name || '',
                                last_name: data.last_name || prev.last_name || '',
                                full_name: data.full_name || `${data.first_name} ${data.last_name}`.trim(),
                                dob: data.dob || prev.dob || '',
                                phone: data.phone || prev.phone || '',
                                address: data.address || prev.address || '',
                                gender: data.gender || prev.gender || '',
                                insurance_company: data.insurance_company || prev.insurance_company || '',
                                insurance_id: data.insurance_id || prev.insurance_id || '',
                                emr_id: data.emr_id || prev.emr_id || '',
                                ssn: data.ssn || prev.ssn || '',
                                preferred_language: data.preferred_language || prev.preferred_language || 'English',
                                case_manager: data.case_manager || prev.case_manager || '',
                                emergency_contact_name: data.emergency_contact_name || prev.emergency_contact_name || '',
                                emergency_contact_phone: data.emergency_contact_phone || prev.emergency_contact_phone || '',
                                diagnoses: data.diagnoses || prev.diagnoses || '',
                                pcp_name: data.pcp_name || prev.pcp_name || '',
                                pharmacy_name: data.pharmacy_name || prev.pharmacy_name || '',
                                pharmacy_phone: data.pharmacy_phone || prev.pharmacy_phone || '',
                                pharmacy_fax: data.pharmacy_fax || prev.pharmacy_fax || '',
                                pharmacy_address: data.pharmacy_address || prev.pharmacy_address || '',
                                psych_name: data.psych_name || prev.psych_name || '',
                                psych_phone: data.psych_phone || prev.psych_phone || '',
                                psych_address: data.psych_address || prev.psych_address || '',
                                psych_conditions: data.mental_conditions || prev.psych_conditions || '',
                                psych_medications: data.psych_medications || prev.psych_medications || '',
                                pcp_phone: data.pcp_phone || prev.pcp_phone || '',
                                pcp_address: data.pcp_address || prev.pcp_address || '',
                                pcp_conditions: data.physical_conditions || prev.pcp_conditions || '',
                                pcp_medications: data.pcp_medications || prev.pcp_medications || '',
                                tcm_social_needs: {
                                    ...(prev.tcm_social_needs || {}),
                                    marital_status: data.marital_status || (prev.tcm_social_needs && prev.tcm_social_needs.marital_status) || '',
                                    education_level: data.education_level || (prev.tcm_social_needs && prev.tcm_social_needs.education_level) || '',
                                    ssi_details: data.ssi_details || (prev.tcm_social_needs && prev.tcm_social_needs.ssi_details) || '',
                                    medicaid_details: data.medicaid_status || (prev.tcm_social_needs && prev.tcm_social_needs.medicaid_details) || '',
                                    medicare_details: data.medicare_status || (prev.tcm_social_needs && prev.tcm_social_needs.medicare_details) || ''
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
                toast.warning("Datos extraídos, pero faltan el nombre o apellido. Por favor completa el formulario.");
                return;
            }

            const newPatient = await storage.upsertPatient(updatedData as Patient);
            
            if (newPatient) {
                toast.success("Paciente creado automáticamente", { icon: "✨" });
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
                toast.error("Error al guardar el paciente");
            }
        } catch (error) {
            console.error("Extraction error:", error);
            toast.error("Error al extraer datos del documento");
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
                className="max-w-[1024px] h-[85vh] max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900 translate-x-0 translate-y-0 inset-0 m-auto flex flex-col"
            >
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-full blur-3xl -mr-32 -mt-32 -z-10" />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="size-14 rounded-[20px] bg-indigo-50/75 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/20 dark:border-indigo-900/30 shadow-sm relative group">
                                    <UserPlus size={28} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                                            Register New Patient
                                        </DialogTitle>
                                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                                            Clinical Intake
                                        </Badge>
                                    </div>
                                    <DialogDescription className="sr-only">
                                        Register a new patient record in Clio Suite.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </div>
 
                    <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                        {/* Tabs Navigation */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-8 py-3">
                                <TabsList className="bg-slate-50 dark:bg-slate-950 p-1 h-12 rounded-full border border-slate-200/50 dark:border-slate-800/80 shadow-sm w-full grid grid-cols-4 overflow-hidden gap-1">
                                    <PremiumTrigger value="client" label="Client" icon={User} theme="indigo" />
                                    <PremiumTrigger value="medical" label="Medical" icon={DoctorIcon} theme="emerald" />
                                    <PremiumTrigger value="psychiatric" label="Psychiatric" icon={PsychIcon} theme="purple" />
                                    <PremiumTrigger value="social" label="Social" icon={ClipboardList} theme="blue" />
                                </TabsList>
                            </div>
 
                            <div className="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar bg-slate-50/20 dark:bg-slate-950/10">
                                {/* [CLIENT TAB] */}
                                <TabsContent value="client" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {/* AI Extraction Dropzone */}
                                        <div 
                                            className={cn(
                                                "relative rounded-[2rem] border border-dashed overflow-hidden transition-all duration-500 group flex flex-col justify-center min-h-[300px]",
                                                isExtracting 
                                                    ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/20 shadow-[inset_0_2px_20px_rgba(99,102,241,0.15)]" 
                                                    : "border-slate-200/80 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 hover:border-indigo-400/80 hover:bg-gradient-to-b hover:from-white hover:to-indigo-50/10 dark:hover:from-slate-950 dark:hover:to-indigo-950/5 hover:shadow-[0_20px_40px_-20px_rgba(79,70,229,0.12)]"
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
                                            <div className="flex flex-col items-center justify-center p-8 text-center relative z-0">
                                                {isExtracting ? (
                                                    <div className="animate-in fade-in duration-500 flex flex-col items-center">
                                                        <div className="size-16 rounded-[22px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-5 relative group-hover:scale-105 transition-transform duration-300">
                                                            <Loader2 className="absolute h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                                                            <FileText className="h-6 w-6 opacity-30" />
                                                        </div>
                                                        <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-[0.2em] mb-1.5">Analyzing Intake...</h3>
                                                        <p className="text-[11px] font-bold text-indigo-500/70 dark:text-indigo-450 tracking-tight leading-relaxed max-w-[200px]">Extracting demographics & clinical details via Health AI</p>
                                                    </div>
                                                ) : (
                                                    <div className="animate-in fade-in duration-500 flex flex-col items-center transition-all duration-500 group-hover:-translate-y-1">
                                                        <div className="size-16 rounded-[22px] bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800 mb-5 group-hover:scale-110 group-hover:border-indigo-200/50 group-hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)] dark:group-hover:shadow-none transition-all duration-500 relative">
                                                            <div className="absolute inset-0 bg-indigo-500/5 rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <UploadCloud size={28} className="relative z-10" />
                                                        </div>
                                                        <h3 className="text-[14px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] mb-2.5">Upload Clinical Intake</h3>
                                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 max-w-[240px] mb-6 leading-relaxed">
                                                            Drag and drop patient forms to <span className="text-indigo-500 font-black">auto-fill</span> this entire profile automatically.
                                                        </p>
                                                        <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/80 text-slate-450 dark:text-slate-400 font-bold px-4 py-1.5 text-[9px] uppercase tracking-widest rounded-full shadow-sm">
                                                            PDF • JPG • PNG
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
 
                                        {/* Amexzone Lookup */}
                                        <div className="relative rounded-[2rem] border border-slate-200/75 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 p-8 flex flex-col justify-between shadow-sm overflow-hidden group min-h-[300px] hover:border-indigo-400/30 hover:shadow-[0_20px_40px_-20px_rgba(99,102,241,0.05)] transition-all duration-500">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 dark:bg-indigo-950/5 rounded-full blur-3xl -mr-16 -mt-16 -z-10" />
                                            
                                            <div className="flex flex-col h-full justify-between gap-5">
                                                <div>
                                                    <div className="flex items-center gap-3.5 mb-2.5">
                                                        <div className="size-8 rounded-[12px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/5 shadow-sm relative overflow-hidden">
                                                            {isAmexSearching && <span className="absolute inset-0 bg-indigo-500/10 animate-pulse" />}
                                                            <Activity size={16} className="relative z-10 animate-pulse" />
                                                        </div>
                                                        <h3 className="text-[14px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] leading-none">
                                                            Amexzone Lookup
                                                        </h3>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 leading-relaxed mb-5">
                                                        Retrieve demographic, social and provider coordination details in real-time.
                                                    </p>
 
                                                    {/* Input Fields */}
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest block ml-2">Patient Name</label>
                                                            <div className="rounded-[28px] border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 h-10 relative overflow-hidden focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                                                                <input
                                                                    type="text"
                                                                    placeholder="E.g. Olga Aguila"
                                                                    value={amexSearchName}
                                                                    onChange={(e) => setAmexSearchName(e.target.value)}
                                                                    disabled={isAmexSearching || isExtracting}
                                                                    className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-5 text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-650"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-455 dark:text-slate-555 uppercase tracking-widest block ml-2">Date of Birth (Optional)</label>
                                                            <div className="rounded-[28px] border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 h-10 relative overflow-hidden focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50/5 transition-all">
                                                                <input
                                                                    type="text"
                                                                    placeholder="MM/DD/YYYY"
                                                                    value={amexSearchDob}
                                                                    onChange={handleAmexSearchDobChange}
                                                                    disabled={isAmexSearching || isExtracting}
                                                                    className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none px-5 text-xs font-bold text-slate-850 dark:text-slate-100 text-left cursor-text"
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
                                                        "w-full h-10 rounded-[28px] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all duration-300",
                                                        isAmexSearching || isExtracting || !amexSearchName.trim()
                                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800"
                                                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-100 dark:shadow-none hover:shadow-indigo-200/30"
                                                    )}
                                                >
                                                    {isAmexSearching ? (
                                                        <>
                                                            <Loader2 size={13} className="animate-spin" />
                                                            <span>Searching Amexzone...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck size={13} />
                                                            <span>Search & Import</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn("transition-all duration-700 space-y-6", isExtracting && "opacity-40 blur-[4px] pointer-events-none scale-[0.98]")}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Left Column: Identity & Contact */}
                                            <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5 shadow-sm">
                                                <div className="mb-2">
                                                    <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">Identity & Contact</h4>
                                                </div>
                                                <PremiumGlassField icon={User} label="First Name" name="first_name" value={formData.first_name} onChange={handleFieldChange} theme="indigo" placeholder="E.g. Alice" required />
                                                <PremiumGlassField icon={User} label="Last Name" name="last_name" value={formData.last_name} onChange={handleFieldChange} theme="indigo" placeholder="E.g. Wonder" required />
                                                <PremiumGlassField icon={Phone} label="Primary Contact" name="phone" value={formData.phone} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="Date of Birth" name="dob" value={formData.dob} onChange={handleFieldChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={Shield} label="SSN / National ID" name="ssn" value={formData.ssn} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={MapPin} label="Residential Address" name="address" value={formData.address} onChange={handleFieldChange} theme="indigo" />
                                            </div>

                                            {/* Right Column: Clinical Coordination */}
                                            <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5 shadow-sm">
                                                <div className="mb-2">
                                                    <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">Clinical Coordination</h4>
                                                </div>
                                                <PremiumGlassField icon={Shield} label="Insurance Company" name="insurance_company" value={formData.insurance_company} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Shield} label="Member ID" name="insurance_id" value={formData.insurance_id} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={Hash} label="Case Number" name="case_number" value={formData.case_number} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={BadgeCheck} label="Citizenship Status" name="citizenship" value={formData.citizenship} onChange={handleFieldChange} theme="indigo" />
                                                <PremiumGlassField icon={User} label="Preferred Language" name="preferred_language" value={formData.preferred_language} onChange={handleFieldChange} theme="indigo" options={['English', 'Spanish']} />

                                                {/* Emergency Protocol */}
                                                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/55">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Emergency Protocol</p>
                                                    <div className="space-y-4">
                                                        <PremiumGlassField icon={User} label="Emergency Contact" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleFieldChange} theme="amber" />
                                                        <PremiumGlassField icon={Phone} label="Emergency Phone" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleFieldChange} theme="amber" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Clinical Overview & ICD-10 */}
                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5 shadow-sm">
                                            <div className="space-y-6">
                                                <div className="mb-2">
                                                    <h4 className="text-[11px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">Clinical Overview</h4>
                                                </div>
                                                <PremiumGlassField icon={ClipboardList} label="Primary Case Narrative" name="presenting_problems" value={formData.presenting_problems} onChange={handleFieldChange} theme="indigo" isTextarea large className="col-span-2" />
                                                
                                                <div className="space-y-4 px-0.5 mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-8">
                                                    <div className="flex items-center gap-3 transition-transform duration-300 hover:translate-x-1">
                                                        <div className="size-6 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500 relative border border-indigo-100/50 dark:border-indigo-900/30">
                                                            <Activity size={13} className="relative z-10" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none opacity-90">Diagnostic Registry (ICD-10)</p>
                                                    </div>

                                                    <div className="relative group">
                                                        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                        <div className="rounded-[24px] border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-500 relative overflow-hidden group-focus-within:border-indigo-300 group-focus-within:ring-4 group-focus-within:ring-indigo-500/5 shadow-sm">
                                                            <textarea
                                                                className="w-full min-h-[120px] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none px-6 py-4 text-[14px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none leading-relaxed relative z-10"
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
                                                            <div className="absolute z-50 bottom-full mb-3 left-0 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                                <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-8">
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
                                                                            className="w-full text-left px-8 py-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 group flex items-center justify-between gap-4"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded shadow-tiny shrink-0">{s.code}</span>
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.description}</span>
                                                                            </div>
                                                                            <Plus size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                    <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                            <PremiumGlassField icon={DoctorIcon} label="PCP Name" name="pcp_name" value={formData.pcp_name} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Store} label="PCP Clinic Name" name="pcp_clinic_name" value={formData.pcp_clinic_name} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Phone} label="PCP Phone" name="pcp_phone" value={formData.pcp_phone} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={MapPin} label="PCP Practice Address" name="pcp_address" value={formData.pcp_address} onChange={handleFieldChange} theme="emerald" />
                                            <PremiumGlassField icon={Activity} label="Physical Conditions" name="pcp_conditions" value={formData.pcp_conditions} onChange={handleFieldChange} theme="emerald" isTextarea />
                                            <PremiumGlassField icon={HeartPulse} label="Current Medications" name="pcp_medications" value={formData.pcp_medications} onChange={handleFieldChange} theme="emerald" isTextarea />
                                            <div className="col-span-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/30">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                                                    <Store size={12} className="text-amber-400" />
                                                    Preferred Pharmacy
                                                </p>
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                    <PremiumGlassField icon={Store} label="Pharmacy Name" name="pharmacy_name" value={formData.pharmacy_name} onChange={handleFieldChange} theme="amber" />
                                                    <PremiumGlassField icon={Phone} label="Pharmacy Phone" name="pharmacy_phone" value={formData.pharmacy_phone} onChange={handleFieldChange} theme="amber" />
                                                    <PremiumGlassField icon={MapPin} label="Pharmacy Address" name="pharmacy_address" value={formData.pharmacy_address} onChange={handleFieldChange} theme="amber" className="col-span-2" />
                                                    <PremiumGlassField icon={FileText} label="Pharmacy Fax" name="pharmacy_fax" value={formData.pharmacy_fax} onChange={handleFieldChange} theme="amber" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [PSYCHIATRIC TAB] */}
                                <TabsContent value="psychiatric" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                            <PremiumGlassField icon={Brain} label="Psychiatrist Name" name="psych_name" value={formData.psych_name} onChange={handleFieldChange} theme="purple" />
                                            <PremiumGlassField icon={Phone} label="Psych Phone" name="psych_phone" value={formData.psych_phone} onChange={handleFieldChange} theme="purple" />
                                            <PremiumGlassField icon={MapPin} label="Clinic Address" name="psych_address" value={formData.psych_address} onChange={handleFieldChange} theme="purple" className="col-span-2" />
                                            <PremiumGlassField icon={Activity} label="Mental Conditions" name="psych_conditions" value={formData.psych_conditions} onChange={handleFieldChange} theme="purple" isTextarea />
                                            <PremiumGlassField icon={HeartPulse} label="Psychiatric Medications" name="psych_medications" value={formData.psych_medications} onChange={handleFieldChange} theme="purple" isTextarea />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* [SOCIAL TAB] */}
                                <TabsContent value="social" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <div className="space-y-6">
                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <Coins size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    1. Government Assistance
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <PremiumGlassField icon={DollarSign} label="Food Stamps Amount" name="food_stamps_amount" value={formData.tcm_social_needs?.food_stamps_amount || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="Food Stamps Since" name="food_stamps_since" value={formData.tcm_social_needs?.food_stamps_since || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={FileText} label="Medicaid Status/No." name="medicaid_details" value={formData.tcm_social_needs?.medicaid_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" className="col-span-2" />
                                                <PremiumGlassField icon={FileText} label="Medicare Status/No." name="medicare_details" value={formData.tcm_social_needs?.medicare_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={FileText} label="SSI Details" name="ssi_details" value={formData.tcm_social_needs?.ssi_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <Users size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    2. Family & Cohabitation
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <PremiumGlassField icon={GraduationCap} label="Education Level" name="education_level" value={formData.tcm_social_needs?.education_level || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Heart} label="Marital Status" name="marital_status" value={formData.tcm_social_needs?.marital_status || ''} onChange={handleSocialNeedsTextChange} theme="indigo" options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated']} />
                                                <PremiumGlassField icon={Users} label="Who they live with (Name, relationship, age)" name="co_habitants" value={formData.tcm_social_needs?.co_habitants || ''} onChange={handleSocialNeedsTextChange} theme="indigo" className="col-span-2" isTextarea />
                                                <PremiumGlassField icon={Users} label="Number of Children" name="children_count" value={formData.tcm_social_needs?.children_count || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="number" />
                                                <PremiumGlassField icon={MapPin} label="Where children live" name="children_location" value={formData.tcm_social_needs?.children_location || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <Briefcase size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    3. Employment & Financials
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <PremiumGlassField icon={Briefcase} label="Occupation" name="occupation" value={formData.tcm_social_needs?.occupation || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="Retirement / Disability Date" name="retirement_date" value={formData.tcm_social_needs?.retirement_date || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={DollarSign} label="Supplemental SSI Amount" name="ssi_amount" value={formData.tcm_social_needs?.ssi_amount || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={DollarSign} label="SSA Amount" name="ssa_amount" value={formData.tcm_social_needs?.ssa_amount || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <Globe size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    4. Origin & Immigration
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                                <PremiumGlassField icon={Globe} label="Country of Origin" name="origin_country" value={formData.tcm_social_needs?.origin_country || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={Calendar} label="US Entry Date" name="us_entry_date" value={formData.tcm_social_needs?.us_entry_date || ''} onChange={handleSocialNeedsTextChange} theme="indigo" type="date" />
                                                <PremiumGlassField icon={UserCheck} label="Citizen? (Include Year)" name="citizenship_status" value={formData.tcm_social_needs?.citizenship_status || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                                <PremiumGlassField icon={UserCheck} label="Resident?" name="residence_status" value={formData.tcm_social_needs?.residence_status || ''} onChange={handleSocialNeedsTextChange} theme="indigo" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <Coins size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    5. Financial Support Services
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <TcmModalCheckbox label="Regular Income / Renta Regular" field="regular_income" value={formData.tcm_social_needs?.regular_income} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Regular Rent / Pago Regular de Renta" field="regular_rent" value={formData.tcm_social_needs?.regular_rent} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Plan 8 / Section 8" field="plan_8" value={formData.tcm_social_needs?.plan_8} onChange={handleSocialNeedsChange} />
                                                <TcmModalCheckbox label="Low Income Housing (Current) / Bajo Recurso" field="low_income" value={formData.tcm_social_needs?.low_income} onChange={handleSocialNeedsChange} />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <CheckSquare size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    6. Services Needed (12 Domains)
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                                        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-[1.5rem] p-8 shadow-sm">
                                            <div className="mb-6 border-b border-slate-100 dark:border-slate-800/20 pb-3 flex items-center gap-2">
                                                <MoreHorizontal size={14} className="text-indigo-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    7. Other Details & Surgeries
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-5 col-span-2">
                                                <PremiumGlassField icon={FileText} label="Other Details" name="other_details" value={formData.tcm_social_needs?.other_details || ''} onChange={handleSocialNeedsTextChange} theme="indigo" isTextarea />
                                                <PremiumGlassField icon={FileText} label="Surgeries" name="surgeries" value={formData.tcm_social_needs?.surgeries || ''} onChange={handleSocialNeedsTextChange} theme="indigo" isTextarea />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* Footer Actions */}
                        <div className="px-10 py-4 border-t border-slate-100/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between gap-6">
                            <div className="hidden md:flex items-center gap-3 ml-2">
                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Ready for validation</span>
                            </div>

                            <div className="flex items-center gap-4 flex-1 md:flex-none">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1 md:w-32 h-11 rounded-[28px] font-black text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 transition-all duration-300 animate-none hover:shadow-none shadow-none"
                                >
                                    Discard
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || !formData.first_name || !formData.last_name}
                                    className={cn(
                                        "flex-1 md:px-12 h-11 rounded-[28px] font-black text-[10px] uppercase tracking-[0.2em] text-white border gap-3 transition-all duration-350 active:scale-[0.97] group/btn relative overflow-hidden",
                                        isSaving || !formData.first_name || !formData.last_name
                                            ? "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-650 border-slate-200/50 dark:border-slate-800 shadow-none cursor-not-allowed"
                                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border-indigo-500/10 shadow-lg shadow-indigo-500/15 dark:shadow-none hover:shadow-indigo-550/25 hover:scale-[1.02] cursor-pointer"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin" size={15} />
                                            Establishing...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} className="text-white opacity-80 group-hover/btn:scale-110 transition-transform duration-300" />
                                            Register Patient
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

function PremiumTrigger({ value, label, icon: Icon, theme }: { value: string, label: string, icon: any, theme: string }) {
    const themeShadows: Record<string, string> = {
        indigo: "data-[state=active]:shadow-indigo-100/50 dark:data-[state=active]:shadow-indigo-950/20 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:bg-indigo-50/50 dark:data-[state=active]:bg-indigo-950/30",
        emerald: "data-[state=active]:shadow-emerald-100/50 dark:data-[state=active]:shadow-emerald-950/20 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-50/50 dark:data-[state=active]:bg-emerald-950/30",
        purple: "data-[state=active]:shadow-purple-100/50 dark:data-[state=active]:shadow-purple-950/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:bg-purple-50/50 dark:data-[state=active]:bg-purple-950/30",
        blue: "data-[state=active]:shadow-blue-100/50 dark:data-[state=active]:shadow-blue-950/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-blue-50/50 dark:data-[state=active]:bg-blue-950/30",
        amber: "data-[state=active]:shadow-amber-100/50 dark:data-[state=active]:shadow-amber-950/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:bg-amber-50/50 dark:data-[state=active]:bg-amber-950/30"
    };

    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex-1 rounded-full flex items-center justify-center gap-2.5 px-4 h-full text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 text-slate-500 dark:text-slate-400 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-slate-200/40 dark:data-[state=active]:shadow-slate-950/40 border border-transparent data-[state=active]:border-slate-100 dark:data-[state=active]:border-slate-800/60 group",
                themeShadows[theme]
            )}
        >
            <Icon size={14} className="opacity-60 group-data-[state=active]:opacity-100 group-hover:scale-110 transition-all duration-300" />
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
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-100/50 dark:border-indigo-900/30",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-100/50 dark:border-emerald-900/30",
        purple: "bg-purple-500/10 text-purple-500 border-purple-100/50 dark:border-purple-900/30",
        blue: "bg-blue-500/10 text-blue-500 border-blue-100/50 dark:border-blue-900/30",
        amber: "bg-amber-500/10 text-amber-500 border-amber-100/50 dark:border-amber-900/30"
    };

    return (
        <div className={cn("space-y-1.5 group", className)}>
            <div className="flex items-center gap-3 ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
                <div className={cn("size-6 rounded-lg flex items-center justify-center relative", iconBgThemes[theme])}>
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
                    <Icon size={13} className="relative z-10" />
                </div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none opacity-90">
                    {label} {required && <span className="text-red-500">*</span>}
                </p>
            </div>

            <div className={cn(
                "rounded-[28px] border border-slate-200/70 dark:border-slate-800/60 bg-white dark:bg-slate-950 transition-[border-color,box-shadow,background-color] duration-200 relative overflow-hidden",
                "shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.4)]",
                "hover:border-primary/35 dark:hover:border-primary/50",
                "focus-within:border-indigo-300 dark:focus-within:border-indigo-800 focus-within:ring-4 focus-within:ring-indigo-500/5 dark:focus-within:ring-indigo-500/10",
                isTextarea ? (large ? "min-h-[160px]" : "min-h-[110px]") : "h-11"
            )}>

                {isTextarea ? (
                        <textarea
                            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none px-6 py-4 text-[14px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-650 resize-none leading-relaxed shadow-none hover:shadow-none animate-none"
                            value={value || ''}
                            onChange={(e) => onChange(name, e.target.value)}
                            placeholder={placeholder || `Document ${label.toLowerCase()}...`}
                        />
                ) : options ? (
                    <div className="relative h-full flex items-center px-0 w-full">
                        <Select 
                            value={value || ''} 
                            onValueChange={(val) => onChange(name, val)}
                        >
                            <SelectTrigger className="w-full h-full border-none bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-6 text-[14px] font-bold text-slate-900 dark:text-slate-100 justify-between pr-4 hover:bg-transparent [&>svg]:opacity-50">
                                <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
                            </SelectTrigger>
                            <SelectContent className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 z-[250]">
                                {options.map((opt) => (
                                    <SelectItem key={opt} value={opt} className="rounded-xl font-bold text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-indigo-600 dark:focus:text-indigo-400 py-2.5">
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="relative h-full flex items-center px-0 w-full">
                        {type === 'date' ? (
                            <DatePicker 
                                date={value || ''} 
                                setDate={(newDate) => onChange(name, newDate)} 
                                className="w-full h-full bg-transparent border-none shadow-none ring-0 focus-within:ring-0 px-6 font-bold text-slate-800 dark:text-slate-100 placeholder:placeholder-slate-300 dark:placeholder:placeholder-slate-650"
                                placeholder={placeholder || "MM/DD/YYYY"}
                                mode="input"
                            />
                        ) : (
                            <input
                                ref={inputRef}
                                type={type}
                                className={cn(
                                    "w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none px-6 text-[14px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-650 leading-none shadow-none hover:shadow-none"
                                )}
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
            "flex flex-col gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl transition-all w-full",
            isChecked && "border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-50/5 dark:bg-indigo-950/10"
        )}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={(e) => onChange(field, e.target.checked)} 
                    className="size-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0 dark:bg-slate-950" 
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
            </label>
            {isChecked && onTextChange && (
                <div className="ml-7 animate-in slide-in-from-top-1 duration-200">
                    <textarea
                        rows={2}
                        placeholder="Write details or notes here..."
                        value={noteValue || ''}
                        onChange={(e) => onTextChange(noteField, e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none min-h-[50px]"
                    />
                </div>
            )}
        </div>
    );
}
