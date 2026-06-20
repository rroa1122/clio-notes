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
    Store
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { storage, type Patient as StoragePatient } from '../notes-module/lib/storage';
import { getCalls } from '../data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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

export function PatientDetail() {
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

    const loadData = useCallback(async (isRetry = false) => {
        if (!id) return;
        if (!isRetry) setLoading(true);

        try {
            const foundPatient = await storage.getPatient(id);

            if (foundPatient) {
                setPatient(foundPatient);
                setEditData(foundPatient); // Initialize edit data

                // Registrar log de auditoría una sola vez por paciente consultado
                if (loggedRef.current !== id) {
                    loggedRef.current = id;
                    import('../services/auditService').then(({ auditService }) => {
                        auditService.logAction({
                            action: 'ACCESS',
                            description: `Accedió al expediente del paciente ${foundPatient.full_name}`,
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
                            "Clinical encounter recorded.";

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
            await storage.upsertPatient({ ...editData, id });
            setPatient({ ...patient, ...editData } as StoragePatient);
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
        setEditData(patient || {});
        setIsEditing(false);
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
            <div className="max-w-2xl mx-auto my-20 p-12 text-center bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
                <h2 className="text-3xl font-black text-slate-900 mb-4">Client Not Found</h2>
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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 py-6 mb-10 border-b border-slate-100/60 relative">
                <div className="flex items-center gap-8">
                    <div className="relative group">
                        <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500/20 to-indigo-300/10 rounded-[32px] blur-xl opacity-40 transform scale-90 group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative size-16 rounded-[24px] bg-white text-indigo-600 flex items-center justify-center border border-indigo-50 shadow-sm transition-transform duration-500 group-hover:rotate-3 group-hover:scale-105">
                            <User size={32} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                                {isEditing ? (editData.full_name || patient.full_name) : patient.full_name}
                            </h1>
                            <div className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors",
                                isEditing ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200/50"
                            )}>
                                {isEditing ? "Editing Mode" : "EMR Registry"}
                            </div>
                        </div>
                        <div className="flex items-center gap-6 mt-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm transition-all hover:bg-white hover:border-indigo-100 group/meta">
                                <Calendar size={13} className="text-indigo-400 group-hover/meta:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {patient.dob ? format(new Date(patient.dob), 'MMM dd, yyyy') : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm transition-all hover:bg-white hover:border-indigo-100 group/meta">
                                <Hash size={13} className="text-indigo-400 group-hover/meta:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                                    {patient.emr_id || patient.id.slice(0, 8)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isEditing ? (
                        <>
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="h-11 px-6 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 font-bold shadow-sm transition-all flex items-center gap-2.5 group"
                            >
                                <Edit3 size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-[10px] uppercase tracking-[0.15em]">Edit Profile</span>
                            </Button>
                            <Button
                                onClick={() => navigate(`/notes/new?patientId=${patient.id}`)}
                                className="h-11 px-7 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2.5 transform active:scale-95 group"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span className="text-[10px] uppercase tracking-[0.15em]">New Encounter</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={handleCancel}
                                variant="ghost"
                                className="h-11 px-6 rounded-full text-slate-400 hover:text-slate-600 font-bold transition-all flex items-center gap-2.5"
                                disabled={isSaving}
                            >
                                <X size={18} />
                                <span className="text-[10px] uppercase tracking-[0.15em]">Cancel</span>
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="h-11 px-7 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2.5 transform active:scale-95 disabled:opacity-50"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <div className="size-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                <span className="text-[10px] uppercase tracking-[0.15em]">
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </span>
                            </Button>
                        </>
                    )}
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-100 relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
            {/* Premium Unified Tabbed Interface */}
            <Tabs defaultValue="client" className="w-full">
                <TabsList className="bg-slate-50/50 backdrop-blur-md p-1 rounded-full border border-slate-200/50 shadow-sm w-full grid grid-cols-2 md:grid-cols-4 h-12 overflow-hidden mb-10">
                    <PremiumTrigger value="client" icon={User} label="Client" theme="indigo" />
                    <PremiumTrigger value="medical" icon={Stethoscope} label="Medical" theme="emerald" />
                    <PremiumTrigger value="psychiatric" icon={Brain} label="Psychiatric" theme="purple" />
                    <PremiumTrigger value="pharmacy" icon={Store} label="Pharmacy" theme="amber" />
                </TabsList>

                <div className="animate-in slide-in-from-bottom-5 duration-700 ease-out">
                    {/* [CLIENT TAB] */}
                    <TabsContent value="client" className="m-0 focus-visible:outline-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Identity & Contact */}
                            <div className="bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5">
                                <div className="mb-2">
                                    <h4 className="text-[11px] font-black tracking-widest text-slate-400 uppercase">Identity & Contact</h4>
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
                                    value={isEditing ? editData.dob : (patient.dob ? format(new Date(patient.dob), 'MMM dd, yyyy') : 'N/A')}
                                    isEditing={isEditing}
                                    onChange={handleFieldChange}
                                    theme="indigo"
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
                            <div className="bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] p-6 md:p-8 flex flex-col gap-5">
                                <div className="mb-2">
                                    <h4 className="text-[11px] font-black tracking-widest text-slate-400 uppercase">Clinical Coordination</h4>
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
                                    icon={Briefcase}
                                    label="Case Manager"
                                    name="case_manager"
                                    value={isEditing ? editData.case_manager : patient.case_manager}
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
                                />
                                <div className="mt-4 pt-4 border-t border-slate-200/50">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Emergency Protocol</p>
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

                        <div className="mt-8 bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] p-6 md:p-8">
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
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Diagnostic Registry</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {patient.diagnoses ? (
                                            patient.diagnoses.split('\n').filter(d => d.trim()).map((diag, i) => (
                                                <div key={i} className="flex items-center gap-4 bg-white/40 backdrop-blur-sm border border-slate-200/50 h-[46px] px-4 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 hover:translate-x-1 group relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-md border border-indigo-100/50 shadow-tiny shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 uppercase tracking-widest">
                                                        {diag.split(' - ')[0]}
                                                    </span>
                                                    <span className="text-[14px] font-bold text-slate-700 leading-snug truncate">{diag.split(' - ').slice(1).join(' ') || diag}</span>
                                                </div>
                                            ))
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
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Registry Diagnoses (ICD-10 - Description, one per line)</p>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            className="w-full min-h-[120px] rounded-[16px] border border-slate-200/50 bg-white/40 shadow-sm p-4 text-[14px] font-bold text-slate-700 placeholder:text-slate-300 resize-none leading-relaxed outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all focus:bg-white"
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
                                            <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white border border-slate-100 rounded-[16px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="p-2 border-b border-slate-50 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                                    Clinical Suggestions
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {suggestions.map((s) => (
                                                        <button
                                                            key={s.code}
                                                            type="button"
                                                            onClick={() => {
                                                                const lines = (editData.diagnoses || '').split('\n');
                                                                lines[lines.length - 1] = `${s.code} - ${s.description}`;
                                                                handleFieldChange('diagnoses', lines.join('\n') + '\n');
                                                                setSuggestions([]);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 last:border-0 group flex items-center justify-between gap-4"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded shadow-tiny shrink-0">{s.code}</span>
                                                                <span className="text-[13px] font-bold text-slate-600 truncate group-hover:text-indigo-600 transition-colors">{s.description}</span>
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
                        <div className="bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] p-6 md:p-8">
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
                        <div className="bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] p-6 md:p-8">
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
                        <div className="bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] p-6 md:p-8">
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
                                    <div className="size-6 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 shadow-tiny">
                                        <Clock size={14} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">Clinical Audit Trail</p>
                                </div>
                                {timeline.length > 0 && !isEditing && (
                                    <Button variant="ghost" className="text-indigo-600 font-black text-[10px] uppercase tracking-wider hover:bg-indigo-50/50 px-3 h-8 rounded-full" onClick={() => navigate(`/notes?patientId=${patient.id}`)}>
                                        View Ledger &rarr;
                                    </Button>
                                )}
                            </div>

                            {timeline.length === 0 ? (
                                <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[40px] bg-slate-50/20">
                                    <Clock className="mx-auto size-14 text-slate-200 mb-6 drop-shadow-sm" />
                                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Historical interactions empty</p>
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

            <PatientNotePreview
                note={selectedNote}
                isOpen={!!selectedNote}
                onClose={() => setSelectedNote(null)}
                onViewFull={(id) => navigate(`/notes/print/${id}`)}
            />
        </div>
    );
}

// [ADVANCED PREMIUM UI SUB-COMPONENTS]

function PremiumTrigger({ value, label, icon: Icon, theme }: { value: string, label: string, icon: any, theme: string }) {
    const themeShadows: Record<string, string> = {
        indigo: "data-[state=active]:shadow-indigo-100/50 data-[state=active]:text-indigo-600 data-[state=active]:bg-indigo-50/50",
        emerald: "data-[state=active]:shadow-emerald-100/50 data-[state=active]:text-emerald-600 data-[state=active]:bg-emerald-50/50",
        purple: "data-[state=active]:shadow-purple-100/50 data-[state=active]:text-purple-600 data-[state=active]:bg-purple-50/50",
        blue: "data-[state=active]:shadow-blue-100/50 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50/50",
        slate: "data-[state=active]:shadow-slate-200/50 data-[state=active]:text-slate-700 data-[state=active]:bg-slate-50",
        amber: "data-[state=active]:shadow-amber-100/50 data-[state=active]:text-amber-600 data-[state=active]:bg-amber-50/50"
    };

    return (
        <TabsTrigger
            value={value}
            className={cn(
                "flex-1 rounded-full flex items-center justify-center gap-2 px-4 h-full text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-lg border border-transparent data-[state=active]:border-slate-100 group",
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
}

function PremiumGlassField({ icon: Icon, label, value, className, isTextarea, large, theme, isEditing, name, onChange }: FieldProps) {
    const iconBgThemes = {
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-100/50",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-100/50",
        purple: "bg-purple-500/10 text-purple-500 border-purple-100/50",
        blue: "bg-blue-500/10 text-blue-500 border-blue-100/50",
        amber: "bg-amber-500/10 text-amber-500 border-amber-100/50"
    };

    return (
        <div className={cn("space-y-1.5 group", className)}>
            <div className="flex items-center gap-3 ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
                <div className={cn("size-6 rounded-lg flex items-center justify-center relative", iconBgThemes[theme])}>
                    <div className="absolute inset-0 blur-md opacity-0 group-hover:opacity-60 transition-opacity bg-current" />
                    <Icon size={13} className="relative z-10" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-none opacity-90">{label}</p>
            </div>

            <div className={cn(
                "rounded-[28px] border border-slate-200/70 bg-white transition-all duration-300 relative overflow-hidden",
                "shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]",
                isEditing ? "hover:shadow-[0_12px_24px_-10px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-[2px] border-indigo-200 ring-2 ring-indigo-50" : "hover:border-primary/30",
                isTextarea ? (large ? "min-h-[170px]" : "min-h-[120px]") : "h-11",
                !value && !isEditing && "text-slate-300 italic font-medium"
            )}>

                {isEditing ? (
                    isTextarea ? (
                        <textarea
                            className="w-full h-full bg-transparent border-none outline-none p-4 text-[14px] font-bold text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed"
                            value={value || ''}
                            onChange={(e) => onChange?.(name!, e.target.value)}
                            placeholder={`Document ${label.toLowerCase()}...`}
                        />
                    ) : (
                        <input
                            type="text"
                            className="w-full h-full bg-transparent border-none outline-none px-5 text-[14px] font-bold text-slate-900 placeholder:text-slate-400 leading-none"
                            value={value || ''}
                            onChange={(e) => onChange?.(name!, e.target.value)}
                            placeholder={`Enter ${label.toLowerCase()}...`}
                        />
                    )
                ) : (
                    <div className="w-full h-full px-6 py-2 flex items-center">
                        <span className="relative z-10 text-[14px] leading-relaxed">{value || `No documented ${label.toLowerCase()}`}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function TimelineEntry({ item, isLast, navigate, onPreview, disabled }: { item: TimelineItem, isLast: boolean, navigate: any, onPreview: (note: any) => void, disabled?: boolean }) {
    const isNote = item.type === 'note';
    return (
        <div
            className={cn(
                "flex gap-8 group transition-opacity",
                disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
            )}
            onClick={() => !disabled && (isNote ? onPreview(item.raw) : navigate(`/calls/${item.id}`))}
        >
            <div className="flex flex-col items-center shrink-0 pt-1">
                <div className={cn("size-12 rounded-[22px] flex items-center justify-center text-white shadow-lg transition-all duration-500",
                    isNote ? 'bg-indigo-600 shadow-indigo-200' : 'bg-emerald-600 shadow-emerald-200',
                    !disabled && "group-hover:scale-110 group-hover:rotate-6"
                )}>
                    {isNote ? <FileText size={20} /> : <Phone size={20} />}
                </div>
                {!isLast && <div className="w-1 flex-1 bg-gradient-to-b from-slate-100 via-slate-50 to-transparent my-3 rounded-full opacity-60" />}
            </div>
            <div className={cn("flex-1 pb-12 transition-transform duration-300", !disabled && "group-hover:translate-x-1")}>
                <div className="flex items-center gap-4 mb-2.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] bg-slate-100/60 px-2.5 py-1 rounded-full border border-slate-200/30">
                        {format(new Date(item.timestamp), 'MMM d, yyyy • h:mm a')}
                    </span>
                    {item.status && <Badge className="text-[9px] font-black bg-emerald-50 text-emerald-600 border-none px-2.5 h-4.5 rounded-full">{item.status}</Badge>}
                </div>
                <div className="flex items-center justify-between">
                    <h4 className={cn(
                        "text-[17px] font-black text-slate-900 transition-colors duration-300 flex items-center gap-2",
                        !disabled && "group-hover:text-indigo-600"
                    )}>
                        {item.title}
                    </h4>
                    <div className={cn(
                        "size-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-300 transition-all duration-300",
                        !disabled && "group-hover:bg-indigo-50 group-hover:text-indigo-500 group-hover:scale-110"
                    )}>
                        <ChevronRight size={18} />
                    </div>
                </div>
                <p className="text-[14px] text-slate-500 font-medium mt-2 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity duration-300">{item.description}</p>
            </div>
        </div>
    );
}
