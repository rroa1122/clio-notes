import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ClioNote, Template } from '../types';
import { storage } from '../lib/storage';
import { DEFAULT_TEMPLATES } from '../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Save, CheckCircle2, PenTool, Copy, Check, Calendar } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import SignatureModal from './SignatureModal';
import { useProviderTimeConflicts } from '../hooks/useProviderTimeConflicts';
import { TimeConflictBanner } from './TimeConflictBanner';
import { printNoteViaIframe } from '../lib/printNote';
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
        const currentVal = current[part];
        current[part] = Array.isArray(currentVal) ? [...currentVal] : (currentVal ? { ...currentVal } : {});
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    return next;
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
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-100 pb-0.5 mt-6 first:mt-0">
        {children}
    </div>
);

const CustomPrintHeader = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: '2-digit'
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase();

    return (
        <div className="flex justify-between items-end w-full border-b-[1.5px] border-slate-900 pb-1.5 mb-6 no-print-bg">
            <span className="text-[16px] font-black uppercase tracking-tight text-slate-900 leading-none">Progress Note</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Clinical Record &nbsp;•&nbsp; Generated: {formattedDate}, {formattedTime}
            </span>
        </div>
    );
};

const CustomPrintFooter = ({ note }: { note: ClioNote }) => (
    <div className="print-only-footer hidden print:flex fixed bottom-0 left-0 right-0 justify-between items-center py-4 border-t border-slate-200 mt-8">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Patient: {note.patient?.full_name} | EMR: {(note as any).patient?.account_number || (note as any).patient?.emr || "—"}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Page <span className="page-number"></span>
        </div>
    </div>
);

