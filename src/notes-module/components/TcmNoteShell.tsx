import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ClioNote, Template } from '../types';
import { storage } from '../lib/storage';
import { DEFAULT_TEMPLATES, TCM_DOMAINS } from '../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { 
    Save, CheckCircle2, CheckCircle, X, PenTool, Plus, Trash2, Copy, Check, AlertCircle, 
    Calendar, Printer, Edit3, FileText, User, Activity, ClipboardList, MapPin, Clock, 
    Stethoscope, Briefcase, Info, ListTodo, History
} from 'lucide-react';
import { DatePicker } from '../../components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { TimeSpinner } from '../../components/ui/time-spinner';
import { Button } from '../../components/ui/button';
import SignatureModal from './SignatureModal';
import { useProviderTimeConflicts } from '../hooks/useProviderTimeConflicts';
import { TimeConflictBanner } from './TimeConflictBanner';
import { areOverlapping, extractNormalizedTimeRange } from '../lib/conflictUtils';
import { settingsService, type ClinicSettings } from '../../services/settingsService';

const getValueByPath = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const formatValueForPrint = (value: any): string | null => {
    if (value == null) return null;
    if (typeof value === "string") {
        const v = value.trim();
        if (!v || v === "not_reported") return null;
        return v;
    }
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "yes" : "no";

    if (Array.isArray(value)) {
        if (!value.length) return null;
        if (value.every(x => typeof x === "string" || typeof x === "number")) {
            return value.map(String).join("\n");
        }
    }
    return null;
};

const isValidLayout = (layout: any): layout is any[] => {
    if (!Array.isArray(layout)) return false;
    return layout.every(section =>
        typeof section === 'object' &&
        section !== null &&
        typeof section.title === 'string' &&
        Array.isArray(section.fields) &&
        section.fields.every((field: any) =>
            typeof field === 'object' &&
            field !== null &&
            typeof field.label === 'string' &&
            typeof field.path === 'string'
        )
    );
};

const setValueByPath = (obj: any, path: string, value: any) => {
    if (!path) return obj;
    const parts = path.split('.');
    const next = { ...obj };
    let current = next;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        const isNextPartArray = !isNaN(Number(nextPart));
        
        const currentVal = current[part];
        
        if (isNextPartArray) {
            current[part] = Array.isArray(currentVal) ? [...currentVal] : [];
        } else {
            current[part] = (currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal)) 
                ? { ...currentVal } 
                : {};
        }
        current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    return next;
};

const normalizeText = (text: any) => {
    if (typeof text !== 'string') return '';
    return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
};

const getMiamiTodayString = () => {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).format(new Date());
};

const PrintLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-medium uppercase tracking-wider text-[#1a1a1a] mb-1 print-border-b pb-0.5 mt-6 first:mt-0">
        {children}
    </div>
);

const SectionHeader = ({ title, onCopy, isCopied, icon: Icon }: { title: string, onCopy?: () => void, isCopied?: boolean, icon?: any }) => (
    <div className="flex items-center justify-between mb-1 mt-4 first:mt-1 group/section relative">
        <div className="label-small !mb-0">
            {Icon && <Icon size={12} className="text-indigo-400" />}
            {title}
        </div>
        {onCopy && (
            <button
                onClick={onCopy}
                className={`no-print ${isCopied ? 'opacity-100 bg-green-50 text-green-600 border-green-100' : 'opacity-0 group-hover/section:opacity-100 bg-blue-50 text-blue-600 border-blue-100'} p-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm border`}
                title={`Copy ${title}`}
            >
                {isCopied ? <Check size={11} /> : <Copy size={11} />}
                <span className="text-[9px] font-bold uppercase tracking-tight">{isCopied ? 'Copied' : 'Copy Section'}</span>
            </button>
        )}
    </div>
);

