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
    Loader2
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
    const [suggestions, setSuggestions] = useState<DiagnosisCode[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAutofillModeModal, setShowAutofillModeModal] = useState(false);
    const [selectedAutofillFile, setSelectedAutofillFile] = useState<File | null>(null);

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
        <div className="max-w-[1100px] mx-auto p-4 lg:p-8 space-y-12 animate-in fade-in duration-1000">
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
                        className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-indigo-200 dark:hover:border-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-450 font-bold shadow-sm transition-all flex items-center gap-2 group disabled:opacity-50"
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
                                className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-indigo-200 dark:hover:border-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-450 font-bold shadow-sm transition-all flex items-center gap-2 group"
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
            <Tabs defaultValue="client" className="w-full">
                <TabsList className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md p-1 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-sm w-full flex overflow-x-auto whitespace-nowrap h-12 mb-10 scrollbar-none justify-start lg:justify-around">
                    <PremiumTrigger value="client" icon={User} label={language === 'es' ? "Cliente" : "Client"} theme="indigo" />
                    <PremiumTrigger value="medical" icon={Stethoscope} label={language === 'es' ? "Médico" : "Medical"} theme="emerald" />
                    <PremiumTrigger value="psychiatric" icon={Brain} label={language === 'es' ? "Psiquiátrico" : "Psychiatric"} theme="purple" />
                    <PremiumTrigger value="pharmacy" icon={Store} label={language === 'es' ? "Farmacia" : "Pharmacy"} theme="amber" />
                    <PremiumTrigger value="history" icon={Clock} label={language === 'es' ? "Historial" : "History"} theme="slate" />
                </TabsList>

                <div className="animate-in slide-in-from-bottom-5 duration-700 ease-out">
                    {/* [CLIENT TAB] */}
                    <TabsContent value="client" className="m-0 focus-visible:outline-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Identity & Contact */}
                            <div className="bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5">
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
                            <div className="bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5">
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
                                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-850">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                                        {language === 'es' ? 'Protocolo de Emergencia' : 'Emergency Protocol'}
                                    </p>
                                    <div className="space-y-4">
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

                        <div className="mt-8 bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-[1.5rem] p-6 md:p-8">
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
                                            patient.diagnoses.split('\n').filter(d => d.trim()).map((diag, i) => {
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
                    </TabsContent>

                    {/* [MEDICAL TAB] */}
                    <TabsContent value="medical" className="m-0 focus-visible:outline-none">
                        <div className="bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-[1.5rem] p-6 md:p-8">
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
                    </TabsContent>

                    {/* [PSYCHIATRIC TAB] */}
                    <TabsContent value="psychiatric" className="m-0 focus-visible:outline-none">
                        <div className="bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-[1.5rem] p-6 md:p-8">
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
                    </TabsContent>

                    {/* [PHARMACY TAB] */}
                    <TabsContent value="pharmacy" className="m-0 focus-visible:outline-none">
                        <div className="bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800 rounded-[1.5rem] p-6 md:p-8">
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
                    </TabsContent>

                    {/* [HISTORY TAB] */}
                    <TabsContent value="history" className="m-0 focus-visible:outline-none">
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
        "Allergies": "Alergias"
    };

    const translatedLabel = language === 'es' ? (labelTranslations[label] || label) : label;

    return (
        <div className={cn("space-y-1.5 group", className)}>
            <div className="flex items-center gap-3 ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
                <div className={cn("size-6 rounded-lg flex items-center justify-center relative", iconBgThemes[theme])}>
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
                    <Icon size={13} className="relative z-10" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-none opacity-90">{translatedLabel}</p>
            </div>

            <div className={cn(
                "rounded-[28px] border transition-all duration-300 relative overflow-hidden",
                "shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]",
                isEditing 
                    ? "hover:border-indigo-300 border-indigo-200 dark:border-slate-800 ring-2 ring-indigo-50/30 dark:ring-indigo-950/40 bg-white dark:bg-slate-950 shadow-sm" 
                    : (!value ? "border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 font-medium italic" : "border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900/40 hover:border-indigo-100 dark:hover:border-indigo-900"),
                isTextarea ? (large ? "min-h-[170px]" : "min-h-[120px]") : "h-11"
            )}>

                {isEditing ? (
                    isTextarea ? (
                        <textarea
                            className="w-full h-full bg-transparent border-none outline-none p-4 text-[14px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none leading-relaxed"
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
                                <SelectValue placeholder={language === 'es' ? "Seleccionar idioma..." : "Select language..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 z-[250]">
                                {options.map((opt) => (
                                    <SelectItem key={opt} value={opt} className="rounded-xl font-bold text-[13px] text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-indigo-600 dark:focus:text-indigo-400 py-2.5">
                                        {language === 'es' ? (opt === 'English' ? 'Inglés' : opt === 'Spanish' ? 'Español' : opt) : opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <input
                            type={type || "text"}
                            className="w-full h-full bg-transparent border-none outline-none px-5 text-[14px] font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-none pr-8"
                            value={value || ''}
                            onChange={(e) => onChange?.(name!, e.target.value)}
                            placeholder={language === 'es' ? `Ingresar ${translatedLabel.toLowerCase()}...` : `Enter ${label.toLowerCase()}...`}
                        />
                    )
                ) : (
                    <div className="w-full h-full px-6 py-2 flex items-center">
                        <span className={cn(
                            "relative z-10 text-[14px] leading-relaxed",
                            !value ? "text-slate-400/80 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"
                        )}>
                            {value || (language === 'es' ? `Sin ${translatedLabel.toLowerCase()} registrado` : `No documented ${label.toLowerCase()}`)}
                        </span>
                    </div>
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