const PrintValue = ({
    value,
    field,
    isEditMode,
    onChange
}: {
    value: any;
    field?: any;
    isEditMode: boolean;
    onChange: (val: any) => void
}) => {
    const displayedValue = formatValueForPrint(value);
    const isComplex = Array.isArray(value) && value.length > 0 && typeof value[0] === 'object';
    const isArrayOfStrings = Array.isArray(value) && (value.length === 0 || typeof value[0] === 'string');
    const isEditable = !isComplex && field?.path && field.path !== '__static';
    const textContent = displayedValue || field?.defaultText;

    if (isEditMode && isEditable) {
        if (field?.type === 'checkbox' || field?.type === 'boolean') {
            const isChecked = value === true || value === "yes" || value === "X" || value === "x" || (typeof value === "string" && value.trim() !== "");
            return (
                <div
                    onClick={() => onChange(!isChecked)}
                    className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-md transition-all ${isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                >
                    <div className={`size-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                        {isChecked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                    {field?.label && <span className="text-[12px] font-medium text-slate-700">{field.label}</span>}
                </div>
            );
        }

        const handleCopy = () => {
            const textToCopy = isArrayOfStrings ? (value as string[]).join('\n') : (displayedValue || '');
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy);
                toast.success("Copied to clipboard");
            }
        };

        const inputClasses = "w-full text-[12px] p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 bg-white dark:bg-slate-900/50 font-medium leading-relaxed transition-all placeholder:text-slate-300";

        if (field?.type === 'date') {
            return (
                <div className="mt-1">
                    <DatePicker 
                        date={value || ''} 
                        setDate={onChange} 
                        className="w-full text-[12px] h-[36px] border-slate-200 rounded-lg shadow-sm"
                    />
                </div>
            );
        }

        if (field?.type === 'number') {
            return (
                <div className="mt-1">
                    <input
                        type="number"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={inputClasses}
                    />
                </div>
            );
        }

        return (
            <div className="mt-1">
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
                    placeholder={field?.defaultText || "Enter text..."}
                    className={`${inputClasses} min-h-[42px] resize-y`}
                    rows={isArrayOfStrings ? Math.max(3, (value as string[]).length) : (displayedValue && displayedValue.length > 60 ? 3 : 1)}
                />
            </div>
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
            {isEditMode && !isEditable && (
                <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                    <div className="bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">READ ONLY</div>
                </div>
            )}
        </div>
    );
};

interface EcwPrintNoteProps {
    note: ClioNote;
    hideToolbar?: boolean;
    isStandalone?: boolean;
    onSaveComplete?: (saved: boolean) => void;
}

const EcwPrintNote: React.FC<EcwPrintNoteProps> = ({
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
    const [signatureImg, setSignatureImg] = useState<string | null>(null);
    const [supSignatureImg, setSupSignatureImg] = useState<string | null>(null);
    const [sigModal, setSigModal] = useState<{ open: boolean, type: 'cm' | 'sup' }>({ open: false, type: 'cm' });
    const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
    const [isFullNoteCopied, setIsFullNoteCopied] = useState(false);
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

    const handleCopyFullNote = () => {
        let fullText = "";

        // Header info
        fullText += `PCP PROGRESS NOTE\n`;
        fullText += `Patient: ${mergedNote.patient?.full_name || "—"}\n`;
        fullText += `Date of Visit: ${note.appointment?.date_of_service || note.meta?.visit_date || note.meta?.visitDate || new Date().toLocaleDateString()}\n\n`;

        layout.forEach(section => {
            const relevantFields = section.fields?.filter((field: any) => {
                const val = getValueByPath(mergedNote, field.path);
                return val != null && val !== "" && val !== "not_reported";
            });

            if (relevantFields && relevantFields.length > 0) {
                fullText += `[${section.title.toUpperCase()}]\n`;
                relevantFields.forEach((field: any) => {
                    const val = getValueByPath(mergedNote, field.path);
                    const formatted = formatValueForPrint(val);
                    if (formatted) {
                        fullText += `${field.label}: ${formatted}\n`;
                    }
                });
                fullText += "\n";
            }
        });

        if (fullText) {
            navigator.clipboard.writeText(fullText.trim());
            setIsFullNoteCopied(true);
            toast.success("Full note copied to clipboard");
            setTimeout(() => setIsFullNoteCopied(false), 2000);
        } else {
            toast.error("Nothing to copy");
        }
    };

    useEffect(() => {
        const loadClinicSettings = async () => {
            if (user?.clinic_id) {
                try {
                    const settings = await settingsService.fetchSettings(user.clinic_id);
                    setClinicSettings(settings);
                } catch (err) {
                    console.error("EcwPrintNote: Failed to load clinic settings:", err);
                }
            }
        };
        loadClinicSettings();
    }, [user?.clinic_id]);

    const handleSignatureClick = (type: 'cm' | 'sup') => {
        const today = getMiamiTodayString();
        if (type === 'cm' && (user as any)?.signature_url) {
            setSignatureImg((user as any).signature_url);
            handleUpdateField('signatures.cm_signature_path', (user as any).signature_url);
            handleUpdateField('signatures.cm_signed_date', today);
            handleUpdateField('staff.cm_signed_date', today); // Sync with staff for display
            toast.success("Signed automatically with your saved signature");
        } else if (type === 'sup' && clinicSettings?.supervisorSignatureUrl) {
            setSupSignatureImg(clinicSettings.supervisorSignatureUrl);
            handleUpdateField('signatures.sup_signature_path', clinicSettings.supervisorSignatureUrl);
            handleUpdateField('signatures.sup_signed_date', today);
            handleUpdateField('staff.sup_signed_date', today); // Sync with staff for display
            toast.success("Supervisor signed automatically");
        } else {
            setSigModal({ open: true, type });
        }
    };

    const handleCopySection = (section: any) => {
        let sectionText = "";
        section.fields?.forEach((field: any) => {
            const val = getValueByPath(mergedNote, field.path);
            const formatted = formatValueForPrint(val);
            if (formatted && formatted !== "Not reported") {
                sectionText += `${field.label}: ${formatted}\n`;
            }
        });

        if (sectionText) {
            navigator.clipboard.writeText(sectionText.trim());
            toast.success(`Copied ${section.title} to clipboard`);
        }
    };

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const fetched = await storage.getTemplates();
                setTemplates(fetched);
            } catch (err) {
                console.error("EcwPrintNote: Failed to load templates:", err);
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        loadTemplates();
    }, []);

    const templateId = note.meta?.template_id || 'psych-eval';
    const templateVersion = note.meta?.template_version || '1.0';

    const template = templates.find((t: Template) => t.id === templateId && t.version === templateVersion)
        || templates.find((t: Template) => t.id === templateId)
        || (templates.length > 0 ? templates[0] : null);

    const hasDefinition = template && template.definition;

    useEffect(() => {
        if (template && !hasDefinition && !isLoadingTemplates) {
            toast.warning(`Missing layout for blueprint: "${templateId}". Falling back to default layout.`);
        }
    }, [template, hasDefinition, isLoadingTemplates, templateId]);

    const mergedNote = useMemo(() => {
        let result = { ...note };
        Object.keys(noteOverrides).forEach(path => {
            result = setValueByPath(result, path, noteOverrides[path]);
        });
        return result;
    }, [note, noteOverrides]);

    // Conflict detection on the MERGED note for real-time validation
    const { conflicts, confidence, isLoading: isConflictLoading } = useProviderTimeConflicts(mergedNote);

    const handleUpdateField = (path: string, newValue: any) => {
        setNoteOverrides((prev: any) => ({
            ...prev,
            [path]: newValue
        }));
        setIsSaved(false);
        if (onSaveComplete) onSaveComplete(false);
    };

    const handleSaveToHistory = async (): Promise<boolean> => {
        if (!user) {
            toast.error("Please sign in to save notes");
            return false;
        }

        if (conflicts && conflicts.length > 0) {
            toast.error("Cannot save note with overlapping times. Please resolve time conflicts first.");
            return false;
        }

        setIsSaving(true);
        try {
            const rawDate = (mergedNote as any).appointment?.date_of_service || (mergedNote.meta as any)?.visitDate || (mergedNote.meta as any)?.visit_date || (mergedNote as any).createdAt || (mergedNote as any).created_at;
            const finalDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

            if (!(mergedNote as any).meta) (mergedNote as any).meta = {};
            (mergedNote as any).meta.visitDate = finalDate;

            if (!mergedNote.patient_id && (note as any).patient_id) {
                mergedNote.patient_id = (note as any).patient_id;
            }

            await storage.saveAnalyzedNote(mergedNote);
            setIsSaved(true);
            if (onSaveComplete) onSaveComplete(true);
            toast.success("Saved to Clinical History");
            return true;
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to save note");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        (window as any).__CLIO_SAVE_FUNCTION = handleSaveToHistory;
        return () => { (window as any).__CLIO_SAVE_FUNCTION = undefined; };
    }, [mergedNote, user, handleSaveToHistory]);

    if (isLoadingTemplates) {
        return (
            <div className="bg-white text-black p-12 border border-slate-200 w-full max-w-[950px] mx-auto animate-pulse">
                <div className="h-8 bg-slate-100 rounded w-1/3 mb-8"></div>
                <div className="space-y-4">
                    <div className="h-4 bg-slate-50 rounded w-full"></div>
                    <div className="h-4 bg-slate-50 rounded w-full"></div>
                    <div className="h-4 bg-slate-50 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="bg-white text-black p-12 border border-slate-200 w-full max-w-[950px] mx-auto text-center">
                <p className="text-red-500 font-bold uppercase tracking-wider text-[11px]">No templates available</p>
            </div>
        );
    }

    let layout: any[] = [];
    let parsingError = "";

    try {
        const definitionToUse = template?.definition || DEFAULT_TEMPLATES.find(dt => dt.id === templateId)?.definition || DEFAULT_TEMPLATES[0].definition;
        let parsed: any = null;
        if (typeof definitionToUse === 'string') {
            parsed = JSON.parse(definitionToUse);
        } else if (Array.isArray(definitionToUse)) {
            parsed = definitionToUse;
        }

        if (isValidLayout(parsed)) {
            layout = parsed;
        } else if (parsed) {
            parsingError = "Invalid layout schema";
            console.error(`EcwPrintNote: Schema validation failed:`, parsed);
        } else {
            parsingError = "Empty or missing definition";
        }
    } catch (e: any) {
        parsingError = `JSON parse error: ${e.message}`;
    }

    if (layout.length === 0) {
        const defaultDef = DEFAULT_TEMPLATES.find(dt => dt.id === 'psych-eval')?.definition || DEFAULT_TEMPLATES[0].definition;
        try {
            layout = JSON.parse(defaultDef as string);
        } catch (e) {
            layout = [];
        }
    }

    if (!template.definition) {
        return (
            <div className="bg-white text-black p-12 border border-slate-200 w-full max-w-[950px] mx-auto text-center">
                <p className="text-red-500 font-bold uppercase tracking-widest text-[10px]">Template definition not found</p>
            </div>
        );
    }

    const handlePrint = async () => {
        const printRoot = document.getElementById('note-print-root');
        if (!printRoot) {
            toast.error("Print preview not ready. Please try again.");
            return;
        }

        const patientName = note.patient?.full_name || 'Patient';
        const visitDate = note.appointment?.date_of_service || note.meta?.visit_date || note.meta?.visitDate || new Date().toISOString();
        const formattedDos = new Date(visitDate).toLocaleDateString();

        try {
            window.print();
        } catch (e) {
            console.error("Print failed:", e);
            toast.error("Failed to generate print document.");
        }
    };

    return (
        <div className={`ecw-print-shell ${!isStandalone ? 'max-w-[950px] mx-auto' : ''}`}>
            <TimeConflictBanner
                conflicts={conflicts}
                confidence={confidence}
                isLoading={isConflictLoading}
            />
            {!hideToolbar && (
                <div className="ecw-toolbar no-print flex flex-col gap-4 mb-6 mt-4">
                    {parsingError && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 animate-in slide-in-from-top-2">
                            <PenTool size={16} className="shrink-0" />
                            <div className="text-[11px] font-medium">
                                <span className="font-bold uppercase">Invalid Layout for "{templateId}":</span> {parsingError}.
                                <span className="ml-1 opacity-70">Falling back to default blueprint.</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 dark:bg-white/5 dark:border-white/5">
                        <button
                            onClick={handleSaveToHistory}
                            disabled={isSaving || isSaved || !user || (conflicts && conflicts.length > 0)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm border ${isSaved
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                                : (conflicts && conflicts.length > 0)
                                ? "bg-red-50 text-red-400 border-red-100 cursor-not-allowed"
                                : "bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-600 hover:text-white disabled:opacity-50"
                                }`}
                            title={(conflicts && conflicts.length > 0) ? "Please resolve time conflicts before saving" : ""}
                        >
                            {isSaving ? (
                                <div className="size-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : isSaved ? (
                                <CheckCircle2 size={12} />
                            ) : (
                                <Save size={12} />
                            )}
                            {isSaved ? "Saved" : "Save Note"}
                        </button>

                        <div className="h-6 w-[1px] bg-slate-100 dark:bg-white/10 mx-1"></div>

                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm border ${isEditMode
                                ? "bg-green-600 text-white border-green-700 hover:bg-green-700"
                                : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white"
                                }`}
                        >
                            {isEditMode ? (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Done
                                </>
                            ) : (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit Note
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setSigModal({ open: true, type: 'cm' })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm border ${signatureImg || mergedNote.signatures?.cm_signature_path
                                ? "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-600 hover:text-white"
                                : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white"
                                }`}
                        >
                            <PenTool size={12} />
                            {signatureImg || mergedNote.signatures?.cm_signature_path ? "Change Signature" : "Sign Note"}
                        </button>

                        <button
                            onClick={handleCopyFullNote}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm border ${isFullNoteCopied
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            {isFullNoteCopied ? <Check size={12} /> : <Copy size={12} />}
                            {isFullNoteCopied ? "Copied" : "Copy Full Note"}
                        </button>

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Print Note
                        </button>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print, .no-print-bg, .ecw-toolbar { display: none !important; }
                    /* .document-page padding handled globally in index.css */
                }

                /* Layout Canvas Styles (Screen) */
                .document-canvas-wrapper {
                    background-color: #f1f5f9; /* slate-100 */
                    min-height: 100vh;
                    padding: 3rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
 
                .document-page {
                    background-color: white;
                    width: 8.5in;
                    min-height: 11in;
                    padding: 0.6in;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                    position: relative;
                    margin-bottom: 2rem;
                    box-sizing: border-box;
                    font-family: 'Inter', system-ui, sans-serif !important;
                }
            `}} />

            <div className="document-canvas-wrapper no-print-bg">
                <div id="note-print-root" className="document-page">
                    <table className="print-table w-full border-collapse">
                        <thead>
                            <tr>
                                <td className="pb-6">
                                    <CustomPrintHeader />
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div className="mb-0 print-section">
                                        {/* A) HEADER (2-column) */}
                                        <div className="grid grid-cols-2 gap-12 border-b-2 border-slate-900 pb-8 mb-8">
                                            {/* Column 1: Patient Information */}
                                            <div className="space-y-4 group/patient relative">
                                                <div className="absolute -top-6 right-0 no-print opacity-0 group-hover/patient:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleCopy(`Patient: ${mergedNote.patient?.full_name}\nDOB: ${mergedNote.patient?.dob ? new Date(mergedNote.patient.dob).toLocaleDateString() : '—'}\nCase No: ${mergedNote.patient?.account_number || mergedNote.patient?.case_no || '—'}\nSex: ${mergedNote.patient?.sex_at_birth || '—'}`, "patient")}
                                                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copyingField === 'patient' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} border text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white`}
                                                    >
                                                        {copyingField === 'patient' ? <Check size={12} /> : <Copy size={12} />}
                                                        {copyingField === 'patient' ? 'Copied' : 'Copy Patient'}
                                                    </button>
                                                </div>
                                                <div className="pb-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Information</p>
                                                    <div className="text-xl font-black text-slate-950 leading-tight tracking-tight">
                                                        <PrintValue
                                                            value={mergedNote.patient?.full_name || ""}
                                                            isEditMode={isEditMode}
                                                            onChange={(val) => handleUpdateField('patient.full_name', val)}
                                                            field={{ path: 'patient.full_name' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">EMR / Patient ID</p>
                                                        <div className="text-[13px] font-black text-slate-900 leading-tight">
                                                            <PrintValue
                                                                value={mergedNote.patient?.account_number || ""}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField('patient.account_number', val)}
                                                                field={{ path: 'patient.account_number' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Case No</p>
                                                        <div className="text-[13px] font-black text-slate-900 leading-tight">
                                                            <PrintValue
                                                                value={mergedNote.patient?.case_no || "—"}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField('patient.case_no', val)}
                                                                field={{ path: 'patient.case_no' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Sex / Gender</p>
                                                        <div className="text-[13px] font-black text-slate-900 leading-tight">
                                                            <PrintValue
                                                                value={mergedNote.patient?.sex_at_birth || ""}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField('patient.sex_at_birth', val)}
                                                                field={{ path: 'patient.sex_at_birth' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">DOB (Age)</p>
                                                        <div className="flex items-center gap-1.5 font-black text-[13px] text-slate-900 leading-tight">
                                                            <PrintValue
                                                                value={mergedNote.patient?.dob || ""}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField('patient.dob', val)}
                                                                field={{ path: 'patient.dob', type: 'date' }}
                                                            />
                                                            {mergedNote.patient?.age && mergedNote.patient.age !== "—" && (
                                                                <span className="text-slate-400 font-bold ml-0.5">({mergedNote.patient.age}y)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Phone / Mobile</p>
                                                        <div className="text-[13px] font-black text-slate-900 leading-tight">
                                                            <PrintValue
                                                                value={mergedNote.patient?.mobile || mergedNote.patient?.phone || "—"}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField('patient.mobile', val)}
                                                                field={{ path: 'patient.mobile' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column 2: Facility Information */}
                                            <div className="space-y-4">
                                                <div className="pb-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agency / Facility</p>
                                                    <div className="text-xl font-black text-slate-950 leading-tight tracking-tight">
                                                        <PrintValue
                                                            value={mergedNote.facility?.name || mergedNote.facility?.facility_name || ""}
                                                            isEditMode={isEditMode}
                                                            onChange={(val) => handleUpdateField('facility.name', val)}
                                                            field={{ path: 'facility.name' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Physical Address</p>
                                                        <div className="text-[12px] font-black text-slate-800 leading-tight">
                                                            <PrintValue
                                                                value={mergedNote.facility?.address || ""}
                                                                isEditMode={isEditMode}
                                                                onChange={(val) => handleUpdateField('facility.address', val)}
                                                                field={{ path: 'facility.address' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Phone</p>
                                                            <div className="text-[12px] font-black text-slate-800 leading-tight">
                                                                <PrintValue
                                                                    value={mergedNote.facility?.phone || ""}
                                                                    isEditMode={isEditMode}
                                                                    onChange={(val) => handleUpdateField('facility.phone', val)}
                                                                    field={{ path: 'facility.phone' }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Fax</p>
                                                            <div className="text-[12px] font-black text-slate-800 leading-tight">
                                                                <PrintValue
                                                                    value={mergedNote.facility?.fax || ""}
                                                                    isEditMode={isEditMode}
                                                                    onChange={(val) => handleUpdateField('facility.fax', val)}
                                                                    field={{ path: 'facility.fax' }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 space-y-0.5">
                                                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em]">Email Contact</p>
                                                            <div className="text-[12px] font-black text-slate-800 leading-tight">
                                                                <PrintValue
                                                                    value={mergedNote.facility?.email || ""}
                                                                    isEditMode={isEditMode}
                                                                    onChange={(val) => handleUpdateField('facility.email', val)}
                                                                    field={{ path: 'facility.email' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* B) SERVICE TITLE / VISIT OBJECTIVE */}
                                        <div className="mb-8 p-3 bg-slate-50/50 border-y border-slate-200 print:bg-transparent print:border-slate-300">
                                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 text-center">Visit Objective / Primary Service Focus</p>
                                            <div className="text-[15px] font-black text-slate-950 text-center leading-tight tracking-tight">
                                                <PrintValue
                                                    value={(mergedNote as any).services?.service_focus_title || (mergedNote as any).meta?.service_focus_title || "Routine Patient Encounter / Progress Evaluation"}
                                                    isEditMode={isEditMode}
                                                    onChange={(val) => handleUpdateField('services.service_focus_title', val)}
                                                    field={{ path: 'services.service_focus_title' }}
                                                />
                                            </div>
                                        </div>

                                        {/* C) VISIT META BLOCK */}
                                        <div className="grid grid-cols-4 gap-4 mb-8 pb-8 border-b border-slate-100 group/encounter relative">
                                            <div className="absolute -top-4 right-0 no-print opacity-0 group-hover/encounter:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCopy((mergedNote as any).services?.service_focus_title || (mergedNote as any).meta?.service_focus_title || "Routine Patient Encounter / Progress Evaluation", "encounter")}
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copyingField === 'encounter' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} border text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white`}
                                                >
                                                    {copyingField === 'encounter' ? <Check size={12} /> : <Copy size={12} />}
                                                    {copyingField === 'encounter' ? 'Copied' : 'Copy Details'}
                                                </button>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Place of Service</p>
                                                <div className="text-[13px] font-black text-slate-900">
                                                    <PrintValue
                                                        value={mergedNote.encounter?.pos || ""}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('encounter.pos', val)}
                                                        field={{ path: 'encounter.pos' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encounter Time</p>
                                                <div className="text-[13px] font-black text-slate-900">
                                                    <div className="flex items-center gap-1">
                                                        <PrintValue
                                                            value={mergedNote.encounter?.time_in || ""}
                                                            isEditMode={isEditMode}
                                                            onChange={(val) => handleUpdateField('encounter.time_in', val)}
                                                            field={{ path: 'encounter.time_in' }}
                                                        />
                                                        <span className="text-slate-300">-</span>
                                                        <PrintValue
                                                            value={mergedNote.encounter?.time_out || ""}
                                                            isEditMode={isEditMode}
                                                            onChange={(val) => handleUpdateField('encounter.time_out', val)}
                                                            field={{ path: 'encounter.time_out' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration (Min)</p>
                                                <div className="text-[13px] font-black text-slate-900">
                                                    <PrintValue
                                                        value={mergedNote.encounter?.duration || ""}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('encounter.duration', val)}
                                                        field={{ path: 'encounter.duration', type: 'number' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</p>
                                                <div className="text-[13px] font-black text-slate-900">
                                                    <PrintValue
                                                        value={mergedNote.encounter?.units || ""}
                                                        isEditMode={isEditMode}
                                                        onChange={(val) => handleUpdateField('encounter.units', val)}
                                                        field={{ path: 'encounter.units', type: 'number' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="space-y-8">
                        {/* D) DOMAINS / FOCUS OF SERVICE (Dynamic Layout) */}
                        {layout
                            .filter((s: any) => !['Patient', 'Facility', 'Summary', 'Signatures', 'Outcome', 'Diagnoses'].some(exclude => s.title.includes(exclude)))
                            .map((section: any, sIdx: number) => (
                                <section key={sIdx} className="mt-8 first:mt-0 print-section border-b border-slate-100 pb-8 last:border-0 group/section relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{section.title}</h2>
                                        <button
                                            onClick={() => handleCopy(section.fields?.map((f: any) => `${f.label}: ${getValueByPath(mergedNote, f.path) || '—'}`).join('\n'), section.title)}
                                            className={`no-print opacity-0 group-hover/section:opacity-100 p-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm border ${copyingField === section.title ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white'}`}
                                        >
                                            {copyingField === section.title ? <Check size={11} /> : <Copy size={11} />}
                                            <span className="text-[9px] font-bold uppercase tracking-tight">{copyingField === section.title ? 'Copied' : 'Copy Section'}</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {section.fields?.map((field: any, fIdx: number) => (
                                            <div key={fIdx}>
                                                <PrintLabel>{field.label}</PrintLabel>
                                                <PrintValue
                                                    value={getValueByPath(mergedNote, field.path)}
                                                    field={field}
                                                    isEditMode={isEditMode}
                                                    onChange={(val) => handleUpdateField(field.path, val)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}

                        {/* E) SUMMARY / NOTES (Narrative) */}
                        <section className="print-section break-inside-avoid">
                            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">Summary / Clinical Notes</h2>
                            <div className="bg-slate-50/10 p-4 rounded-xl border border-slate-100/50 print:bg-transparent print:p-0 print:border-0">
                                <PrintValue
                                    value={mergedNote.narrative?.summary_notes}
                                    isEditMode={isEditMode}
                                    onChange={(val) => handleUpdateField('narrative.summary_notes', val)}
                                    field={{ path: 'narrative.summary_notes', defaultText: "Clinical summary not provided." }}
                                />
                            </div>
                        </section>

                        {/* F) OUTCOME + NEXT STEPS (2-column) */}
                        <div className="grid grid-cols-2 gap-12 print-section break-inside-avoid">
                            <section>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 border-b border-slate-200 pb-1 mb-4">Outcome of Service(s)</h2>
                                <div className="text-[13px] leading-relaxed">
                                    <PrintValue
                                        value={mergedNote.narrative?.outcome_of_services}
                                        isEditMode={isEditMode}
                                        onChange={(val) => handleUpdateField('narrative.outcome_of_services', val)}
                                        field={{ path: 'narrative.outcome_of_services', defaultText: "Outcome details pending." }}
                                    />
                                </div>
                            </section>
                            <section>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 border-b border-slate-200 pb-1 mb-4">Next Step(s)</h2>
                                <div className="text-[13px] leading-relaxed">
                                    <PrintValue
                                        value={mergedNote.narrative?.next_steps}
                                        isEditMode={isEditMode}
                                        onChange={(val) => handleUpdateField('narrative.next_steps', val)}
                                        field={{ path: 'narrative.next_steps', defaultText: "Follow-up steps not specified." }}
                                    />
                                </div>
                            </section>
                        </div>

                        {/* G) DIAGNOSES */}
                        <section className="print-section break-inside-avoid group/diagnoses relative">
                            <div className="absolute -top-1 right-0 no-print opacity-0 group-hover/diagnoses:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        const text = (mergedNote.diagnoses || []).map((d: any) => `${d.icd10} - ${d.name}`).join('\n');
                                        handleCopy(text, "diagnoses");
                                    }}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copyingField === 'diagnoses' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} border text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white`}
                                >
                                    {copyingField === 'diagnoses' ? <Check size={12} /> : <Copy size={12} />}
                                    {copyingField === 'diagnoses' ? 'Copied' : 'Copy Diagnoses'}
                                </button>
                            </div>
                            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">Diagnoses</h2>
                            <div className="space-y-3">
                                {mergedNote.diagnoses && mergedNote.diagnoses.length > 0 ? (
                                    mergedNote.diagnoses.map((dx: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 items-start py-2 border-b border-slate-50 last:border-0">
                                            <span className="text-[13px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded min-w-[70px] text-center">{dx.icd10 || "—"}</span>
                                            <div className="flex-1">
                                                <p className="text-[13px] font-bold text-slate-950">{dx.name || "—"}</p>
                                                {dx.type && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dx.type}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[13px] text-slate-400 italic">No structured diagnoses recorded.</p>
                                )}
                            </div>
                        </section>

                        {/* H) SIGNATURES */}
                        <div className="mt-20 grid grid-cols-2 gap-16 print-section break-inside-avoid">
                            {/* Case Manager Signature */}
                            <div className="space-y-4">
                                <div className="border-b-[1.5px] border-slate-900 w-full h-24 relative flex items-end pb-2 overflow-hidden transition-colors hover:bg-slate-50 cursor-pointer no-print-hover" onClick={() => handleSignatureClick('cm')}>
                                    {signatureImg ? (
                                        <img src={signatureImg} alt="Signature" className="h-full object-contain mix-blend-multiply absolute right-0 bottom-0 max-h-[85%]" />
                                    ) : (
                                        <div className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.4em] no-print opacity-60 absolute inset-0 flex items-center justify-center">Click to Digitally Sign</div>
                                    )}
                                    {mergedNote.signatures?.cm_signature_path ? (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <img
                                                src={mergedNote.signatures?.cm_signature_path}
                                                alt="Clinician Signature"
                                                className="max-h-20 object-contain mix-blend-multiply opacity-90"
                                            />
                                        </div>
                                    ) : signatureImg && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <img
                                                src={signatureImg}
                                                alt="Signature"
                                                className="max-h-20 object-contain mix-blend-multiply opacity-90"
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-black text-slate-950 leading-none mb-0.5">
                                            {mergedNote.staff?.case_manager_name ||
                                                (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.name) ||
                                                "Clinician"}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            {user?.npi && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-slate-800">{user.npi}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="absolute -top-5 left-0 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Provider Digital Signature</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 px-1">
                                    <p className="flex items-center gap-1.5">
                                        <span className="size-1 rounded-full bg-slate-300"></span>
                                        Case Manager / Cert. Practitioner
                                    </p>
                                    <p className="text-slate-950 flex items-center gap-1.5">
                                        <span className="text-slate-300">DATE:</span>
                                        {mergedNote.staff?.cm_signed_date || getMiamiTodayString()}
                                    </p>
                                </div>
                            </div>

                            {/* Supervisor Signature */}
                            <div className="space-y-4">
                                <div className="border-b-[1.5px] border-slate-900 w-full h-24 relative flex items-end pb-2 overflow-hidden transition-colors hover:bg-slate-50 cursor-pointer no-print-hover" onClick={() => handleSignatureClick('sup')}>
                                    {(supSignatureImg || mergedNote.signatures?.sup_signature_path) ? (
                                        <img
                                            src={supSignatureImg || mergedNote.signatures?.sup_signature_path}
                                            alt="Supervisor Signature"
                                            className="h-full object-contain mix-blend-multiply absolute right-0 bottom-0 max-h-[85%]"
                                        />
                                    ) : (
                                        <div className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.4em] no-print opacity-60 absolute inset-0 flex items-center justify-center">Click to Digitally Sign</div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-black text-slate-950 leading-none mb-0.5">
                                            {mergedNote.signatures?.sup_name || clinicSettings?.supervisorName || "Supervisor"}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            {(mergedNote.signatures?.sup_npi || clinicSettings?.supervisorNpi) && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-slate-800">{mergedNote.signatures?.sup_npi || clinicSettings?.supervisorNpi}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="absolute -top-5 left-0 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Supervisor Digital Signature</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 px-1">
                                    <p className="flex items-center gap-1.5">
                                        <span className="size-1 rounded-full bg-slate-300"></span>
                                        Supervising Physician
                                    </p>
                                    <p className="text-slate-950 flex items-center gap-1.5">
                                        <span className="text-slate-300">DATE:</span>
                                        {mergedNote.staff?.sup_signed_date || getMiamiTodayString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <CustomPrintFooter note={mergedNote} />
                </div>
            </div>

            <SignatureModal
                isOpen={sigModal.open}
                onClose={() => setSigModal(prev => ({ ...prev, open: false }))}
                onSave={(dataUrl) => {
                    if (sigModal.type === 'cm') {
                        setSignatureImg(dataUrl);
                        handleUpdateField('signatures.cm_signature_path', dataUrl);
                        handleUpdateField('signatures.cm_signed_date', getMiamiTodayString());
                        handleUpdateField('staff.cm_signed_date', getMiamiTodayString());
                    } else {
                        setSupSignatureImg(dataUrl);
                        handleUpdateField('signatures.sup_signature_path', dataUrl);
                        handleUpdateField('signatures.sup_signed_date', getMiamiTodayString());
                        handleUpdateField('staff.sup_signed_date', getMiamiTodayString());
                    }
                    setSigModal(prev => ({ ...prev, open: false }));
                }}
                title={sigModal.type === 'cm' ? "Clinician Signature" : "Supervisor Signature"}
            />
        </div>
    );
};

export default EcwPrintNote;