const DomainItem = ({ domain, mergedNote, isEditMode, handleUpdateField }: any) => {
    const val = getValueByPath(mergedNote, domain.path);
    const isChecked = val === true || val === "yes" || val === "X" || val === "x" || (typeof val === "string" && val.trim() !== "" && val !== "no" && val !== "false");

    return (
        <div
            onClick={() => isEditMode && handleUpdateField(domain.path, isChecked ? "" : "yes")}
            className={`flex items-center gap-2.5 py-1.5 px-2.5 transition-all group cursor-pointer border border-transparent ${isChecked ? 'bg-indigo-50/40 border-indigo-100/30 rounded-lg' : 'hover:bg-slate-50 rounded-lg'}`}
        >
            <div className={`size-4 flex items-center justify-center shrink-0 rounded-md border-2 transition-all ${isChecked ? 'bg-indigo-600 border-indigo-600 scale-105 shadow-sm shadow-indigo-100' : 'bg-white border-slate-200 group-hover:border-indigo-200'}`}>
                {isChecked && <Check size={10} className="text-white stroke-[4]" />}
            </div>
            <span className={`text-[10px] font-bold select-none transition-colors ${isChecked ? 'text-indigo-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                {domain.label}
            </span>
        </div>
    );
};

const convertTo24h = (time12h: string): string => {
    if (!time12h || typeof time12h !== 'string') return "";
    const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return time12h;
    let [_, hours, minutes, period] = match;
    let h = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && h < 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
};

const convertTo12h = (time24h: string): string => {
    if (!time24h) return "";
    const [hours, minutes] = time24h.split(':');
    let h = parseInt(hours, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${period}`;
};

const CustomPrintHeader = ({ note, clinicSettings, isEditMode, onUpdateField }: { note: ClioNote, clinicSettings?: ClinicSettings | null, isEditMode?: boolean, onUpdateField?: (path: string, val: any) => void }) => {
    const rawDate = note.encounter?.dos_date || (note as any).meta?.visitDate;
    const dateInputRef = useRef<HTMLInputElement>(null);

    const dos = (() => {
        if (!rawDate) return "N/A";
        try {
            let dateObj;
            if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Parse local explicitly to avoid UTC shift
                const [y, m, d] = rawDate.split('-');
                dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
            } else {
                dateObj = new Date(rawDate);
            }
            if (isNaN(dateObj.getTime())) return rawDate;
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return rawDate;
        }
    })();

    // Split clinic name for logo style if it contains "Mental Health" or similar
    const clinicName = clinicSettings?.clinicName || "";
    const nameParts = clinicName.split(' ');
    const firstPart = nameParts[0];
    const restParts = nameParts.slice(1).join(' ');

    return (
        <div className="flex justify-between items-start w-full mb-10 pb-8 border-b border-slate-100/50">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 no-print-flex">
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                        Progress Note
                    </div>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            {isEditMode ? "Encounter Date" : dos}
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-col mt-1">
                    <h1 className="text-[52px] font-black text-slate-900 tracking-tighter leading-[0.9] uppercase font-sans">
                        {note.patient?.full_name || "New Patient"}
                    </h1>
                    {isEditMode && (
                        <div className="mt-4 flex items-center gap-2 group/date-header no-print">
                            <Calendar size={14} className="text-indigo-400" />
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={rawDate || ''}
                                onChange={(e) => onUpdateField?.('encounter.dos_date', e.target.value)}
                                className="bg-slate-50 border border-slate-100 px-3 py-1 text-[11px] font-black text-indigo-900 uppercase rounded-lg hover:bg-white hover:border-indigo-200 transition-all outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-end gap-4">
                <div className="flex flex-col items-end text-right">
                    <div className="label-small !text-indigo-400 !mb-1 justify-end">Record Status</div>
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Authenticated</span>
                        <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
                            <Check size={14} className="text-white stroke-[4]" />
                        </div>
                    </div>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100 mr-4 hidden sm:block" />
                
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none mb-1">Clinician Note</div>
                    <div className="text-[11px] font-bold text-slate-500 italic">Electronic Signature Pending</div>
                </div>
            </div>
        </div>
    );
};

const CustomPrintFooter = ({ note }: { note: ClioNote }) => (
    <div className="print-only-footer hidden print:flex fixed bottom-2 left-[0.5in] right-[0.5in] justify-between items-center py-2 border-t-[0.5px] border-[#a3a3a3]">
        <div className="text-[9px] text-[#404040]">
            {note.patient?.full_name} ({(note as any).patient?.account_number || (note as any).patient?.emr || "—"})
        </div>
        <div className="text-[9px] text-[#404040]">
            Page <span className="page-number text-[9px]"></span>
        </div>
    </div>
);

const GhostInput = ({
    value,
    onChange,
    isEditMode,
    placeholder = "—",
    className = "",
    type = "text",
    onBlur
}: {
    value: any;
    onChange: (val: any) => void;
    isEditMode: boolean;
    placeholder?: string;
    className?: string;
    type?: string;
    onBlur?: () => void;
}) => {
    return (
        <div className={`relative flex items-center w-full ${isEditMode ? 'group/ghost' : ''}`}>
            {isEditMode ? (
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={`w-full transition-all duration-300 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 text-[13px] font-bold text-indigo-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none shadow-sm ${className}`}
                />
            ) : (
                <span className={`inline-block break-words ${className}`}>
                    {value || ''}
                </span>
            )}
        </div>
    );
};

const GhostTextarea = ({
    value,
    onChange,
    isEditMode,
    placeholder = "No content documented.",
    className = ""
}: {
    value: any;
    onChange: (val: any) => void;
    isEditMode: boolean;
    placeholder?: string;
    className?: string;
}) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const target = textareaRef.current;
        if (target) {
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
        }
    };

    React.useLayoutEffect(() => {
        if (isEditMode) {
            const timer = setTimeout(adjustHeight, 0);
            return () => clearTimeout(timer);
        }
    }, [isEditMode, value]);

    return (
        <div className={`relative w-full ${isEditMode ? 'group/ghost' : ''}`}>
            {isEditMode ? (
                <textarea
                    ref={textareaRef}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => {
                        adjustHeight();
                        e.target.select();
                    }}
                    placeholder={placeholder}
                    className={`w-full transition-all duration-300 resize-none overflow-hidden bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-3 text-[13px] font-medium text-slate-700 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none shadow-sm leading-relaxed ${className}`}
                    rows={1}
                    style={{ height: 'auto', minHeight: '80px' }}
                    onInput={adjustHeight}
                />
            ) : (
                <div className={`w-full text-[13px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap ${className}`}>
                    {value || <span className="text-slate-300 italic">{placeholder}</span>}
                </div>
            )}
        </div>
    );
};

const PrintValue = ({
    value,
    field,
    isEditMode,
    onChange,
    mergedNote
}: {
    value: any;
    field?: any;
    isEditMode: boolean;
    onChange: (val: any) => void;
    mergedNote: ClioNote;
}) => {
    const displayedValue = formatValueForPrint(value);
    const isComplex = Array.isArray(value) && value.length > 0 && typeof value[0] === 'object';
    const isArrayOfStrings = Array.isArray(value) && (value.length === 0 || typeof value[0] === 'string');
    const isEditable = !isComplex && field?.path && field.path !== '__static';
    const textContent = displayedValue || field?.defaultText;

    const [copyingField, setCopyingField] = useState<string | null>(null);

    const handleCopy = async (text: string, fieldId: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopyingField(fieldId);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopyingField(null), 2000);
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    if (isEditMode && isEditable) {
        const inputClasses = "w-full text-[13px] px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-white dark:bg-slate-900/50 font-normal leading-relaxed transition-all placeholder:text-slate-300 shadow-sm";

        if (field?.type === 'date') {
            return (
                <DatePicker 
                    date={value || ''} 
                    setDate={onChange} 
                    className="w-full text-[13px] h-[38px] border-slate-300 rounded-md shadow-sm"
                />
            );
        }
        if (field?.type === 'number') {
            return <input type="number" value={value || ''} onFocus={(e) => e.target.select()} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;
        }
        return (
            <textarea
                value={isArrayOfStrings ? (value as string[]).join('\n') : (displayedValue || field?.defaultText || '')}
                onChange={(e) => {
                    const val = e.target.value;
                    if (isArrayOfStrings) {
                        onChange(val.split('\n').filter((s: string) => s.trim() !== ''));
                    } else {
                        onChange(val);
                    }
                }}
                onFocus={(e) => e.target.select()}
                className={`${inputClasses} min-h-[60px] resize-y`}
                rows={isArrayOfStrings ? Math.max(3, (value as string[]).length) : (displayedValue && displayedValue.length > 60 ? 3 : 1)}
            />
        );
    }

    return (
        <div className="relative group/field container-copy">
            {!textContent ? (
                <p className="text-[11.5pt] text-slate-300 italic leading-relaxed">Not reported</p>
            ) : (
                <div className={`text-[11.5pt] ${displayedValue ? 'text-black font-medium' : 'text-slate-500 italic font-medium'} leading-relaxed whitespace-pre-wrap`}>
                    {displayedValue || "—"}
                </div>
            )}
            {textContent && (
                <button
                    onClick={() => handleCopy(textContent, field?.path || 'static')}
                    className="absolute top-0 right-0 z-10 p-1.5 rounded-bl-lg bg-blue-600 text-white shadow-md transition-all opacity-0 group-hover/field:opacity-100 no-print flex items-center gap-1 hover:bg-blue-700 active:scale-95"
                    title="Copy section text"
                >
                    {copyingField === (field?.path || 'static') ? <Check size={12} /> : <Copy size={12} />}
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Copy</span>
                </button>
            )}
        </div>
    );
};

interface TcmNoteShellProps {
    note: ClioNote;
    hideToolbar?: boolean;
    isStandalone?: boolean;
    onSaveComplete?: (saved: boolean) => void;
}

const TcmNoteShell: React.FC<TcmNoteShellProps> = ({
    note,
    hideToolbar = false,
    isStandalone = false,
    onSaveComplete
}) => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [noteOverrides, setNoteOverrides] = useState<any>({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

    const [cmSignatureImg, setCmSignatureImg] = useState<string | null>(null);
    const [supSignatureImg, setSupSignatureImg] = useState<string | null>(null);
    const [activeSigType, setActiveSigType] = useState<'cm' | 'sup' | null>(null);
    const [copyingSection, setCopyingSection] = useState<string | null>(null);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);

    // Signature Request States
    const [isRequestSignatureModalOpen, setIsRequestSignatureModalOpen] = useState(false);
    const [supervisorEmailInput, setSupervisorEmailInput] = useState('');
    const [isRequestingSignature, setIsRequestingSignature] = useState(false);

    // --- Add Joint Note Overlap Check State ---
    const [hasInternalTimeConflict, setHasInternalTimeConflict] = useState(false);
    const [focusedTimeKey, setFocusedTimeKey] = useState<string | null>(null);

    const handleRequestSignature = async () => {
        if (!supervisorEmailInput || !supervisorEmailInput.includes('@')) {
            toast.error("Please enter a valid supervisor email");
            return;
        }

        const targetId = lastSavedId || (mergedNote as any).id;

        if (!targetId) {
            toast.error("Please save the note before requesting a signature.");
            return;
        }

        setIsRequestingSignature(true);
        try {
            const token = crypto.randomUUID();

            const { data, error: dbError } = await supabase
                .from('notes')
                .update({
                    supervisor_email: supervisorEmailInput,
                    signature_token: token,
                    signature_status: 'pending'
                })
                .eq('id', targetId)
                .select();

            if (dbError) throw dbError;

            if (!data || data.length === 0) {
                toast.error("You must save this note before requesting a signature.");
                setIsRequestingSignature(false);
                return;
            }

            const protocol = window.location.protocol;
            const host = window.location.host;
            const signatureLink = `${protocol}//${host}/sign-note/${token}`;

            const response = await fetch('https://n8n.clinicflow.dev/webhook/signNotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supervisorEmail: supervisorEmailInput,
                    patientName: mergedNote.patient?.full_name || 'Patient',
                    signatureLink: signatureLink,
                    caseManagerName: (user as any)?.user_metadata?.full_name || user?.email || 'Case Manager'
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Webhook returned ${response.status}: ${errText}`);
            }

            toast.success("Signature request sent successfully");

            // Registrar log de auditoría
            try {
                const { auditService } = await import('../../services/auditService');
                await auditService.logAction({
                    action: 'UPDATE',
                    description: `Solicitó firma digital a ${supervisorEmailInput} para la nota clínica del paciente ${mergedNote.patient?.full_name || 'Paciente'}`,
                    targetType: 'note',
                    targetId: targetId
                });
            } catch (auditErr) {
                console.error('Error writing audit log for requestSignature:', auditErr);
            }

            setIsRequestSignatureModalOpen(false);
            setSupervisorEmailInput('');

        } catch (err: any) {
            console.error("Signature request error:", err);
            toast.error(err.message || "Failed to request signature. Please try again.");
        } finally {
            setIsRequestingSignature(false);
        }
    };

    const handleSaveSignature = (dataUrl: string) => {
        const today = getMiamiTodayString();
        if (activeSigType === 'cm') {
            setCmSignatureImg(dataUrl);
            handleUpdateField('signatures.cm_signature_path', dataUrl);
            handleUpdateField('signatures.cm_signed_date', today);
        } else if (activeSigType === 'sup') {
            setSupSignatureImg(dataUrl);
            handleUpdateField('signatures.sup_signature_path', dataUrl);
            handleUpdateField('signatures.sup_signed_date', today);
        }
        setActiveSigType(null);
    };

    const handleSignatureClick = (type: 'cm' | 'sup') => {
        const today = getMiamiTodayString();
        if (type === 'cm' && (user as any)?.signature_url) {
            setCmSignatureImg((user as any).signature_url);
            handleUpdateField('signatures.cm_signature_path', (user as any).signature_url);
            handleUpdateField('signatures.cm_signed_date', today);
            toast.success("Signed automatically with your saved signature");
        } else if (type === 'sup' && clinicSettings?.supervisorSignatureUrl) {
            setSupSignatureImg(clinicSettings.supervisorSignatureUrl);
            handleUpdateField('signatures.sup_signature_path', clinicSettings.supervisorSignatureUrl);
            handleUpdateField('signatures.sup_signed_date', today);
            toast.success("Supervisor signed automatically");
        } else {
            setActiveSigType(type);
        }
    };

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const fetched = await storage.getTemplates();
                setTemplates(fetched);
            } catch (err) {
                console.error("TcmNoteShell: Failed to load templates:", err);
            } finally {
                setIsLoadingTemplates(false);
            }
        };

        const loadClinicSettings = async () => {
            if (user?.clinic_id) {
                try {
                    const settings = await settingsService.fetchSettings(user.clinic_id);
                    setClinicSettings(settings);
                } catch (err) {
                    console.error("TcmNoteShell: Failed to load clinic settings:", err);
                }
            }
        };

        loadTemplates();
        loadClinicSettings();
    }, [user?.clinic_id]);

    const mergedNote = useMemo(() => {
        let result = { ...note };
        Object.keys(noteOverrides).forEach(path => {
            result = setValueByPath(result, path, noteOverrides[path]);
        });
        return result;
    }, [note, noteOverrides]);

    const { conflicts, confidence, isLoading: isConflictLoading } = useProviderTimeConflicts(mergedNote);

    useEffect(() => {
        if (!mergedNote.joint_services || mergedNote.joint_services.length < 2) {
            const singleSvc = mergedNote.joint_services && mergedNote.joint_services.length === 1 
                ? mergedNote.joint_services[0] 
                : mergedNote;
            const range = extractNormalizedTimeRange(singleSvc);
            if (range.startAtISO && range.endAtISO && range.endAtISO < range.startAtISO) {
                setHasInternalTimeConflict(true);
            } else {
                setHasInternalTimeConflict(false);
            }
            return;
        }

        let overlap = false;
        const services = mergedNote.joint_services;

        for (let i = 0; i < services.length; i++) {
            const svcI = { ...services[i] };
            if (!svcI.encounter?.dos_date) {
                if (!svcI.encounter) svcI.encounter = { mode: 'in-person' } as any;
                svcI.encounter.dos_date = mergedNote.encounter?.dos_date || (mergedNote as any).meta?.visitDate;
            }

            const rangeA = extractNormalizedTimeRange(svcI);

            // Self-validation (inverted time)
            if (rangeA.startAtISO && rangeA.endAtISO && rangeA.endAtISO < rangeA.startAtISO) {
                overlap = true;
                break;
            }

            // Cross-validation
            for (let j = i + 1; j < services.length; j++) {
                const svcJ = { ...services[j] };
                if (!svcJ.encounter?.dos_date) {
                    if (!svcJ.encounter) svcJ.encounter = { mode: 'in-person' } as any;
                    svcJ.encounter.dos_date = mergedNote.encounter?.dos_date || (mergedNote as any).meta?.visitDate;
                }
                const rangeB = extractNormalizedTimeRange(svcJ);

                if (rangeA.startAtISO && rangeA.endAtISO && rangeB.startAtISO && rangeB.endAtISO) {
                    if (areOverlapping(rangeA.startAtISO, rangeA.endAtISO, rangeB.startAtISO, rangeB.endAtISO)) {
                        overlap = true;
                        break;
                    }
                }
            }
            if (overlap) break;
        }
        setHasInternalTimeConflict(overlap);
    }, [mergedNote]);

    const handleUpdateField = (path: string, newValue: any) => {
        setNoteOverrides((prev: any) => {
            const next = { ...prev, [path]: newValue };
            
            // Auto-calculate duration and units when time range changes
            const match = path.match(/^(?:(.*?\.)|)encounter\.(time_in|time_out)$/);
            if (match) {
                const prefix = match[1] || '';
                
                const timeInPath = `${prefix}encounter.time_in`;
                const timeOutPath = `${prefix}encounter.time_out`;
                
                const getTime = (p: string) => next.hasOwnProperty(p) ? next[p] : getValueByPath(note, p);
                
                const timeIn = getTime(timeInPath);
                const timeOut = getTime(timeOutPath);

                const parseTime = (timeStr: string) => {
                    if (!timeStr) return null;
                    let parts = timeStr.trim().split(/\s+/);
                    if (parts.length < 2) return null;
                    let time = parts[0];
                    let period = parts[1];
                    let [hh, mm] = time.split(':');
                    if (!hh || !mm) return null;
                    
                    let hours = parseInt(hh, 10);
                    let minutes = parseInt(mm, 10);
                    
                    if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    
                    return hours * 60 + minutes;
                };

                const startMins = parseTime(timeIn);
                const endMins = parseTime(timeOut);
                
                if (startMins !== null && endMins !== null) {
                    let duration = endMins - startMins;
                    if (duration < 0) duration += 24 * 60;
                    
                    const units = Math.ceil(duration / 15);
                    
                    next[`${prefix}encounter.duration`] = duration.toString();
                    next[`${prefix}encounter.billing_units`] = units.toString();
                }
            }
            
            return next;
        });
        setIsSaved(false);
        if (onSaveComplete) onSaveComplete(false);
    };

    const handleTimeChange = (val: string, path: string, currentFullValue: string) => {
        let clean = val.replace(/[^\d:]/g, '');
        let parts = clean.split(':');
        let hr = parts[0] || '';
        let min = parts.length > 1 ? parts.slice(1).join('') : undefined;

        if (hr.length > 2) {
            min = hr.slice(2) + (min || '');
            hr = hr.slice(0, 2);
        }
        
        const hrNum = parseInt(hr, 10);
        if (hrNum > 12) hr = '12';
        if (hr === '00') hr = '12';
        
        if (min !== undefined) {
            min = min.replace(/[^\d]/g, '');
            if (min.length > 2) min = min.slice(0, 2);
            const minNum = parseInt(min, 10);
            if (minNum > 59) min = '59';
            clean = `${hr}:${min}`;
        } else {
            clean = hr + (val.endsWith(':') ? ':' : '');
        }

        const period = (currentFullValue || "").toUpperCase().includes('PM') ? 'PM' : 'AM';
        const formattedTime = clean ? `${clean} ${period}` : ` ${period}`;
        
        handleUpdateField(path, formattedTime);
    };

    const handleTimeBlur = (path: string, currentFullValue: string) => {
        let clean = (currentFullValue || "").replace(/AM|PM/gi, '').trim();
        if (clean) {
            let [h, m] = clean.split(':');
            h = h || '12';
            m = m || '00';
            if (h.length === 1) h = `0${h}`;
            if (m.length === 1) m = `${m}0`;
            const period = (currentFullValue || "").toUpperCase().includes('PM') ? 'PM' : 'AM';
            handleUpdateField(path, `${h}:${m} ${period}`);
        }
    };

    const handleCopy = async (text: string, label: string, sectionKey?: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`Copied ${label} to clipboard`);
            if (sectionKey) {
                setCopyingSection(sectionKey);
                setTimeout(() => setCopyingSection(null), 2000);
            }
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    const handleCopySection = (title: string, fields: { label: string, value: any }[]) => {
        let text = `[${title.toUpperCase()}]\n`;
        fields.forEach(f => {
            const val = formatValueForPrint(f.value);
            if (val && val !== "Not reported") {
                text += `${f.label}: ${val}\n`;
            }
        });
        navigator.clipboard.writeText(text.trim());
        toast.success(`Copied ${title} to clipboard`);
    };

    const handleSaveNote = async () => {
        if (!user) return;
        
        if (hasInternalTimeConflict || (conflicts && conflicts.length > 0)) {
            toast.error("Cannot save note with overlapping times. Please resolve time conflicts first.");
            return;
        }

        setIsSaving(true);
        try {
            const savedNoteResult = await storage.saveAnalyzedNote(mergedNote);
            if (savedNoteResult && savedNoteResult.id) {
                setLastSavedId(savedNoteResult.id);
            }
            setIsSaved(true);
            if (onSaveComplete) onSaveComplete(true);
            toast.success("Saved to Clinical History");
        } catch (err) {
            toast.error("Failed to save note");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => window.print();

    // Calc helpers
    const rawDuration = mergedNote.encounter?.duration_minutes || mergedNote.encounter?.duration;
    const durationValue = rawDuration ? `${rawDuration} min` : "—";
    const unitsValue = mergedNote.encounter?.units || (rawDuration ? Math.ceil(parseInt(String(rawDuration)) / 15).toString() : "—");

    const posValue = (() => {
        const code = (mergedNote.encounter?.pos || "").trim();
        return code || "—";
    })();

    const timeRangeValue = (() => {
        const start = mergedNote.encounter?.time_in || (mergedNote as any).appointment?.start_time || (mergedNote.encounter as any)?.start_time;
        const end = mergedNote.encounter?.time_out || (mergedNote as any).appointment?.end_time || (mergedNote.encounter as any)?.end_time;

        if (start && end) return `${start} — ${end}`;
        if (start || end) return start || end;
        return "—";
    })();

    return (
        <div className={`tcm-print-shell ${!isStandalone ? 'max-w-[1050px] mx-auto' : ''}`} style={{ minHeight: '100%' }}>
            <div className="no-print">
                <TimeConflictBanner conflicts={conflicts} confidence={confidence} isLoading={isConflictLoading} />
            </div>

            {/* FLOATING TOOLBAR - PREMIUM STYLE */}
            {!hideToolbar && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] no-print">
                    <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-slate-900/5">
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${
                                isEditMode 
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {isEditMode ? <Check size={16} /> : <Edit3 size={16} />}
                            {isEditMode ? 'Done' : 'Edit Note'}
                        </button>

                        <div className="w-[1px] h-8 bg-slate-200/50 mx-1" />

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all duration-300 group"
                        >
                            <Printer size={16} className="group-hover:scale-110 transition-transform" />
                            Print
                        </button>

                        <button
                            onClick={handleSaveNote}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${
                                isSaved 
                                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:-translate-y-0.5'
                            } disabled:opacity-50`}
                        >
                            {isSaving ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : isSaved ? (
                                <CheckCircle size={16} />
                            ) : (
                                <Save size={16} />
                            )}
                            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save Record'}
                        </button>

                        <div className="w-[1px] h-8 bg-slate-200/50 mx-1" />

                        <button
                            onClick={() => setIsRequestSignatureModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all duration-300"
                        >
                            <PenTool size={16} />
                            Sign
                        </button>
                    </div>
                </div>
            )}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap');

                .document-canvas-wrapper { 
                    background: #f8fafc;
                    padding: 4rem 2rem; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    min-height: 100vh;
                }

                /* CUSTOM SCROLLBAR */
                .document-canvas-wrapper::-webkit-scrollbar { width: 6px; }
                .document-canvas-wrapper::-webkit-scrollbar-track { background: transparent; }
                .document-canvas-wrapper::-webkit-scrollbar-thumb { 
                    background: #e2e8f0; 
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .document-canvas-wrapper::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

                .document-page { 
                    background-color: white; 
                    width: 100%; 
                    max-width: 950px; 
                    min-height: 11in; 
                    padding: 0.4in 0.5in; 
                    box-shadow: 0 50px 100px -20px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1);
                    border: none; 
                    border-radius: 48px;
                    position: relative; 
                    margin-bottom: 4rem; 
                    /* PREMIUM TYPOGRAPHY */
                    font-family: 'Inter', sans-serif !important;
                    color: #1e293b;
                    line-height: 1.6;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .document-page h1, .document-page h2, .document-page h3, .label-small {
                    font-family: 'Outfit', sans-serif !important;
                }

                /* DASHBOARD STYLE LABELS */
                .label-small {
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .value-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: #0f172a;
                    line-height: 1.5;
                }

                /* GRADIENT DIVIDER */
                .gradient-divider {
                    height: 1px;
                    width: 100%;
                    background: linear-gradient(to right, transparent, #f1f5f9 10%, #f1f5f9 90%, transparent);
                    margin: 0.75rem 0;
                }

                @media print {
                    .document-canvas-wrapper { 
                        padding: 0 !important; 
                        background: white !important; 
                    }
                    .document-page {
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0.5in !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        color: black !important;
                    }
                    .no-print { display: none !important; }
                    .gradient-divider { background: #e2e8f0 !important; }
                }
            `}</style>

            <div className="document-canvas-wrapper no-print-bg">
                <div id="note-print-root" className="document-page">
                    <CustomPrintHeader 
                        note={mergedNote} 
                        clinicSettings={clinicSettings} 
                        isEditMode={isEditMode}
                        onUpdateField={handleUpdateField}
                    />

                    <div className="space-y-6">
                        {/* Patient & Facility Grid - TIGHTER & ALIGNED */}
                        <div className="grid grid-cols-2 gap-x-8 mb-2 items-start">
                            {/* Left: Patient Info */}
                            <div className="space-y-[1px] group/patient relative">
                                <div className="absolute -top-6 right-0 no-print opacity-0 group-hover/patient:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(`Patient: ${mergedNote.patient?.full_name}\nDOB: ${mergedNote.patient?.dob ? new Date(mergedNote.patient.dob).toLocaleDateString() : '—'}\nCase No: ${mergedNote.patient?.account_number || mergedNote.patient?.case_no || '—'}\nSex: ${mergedNote.patient?.sex_at_birth || '—'}`, "Patient Info", "patient")}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copyingSection === 'patient' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} border text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white`}
                                    >
                                        {copyingSection === 'patient' ? <Check size={12} /> : <Copy size={12} />}
                                        {copyingSection === 'patient' ? 'Copied' : 'Copy Patient'}
                                    </button>
                                </div>
                                <div className="label-small text-slate-400 mb-1">
                                    <User size={11} className="text-indigo-400" />
                                    CLIENT IDENTITY
                                </div>
                                <div className="text-[22px] font-black text-slate-900 mb-1.5 leading-tight flex items-center gap-2">
                                    <GhostInput
                                        value={mergedNote.patient?.full_name}
                                        isEditMode={isEditMode}
                                        onChange={(val) => handleUpdateField('patient.full_name', val)}
                                        placeholder="Patient Name"
                                        className="!px-0 !bg-transparent !border-0 !shadow-none"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-x-2">
                                        <span className="label-small !mb-0 w-16 !text-slate-400/80 !text-[9px]">Case No:</span>
                                        <div className="value-text flex-1">
                                            <GhostInput
                                                value={mergedNote.patient?.account_number || mergedNote.patient?.case_no}
                                                isEditMode={isEditMode}
                                                onChange={(val) => handleUpdateField('patient.account_number', val)}
                                                placeholder="—"
                                                className="!px-2 !py-0.5 !text-[12px] !h-6"
                                            />
                                        </div>
                                    </div>
 
                                    <div className="flex items-center gap-x-2">
                                        <span className="label-small !mb-0 w-16 !text-slate-400/80 !text-[9px]">Sex:</span>
                                        <div className="value-text flex-1">
                                            <GhostInput
                                                value={mergedNote.patient?.sex_at_birth}
                                                isEditMode={isEditMode}
                                                onChange={(val) => handleUpdateField('patient.sex_at_birth', val)}
                                                placeholder="—"
                                                className="!px-2 !py-0.5 !text-[12px] !h-6"
                                            />
                                        </div>
                                    </div>
 
                                    <div className="flex items-center gap-x-2">
                                        <span className="label-small !mb-0 w-16 !text-slate-400/80 !text-[9px]">Mobile:</span>
                                        <div className="value-text flex-1">
                                            <GhostInput
                                                value={mergedNote.patient?.phone || mergedNote.patient?.mobile}
                                                isEditMode={isEditMode}
                                                onChange={(val) => handleUpdateField('patient.phone', val)}
                                                placeholder="—"
                                                className="!px-2 !py-0.5 !text-[12px] !h-6"
                                            />
                                        </div>
                                    </div>
 
                                    <div className="flex items-center gap-x-2">
                                        <span className="label-small !mb-0 w-16 !text-slate-400/80 !text-[9px]">DOB:</span>
                                        <div className="value-text flex-1 flex items-center gap-1">
                                            {isEditMode ? (
                                                <GhostInput
                                                    type="date"
                                                    value={mergedNote.patient?.dob ? new Date(mergedNote.patient.dob).toISOString().split('T')[0] : ''}
                                                    onChange={(val) => handleUpdateField('patient.dob', val)}
                                                    isEditMode={true}
                                                    className="!px-2 !py-0.5 !text-[12px] !h-6"
                                                />
                                            ) : (
                                                <>
                                                    <span className="font-bold text-[12px]">{mergedNote.patient?.dob ? new Date(mergedNote.patient.dob).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : "—"}</span>
                                                    <span className="text-slate-400 font-black text-[9px] ml-1">({mergedNote.patient?.dob ? Math.floor((new Date().getTime() - new Date(mergedNote.patient.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "--"}Y)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Facility Info */}
                            <div className="flex flex-col items-end text-right group/facility relative">
                                <div className="label-small text-slate-400 mb-4 justify-end">
                                    FACILITY INFO
                                    <MapPin size={12} className="text-indigo-400" />
                                </div>
                                <div className="text-[14px] font-black text-slate-900 mb-1 leading-none uppercase tracking-tight">
                                    {clinicSettings?.clinicName || "Independent Practice"}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-end gap-x-1.5">
                                        <div className="value-text !text-[11px] !text-slate-500 font-bold uppercase tracking-wide">
                                            Fax: {clinicSettings?.fax || "—"}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1.5">
                                        <div className="value-text !text-[11px] !text-slate-500 font-bold uppercase tracking-wide">
                                            Phone: {clinicSettings?.phone || "—"}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-x-1.5">
                                        <div className="value-text !text-[10px] !text-slate-400 font-medium italic">
                                            {clinicSettings?.email || "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="gradient-divider" />

                        {/* Time Conflict Validation Banner */}
                        {hasInternalTimeConflict && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 mb-6 no-print animate-in fade-in duration-300">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                                <div>
                                    <h4 className="font-bold text-sm tracking-tight mb-0.5">Time Conflict / Overlap Detected</h4>
                                    <p className="text-xs font-medium opacity-90">
                                        Multiple services occur at the same time or have invalid times (e.g., end time before start time). Please adjust the Time Range fields below to correct this before saving.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Title Sections & Summaries - Dynamic Mapping for Joint Notes */}
                        {(() => {
                            const isJoint = !!(mergedNote.joint_services && mergedNote.joint_services.length > 0);
                            const servicesToRender = (isJoint ? mergedNote.joint_services : [mergedNote]) || [];

                            return servicesToRender.map((svc: any, svcIndex: number) => {
                                const svcSummary = svc.narrative?.summary_notes;
                                const pathPrefix = isJoint ? `joint_services.${svcIndex}.` : "";

                                return (
                                    <div key={svcIndex} className="pb-4">
                                        {(() => {
                                            const svcTimeStart = svc.encounter?.time_in || svc.appointment?.start_time || svc.encounter?.start_time;
                                            const svcTimeEnd = svc.encounter?.time_out || svc.appointment?.end_time || svc.encounter?.end_time;
                                            const svcTimeRange = svcTimeStart && svcTimeEnd ? `${svcTimeStart} - ${svcTimeEnd}` : (svcTimeStart || svcTimeEnd || "—");

                                            return (
                                                <>
                                                    <section className="print-section">
                                                        <SectionHeader title="VISIT DETAILS" icon={Stethoscope} />
                                                        <div className="grid grid-cols-4 gap-4">
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">POS</span>
                                                                <div className="value-text text-[12px]">
                                                                    <GhostInput
                                                                        value={svc.encounter?.location_name || (svc.encounter as any)?.place_of_service_name || "12 - Home"}
                                                                        isEditMode={isEditMode}
                                                                        onChange={(val) => handleUpdateField(`${pathPrefix}encounter.location_name`, val)}
                                                                        className="text-center"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Time Range</span>
                                                                <div className="value-text whitespace-nowrap text-[12px] flex items-center justify-center">
                                                                    {isEditMode ? (
                                                                        <div className="flex items-center gap-1 no-print">
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <button className="text-center px-2 py-1 text-[11px] font-bold w-[85px] bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-colors text-indigo-900">
                                                                                        {svcTimeStart || "Start"}
                                                                                    </button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-xl bg-white/95 backdrop-blur-md" side="bottom" align="center">
                                                                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-center">
                                                                                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Encounter Start</span>
                                                                                    </div>
                                                                                    <div className="p-4">
                                                                                        <TimeSpinner 
                                                                                            initialTimeStr={svcTimeStart}
                                                                                            onConfirm={(val) => {
                                                                                                handleTimeChange(val, `${pathPrefix}encounter.time_in`, svcTimeStart);
                                                                                                handleTimeBlur(`${pathPrefix}encounter.time_in`, val);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>

                                                                            <span className="text-slate-400 font-bold">-</span>

                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <button className="text-center px-2 py-1 text-[11px] font-bold w-[85px] bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-colors text-indigo-900">
                                                                                        {svcTimeEnd || "End"}
                                                                                    </button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-xl bg-white/95 backdrop-blur-md" side="bottom" align="center">
                                                                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-center">
                                                                                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Encounter End</span>
                                                                                    </div>
                                                                                    <div className="p-4">
                                                                                        <TimeSpinner 
                                                                                            initialTimeStr={svcTimeEnd}
                                                                                            onConfirm={(val) => {
                                                                                                handleTimeChange(val, `${pathPrefix}encounter.time_out`, svcTimeEnd);
                                                                                                handleTimeBlur(`${pathPrefix}encounter.time_out`, val);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-bold">{svcTimeRange}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Duration</span>
                                                                <div className="value-text text-[12px] flex items-center justify-center gap-1">
                                                                    <GhostInput
                                                                        value={svc.encounter?.duration}
                                                                        isEditMode={isEditMode}
                                                                        onChange={(val) => handleUpdateField(`${pathPrefix}encounter.duration`, val)}
                                                                        className="text-center !px-2 !py-0.5 !h-6 !text-[12px] w-12"
                                                                        placeholder="min"
                                                                    />
                                                                    {!isEditMode && <span className="text-[10px] text-slate-400 font-bold">min</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 items-center text-center">
                                                                <span className="label-small !mb-0 text-[9px]">Units</span>
                                                                <div className="value-text">
                                                                    {isEditMode ? (
                                                                        <GhostInput
                                                                            value={svc.encounter?.billing_units}
                                                                            isEditMode={true}
                                                                            onChange={(val) => handleUpdateField(`${pathPrefix}encounter.billing_units`, val)}
                                                                            className="text-center !px-2 !py-0.5 !h-6 !text-[11px] w-12"
                                                                            placeholder="0"
                                                                        />
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black border border-indigo-100">
                                                                            {svc.encounter?.billing_units || 0}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="col-span-4 mt-3 pt-3 border-t border-slate-100/60">
                                                                <div className="value-text !text-[16px] font-black text-indigo-950 tracking-tight leading-tight">
                                                                    <GhostInput
                                                                        value={svc.services?.service_focus_title || svc.encounter?.sub_template || (mergedNote as any).meta?.subTemplate || "TCM Progress Note"}
                                                                        isEditMode={isEditMode}
                                                                        onChange={(val) => handleUpdateField(`${pathPrefix}${svc.services?.service_focus_title ? 'services.service_focus_title' : 'encounter.sub_template'}`, val)}
                                                                        placeholder="Enter encounter subject..."
                                                                        className="!px-0 !bg-transparent !border-0 !shadow-none !text-[16px] !font-black !text-indigo-950"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </section>

                                                    <section className="print-section mt-4">
                                                        <SectionHeader title="INFORMATION & DOMAINS" icon={ListTodo} />
                                                        <div className="mt-0.5 px-0.5">
                                                            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                                                                {TCM_DOMAINS.map((domain) => (
                                                                    <DomainItem
                                                                        key={domain.path}
                                                                        domain={domain}
                                                                        mergedNote={svc}
                                                                        isEditMode={isEditMode}
                                                                        handleUpdateField={(path, val) => handleUpdateField(`${pathPrefix}${path}`, val)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </section>

                                                    <section className="print-section group/section relative pb-2 mt-4">
                                                        <SectionHeader
                                                            title="CLINICAL NARRATIVE"
                                                            icon={ClipboardList}
                                                            onCopy={() => handleCopy(svcSummary || "", "Summary", `summary_${svcIndex}`)}
                                                            isCopied={copyingSection === `summary_${svcIndex}`}
                                                        />
                                                        <div className="mt-1 bg-slate-50/50 border border-slate-200/80 rounded-2xl p-3 relative group/narrative">
                                                            <GhostTextarea
                                                                value={svcSummary}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField(`${pathPrefix}narrative.summary_notes`, val)}
                                                                placeholder="Enter clinical summary..."
                                                                className="value-text !text-[13px] !font-medium leading-relaxed"
                                                            />
                                                        </div>
                                                    </section>
                                                </>
                                            );
                                        })()}
                                    </div>
                                );
                            });
                        })()}

                        {/* Outcome & Plan - Only show if unique or in edit mode */}
                        {(() => {
                            const normalizedSummary = normalizeText(mergedNote.narrative?.summary_notes);
                            const normalizedOutcome = normalizeText(mergedNote.narrative?.outcome_of_services);
                            const normalizedPlan = normalizeText(mergedNote.narrative?.next_steps);

                            const showOutcome = isEditMode || (normalizedOutcome === "" || normalizedOutcome !== normalizedSummary);
                            const showPlan = isEditMode || (normalizedPlan === "" || normalizedPlan !== normalizedSummary);

                            if (!showOutcome && !showPlan) return null;

                            return (
                                <section className="print-section mb-0">
                                    <div className="grid grid-cols-2 gap-2 items-start">
                                        {showOutcome && (
                                            <div className="group/section relative">
                                                <SectionHeader
                                                    title="Outcome"
                                                    icon={Activity}
                                                    onCopy={() => handleCopy(mergedNote.narrative?.outcome_of_services || "", "Outcome", "outcome")}
                                                    isCopied={copyingSection === 'outcome'}
                                                />
                                                <div className="mt-1 p-3 bg-slate-50/30 rounded-xl border border-slate-100/50">
                                                    <GhostTextarea
                                                        value={mergedNote.narrative?.outcome_of_services}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('narrative.outcome_of_services', val)}
                                                        placeholder="Enter outcome..."
                                                        className="value-text !text-[12px] leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {showPlan && (
                                            <div className="group/section relative">
                                                <SectionHeader
                                                    title="Follow-up Plan"
                                                    icon={Calendar}
                                                    onCopy={() => handleCopy(mergedNote.narrative?.next_steps || "", "Plan", "plan")}
                                                    isCopied={copyingSection === 'plan'}
                                                />
                                                <div className="mt-1 p-3 bg-slate-50/30 rounded-xl border border-slate-100/50">
                                                    <GhostTextarea
                                                        value={mergedNote.narrative?.next_steps}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('narrative.next_steps', val)}
                                                        placeholder="Enter next steps..."
                                                        className="value-text !text-[12px] leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            );
                        })()}

                        <section className="print-section mt-2 mb-1 group/diagnoses relative">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-0.5">
                                <h2 className="text-[9px] font-black text-slate-900 tracking-[0.25em] uppercase leading-none">Diagnoses</h2>
                            </div>
                            <div className="mt-1 p-2 bg-slate-50/30 rounded-xl border border-slate-100/50">
                                {Array.isArray(mergedNote.diagnoses) && mergedNote.diagnoses.length > 0 ? (
                                    <div className="space-y-1 w-full">
                                        {(mergedNote.diagnoses as any[]).map((diag: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 py-1 px-2 hover:bg-white rounded-lg transition-all group/diag border border-transparent">
                                                {(isEditMode || diag.icd10) && (
                                                    <div className="text-[11px] font-black min-w-[50px] tracking-widest text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded text-center shrink-0">
                                                        <GhostInput
                                                            value={diag.icd10}
                                                            isEditMode={isEditMode}
                                                            onChange={(val) => {
                                                                const next = [...(mergedNote.diagnoses as any[])];
                                                                next[idx] = { ...next[idx], icd10: val };
                                                                handleUpdateField('diagnoses', next);
                                                            }}
                                                            placeholder="CODE"
                                                            className="text-center"
                                                        />
                                                    </div>
                                                )}
                                                <div className="value-text flex-1 !font-bold text-slate-700 text-[12px]">
                                                    <GhostInput
                                                        value={diag.name}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => {
                                                            const next = [...(mergedNote.diagnoses as any[])];
                                                            next[idx] = { ...next[idx], name: val };
                                                            handleUpdateField('diagnoses', next);
                                                        }}
                                                        placeholder="Diagnosis name..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-400 text-center py-2">No diagnoses documented</p>
                                )}
                            </div>
                        </section>

                        {/* Signatures */}
                        <div className="mt-6 pt-4 border-t border-slate-100" style={{ breakInside: 'avoid' }}>
                            <div className="flex items-start gap-4 mb-2">
                                    <History size={14} className="text-indigo-400 mt-1 shrink-0" />
                                    <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed max-w-[550px] opacity-80">
                                        I certify that I provided the above services following all clinical policies, procedures, and ethical guidelines.
                                        This document is the result of an authenticated electronic health record process.
                                    </p>
                            </div>

                            <div className="grid grid-cols-2 gap-16 mt-6">
                                {/* Case Manager */}
                                <div className="space-y-1">
                                    <div
                                        onClick={() => handleSignatureClick('cm')}
                                        className="min-h-[44px] flex items-center justify-center pb-1 cursor-pointer group/sig relative"
                                    >
                                        {(mergedNote.signatures?.cm_signature_path || cmSignatureImg) ? (
                                            <img
                                                src={mergedNote.signatures?.cm_signature_path || cmSignatureImg}
                                                alt="Case Manager Signature"
                                                className="max-h-[44px] object-contain"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 opacity-30 group-hover/sig:opacity-70 transition-opacity">
                                                <PenTool className="w-2.5 h-2.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Signature Required</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-b border-slate-200"></div>
                                    <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-0.5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight leading-none mb-0.5">
                                                {mergedNote.signatures?.cm_name ||
                                                    (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.name) ||
                                                    "Clinician"}
                                            </span>
                                            {(user as any)?.npi && (
                                                <span className="text-[8px] font-medium text-slate-500 leading-none mb-1">
                                                    {(user as any).npi}
                                                </span>
                                            )}
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Physician Signature</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] font-bold text-slate-900 leading-none mb-1">
                                                {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Date of Signature</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Supervisor */}
                                <div className={`space-y-1 ${((mergedNote as any).signature_status === 'signed' || mergedNote.signatures?.sup_signature_path || supSignatureImg) ? 'opacity-100' : 'opacity-40'}`}>
                                    <div
                                        className="min-h-[44px] flex items-center justify-center pb-1 relative cursor-default"
                                    >
                                        {((mergedNote as any).signature_status === 'signed' && (mergedNote as any).signature_data) ? (
                                            <img
                                                src={(mergedNote as any).signature_data}
                                                alt="Supervisor Signature"
                                                className="max-h-[44px] object-contain"
                                            />
                                        ) : (mergedNote.signatures?.sup_signature_path || supSignatureImg) ? (
                                            <img
                                                src={mergedNote.signatures?.sup_signature_path || supSignatureImg}
                                                alt="Supervisor Signature"
                                                className="max-h-[44px] object-contain"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <PenTool className="w-2.5 h-2.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Signature Required</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-b border-slate-200"></div>
                                    <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-0.5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight leading-none mb-0.5">
                                                {mergedNote.signatures?.sup_name || clinicSettings?.supervisorName || "Supervisor"}
                                            </span>
                                            {clinicSettings?.supervisorNpi && (
                                                <span className="text-[8px] font-medium text-slate-500 leading-none mb-1">
                                                    {clinicSettings.supervisorNpi}
                                                </span>
                                            )}
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Supervisor Signature</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] font-bold text-slate-900 leading-none mb-1">
                                                {((mergedNote as any).signature_status === 'signed' && (mergedNote as any).signed_at)
                                                    ? new Date((mergedNote as any).signed_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                                    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Date of Signature</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <CustomPrintFooter note={mergedNote} />
            <SignatureModal
                isOpen={activeSigType !== null}
                onClose={() => setActiveSigType(null)}
                onSave={handleSaveSignature}
                title={activeSigType === 'cm' ? "Physician Signature" : "Supervisor Signature"}
            />
            {isRequestSignatureModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 tracking-tight">Request Supervisor Signature</h3>
                            <button onClick={() => setIsRequestSignatureModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                Enter the supervisor's email address below. They will receive a secure link to review and electronically sign this progress note.
                            </p>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Supervisor Email</label>
                            <input
                                type="email"
                                value={supervisorEmailInput}
                                onChange={(e) => setSupervisorEmailInput(e.target.value)}
                                placeholder="dr.smith@clinicflow.com"
                                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsRequestSignatureModalOpen(false)}
                                disabled={isRequestingSignature}
                                className="px-4 py-2 rounded-md font-medium text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestSignature}
                                disabled={isRequestingSignature || !supervisorEmailInput}
                                className="px-4 py-2 rounded-md font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isRequestingSignature ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TcmNoteShell;
