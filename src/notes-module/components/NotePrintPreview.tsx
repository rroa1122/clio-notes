import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Search, Copy, Check, ExternalLink, Download,
    Pencil, Save, AlertTriangle, FileText,
    CheckCircle2, AlertCircle, RefreshCw, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';

interface NoteReviewWorkspaceProps {
    data: any;
    pdfUrl: string;
    onRegenerate: (updatedData: any) => Promise<void>;
}

const DEFAULT_SECTIONS = [
    "CHIEF COMPLAINT- CC:",
    "SUBJECTIVE/ HISTORY OF PRESENT ILLNESS-HPI:",
    "CURRENT PSYCHIATRIC TREATMENT:",
    "PAST PSYCHIATRIC HISTORY:",
    "SAFETY ASSESSMENT:",
    "PSYCHIATRIC MEDICATION HISTORY:",
    "FAMILY MENTAL ILLNESS HISTORY:",
    "RELEVANT MEDICAL CONDITIONS:",
    "OB & PREGNANCY Hx:",
    "RELEVANT SURGICAL PROCEDURES:",
    "ALLERGIES:",
    "OTHER NON-PSYCHIATRIC MEDICATIONS:",
    "SOCIAL, EDUCATION, EMPLOYMENT, AND LEGAL HISTORY:",
    "REVIEW OF SIGNS AND SYMPTOMS:",
    "OBJECTIVE-MSE:",
    "Test/ Screening Tools:",
    "Assessment-DSM 5:",
    "Plan and Interventions:",
    "Disposition and Follow Up:"
];

// 1. ROBUST BLANK CHECK UTILITY
const getBlankStatus = (value: any) => {
    if (value === null || value === undefined) return { isBlank: true, reason: "null/undefined", rawLength: 0 };
    const str = String(value).trim();
    const rawLength = str.length;
    if (rawLength === 0) return { isBlank: true, reason: "empty string", rawLength: 0 };

    const lower = str.toLowerCase();
    const blankPlaceholders = ["not reported", "(blank)", "n/a", "na", "-", "—"];
    if (blankPlaceholders.includes(lower)) return { isBlank: true, reason: `placeholder: ${lower}`, rawLength };

    if (rawLength < 3) return { isBlank: true, reason: "length < 3", rawLength };

    return { isBlank: false, rawLength };
};

export const NotePrintPreview: React.FC<NoteReviewWorkspaceProps> = ({ data, pdfUrl, onRegenerate }) => {
    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // 2. DATA EXTRACTION & NORMALIZATION
    const response = data || {};
    const noteObj = response.note || {};
    const fields = noteObj.fields || {};
    const patientObj = fields.patient || fields || {};

    const [editableNote, setEditableNote] = useState({
        patientName: patientObj.full_name || patientObj.patientName || patientObj.name || "",
        dob: patientObj.dob || patientObj.patientDob || "",
        age: patientObj.age || "",
        sex: patientObj.sex || patientObj.patient_sex || "",
        sections: [] as { title: string; body: string; id: string; status: any }[]
    });

    // Sync initial data or updates from props
    useEffect(() => {
        const flatSections = response.flatSections || [];
        const noteSections = noteObj.sections || [];
        const sectionsByTitle = response.sectionsByTitle || response.sections_by_title || {};

        let sourceSections: { title: string; body: string }[] = [];

        if (Array.isArray(flatSections) && flatSections.length > 0) {
            sourceSections = flatSections.map((s: any) => ({ title: s.title, body: s.body }));
        } else if (Array.isArray(noteSections) && noteSections.length > 0) {
            sourceSections = noteSections.map((s: any) => ({ title: s.title, body: s.body }));
        } else if (Object.keys(sectionsByTitle).length > 0) {
            sourceSections = Object.entries(sectionsByTitle).map(([title, body]) => ({ title, body: body as string }));
        }

        const mergedSections = DEFAULT_SECTIONS.map((title, idx) => {
            const found = sourceSections.find(s => s.title.toUpperCase() === title.toUpperCase());
            const body = found ? found.body : "";
            return {
                title,
                body,
                id: `sec-${idx}`,
                status: getBlankStatus(body)
            };
        });

        sourceSections.forEach(s => {
            if (!DEFAULT_SECTIONS.find(t => t.toUpperCase() === s.title.toUpperCase())) {
                mergedSections.push({
                    title: s.title,
                    body: s.body,
                    id: `sec-extra-${mergedSections.length}`,
                    status: getBlankStatus(s.body)
                });
            }
        });

        setEditableNote(prev => ({
            ...prev,
            patientName: patientObj.full_name || patientObj.patientName || patientObj.name || "",
            dob: patientObj.dob || patientObj.patientDob || "",
            sex: patientObj.sex || patientObj.patient_sex || "",
            sections: mergedSections
        }));
    }, [data]);

    const displayAge = useMemo(() => {
        if (editableNote.age) return editableNote.age;
        if (!editableNote.dob) return "—";
        try {
            const birthDate = new Date(editableNote.dob);
            if (isNaN(birthDate.getTime())) return "—";
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            return age.toString();
        } catch (e) { return "—"; }
    }, [editableNote.dob, editableNote.age]);

    const filteredSections = useMemo(() => {
        return editableNote.sections.filter(s =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.body.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [editableNote.sections, searchQuery]);

    const handleSectionChange = (id: string, newBody: string) => {
        setEditableNote(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === id ? { ...s, body: newBody, status: getBlankStatus(newBody) } : s)
        }));
    };

    const handleMetaChange = (key: string, val: string) => {
        setEditableNote(prev => ({ ...prev, [key]: val }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedData = {
                ...response,
                note: {
                    ...noteObj,
                    fields: {
                        ...fields,
                        patient_name: editableNote.patientName,
                        patient_dob: editableNote.dob,
                        patient_sex: editableNote.sex
                    },
                    sections: editableNote.sections.map(s => ({ title: s.title, body: s.body }))
                },
                sections_by_title: editableNote.sections.reduce((acc, s) => ({ ...acc, [s.title]: s.body }), {})
            };
            await onRegenerate(updatedData);
            setIsEditing(false);
            toast.success("Note saved and regenerating PDF...");
        } catch (e) {
            toast.error("Failed to update note");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyAll = () => {
        const fullText = response.noteText || editableNote.sections.map(s => `${s.title}\n${s.body || '(blank)'}`).join('\n\n');
        navigator.clipboard.writeText(fullText);
        setCopiedAll(true);
        toast.success("Full note copied");
        setTimeout(() => setCopiedAll(false), 2000);
    };

    const handleCopySection = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Section copied");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const filledCount = editableNote.sections.filter(s => !s.status.isBlank).length;
    const encounterTitle =
        noteObj.meta?.note_type ||
        response.meta?.note_type ||
        editableNote.sections[0]?.title ||
        "Encounter";

    const warnings = response.warnings || [];
    const missingFields = response.missing_fields || [];

    // Safety guard
    if (!data) return null;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-in fade-in duration-300 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl">

            {/* DEV DEBUG BAR (Removed from UI per request) */}

            <header className="flex-none bg-white dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 p-4 z-20">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight">Review Workspace</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{encounterTitle}</span>
                                    {filledCount > 0 ? (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-bold rounded-md uppercase tracking-wider border border-green-100 dark:border-green-500/20">
                                            <CheckCircle2 size={10} /> Ready
                                        </span>
                                    ) : (
                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 text-[9px] font-bold rounded-md uppercase tracking-wider border border-slate-200 dark:border-white/5">Empty</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                        Save & Regenerate
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all"
                                    >
                                        <Pencil size={14} /> Edit Mode
                                    </button>
                                    <button
                                        onClick={handleCopyAll}
                                        className="flex items-center gap-2 px-4 py-2 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all"
                                    >
                                        {copiedAll ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        {copiedAll ? "Copied" : "Copy All"}
                                    </button>
                                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 mx-1"></div>
                                    <button
                                        onClick={() => window.open(pdfUrl, '_blank')}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        title="Open PDF"
                                    >
                                        <ExternalLink size={20} />
                                    </button>
                                    <a
                                        href={pdfUrl}
                                        download={`Clinical_Note_${editableNote.patientName || 'Untitled'}.pdf`}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        title="Download PDF"
                                    >
                                        <Download size={20} />
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* PATIENT SUMMARY ROW */}
                    <div className="flex flex-wrap items-center gap-y-3 px-4 py-3 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-indigo-500 tracking-tighter">Client Full Name</label>
                                    <input
                                        type="text"
                                        value={editableNote.patientName}
                                        onChange={(e) => handleMetaChange('patientName', e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-indigo-500 tracking-tighter">DOB</label>
                                        <DatePicker 
                                            date={editableNote.dob} 
                                            setDate={(val) => handleMetaChange('dob', val)} 
                                            className="h-[34px] rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-indigo-500 tracking-tighter">Gender/Sex</label>
                                    <select
                                        value={editableNote.sex}
                                        onChange={(e) => handleMetaChange('sex', e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Not reported">Not reported</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-4">
                                    <span className="text-[10px] font-bold text-slate-400">Derived Age: <span className="text-slate-900 dark:text-slate-200">{displayAge}</span></span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 w-full text-xs font-semibold text-slate-700 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Client:</span>
                                    <span className="text-slate-900 dark:text-slate-200">{getBlankStatus(editableNote.patientName).isBlank ? "—" : editableNote.patientName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">DOB:</span>
                                    <span className="text-slate-900 dark:text-slate-200">{getBlankStatus(editableNote.dob).isBlank ? "—" : editableNote.dob}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Age:</span>
                                    <span className="text-slate-900 dark:text-slate-200">{displayAge}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Sex:</span>
                                    <span className="text-slate-900 dark:text-slate-200">{getBlankStatus(editableNote.sex).isBlank ? "—" : editableNote.sex}</span>
                                </div>

                                {warnings.length > 0 && (
                                    <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full border border-yellow-100 dark:border-yellow-500/20 text-[10px] font-bold">
                                        <AlertCircle size={12} /> {warnings.length} Updates
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* SIDEBAR NAVIGATION */}
                <aside className="w-[300px] bg-white dark:bg-slate-900/30 border-r border-slate-200 dark:border-white/5 flex flex-col z-10 shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search sections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                        <div className="px-3 py-2 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Clinical Sections</div>
                        {editableNote.sections.map((s: any) => {
                            const match = searchQuery === "" || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.body.toLowerCase().includes(searchQuery.toLowerCase());
                            if (!match) return null;

                            const { isBlank } = s.status;

                            return (
                                <button
                                    key={s.id}
                                    onClick={() => scrollToSection(s.id)}
                                    title={s.title}
                                    className="w-full group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-all"
                                >
                                    <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate pr-2">
                                        {s.title}
                                    </span>
                                    {isBlank ? (
                                        <span className="shrink-0 px-1.5 py-0.5 bg-slate-50/50 dark:bg-white/5 text-slate-300 dark:text-slate-700 text-[8px] font-black rounded uppercase border border-slate-200/30 dark:border-white/5">Blank</span>
                                    ) : (
                                        <span className="shrink-0 px-1.5 py-0.5 bg-green-50/50 dark:bg-green-500/10 text-green-500 text-[8px] font-black rounded uppercase border border-green-200/30 dark:border-green-500/20">Filled</span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {(warnings.length > 0 || missingFields.length > 0) && (
                        <div className="p-4 bg-yellow-50/30 dark:bg-yellow-950/20 border-t border-yellow-100 dark:border-yellow-900/20">
                            <h5 className="text-[9px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <AlertTriangle size={12} /> Quality Checklist
                            </h5>
                            <div className="space-y-2">
                                {warnings.map((w: string, i: number) => (
                                    <div key={i} className="text-[10px] leading-relaxed text-yellow-700 dark:text-yellow-600/80">• {w}</div>
                                ))}
                                {missingFields.length > 0 && (
                                    <div className="text-[10px] leading-relaxed text-yellow-700 dark:text-yellow-600/80">• Missing: {missingFields.join(", ")}</div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white dark:bg-[#06080A]">
                    <div className="max-w-4xl mx-auto space-y-10">
                        {filteredSections.map((s: any) => (
                            <div
                                key={s.id}
                                id={s.id}
                                className={`group relative transition-all duration-300 ${isEditing ? 'p-6 bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-inner' : 'border-b border-slate-100 dark:border-white/5 pb-10'}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                                        {s.title}
                                    </h3>
                                    {!isEditing && !s.status.isBlank && (
                                        <button
                                            onClick={() => handleCopySection(s.id, `${s.title}\n${s.body}`)}
                                            className="p-2 text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                                        >
                                            {copiedId === s.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <textarea
                                        value={s.body}
                                        onChange={(e) => handleSectionChange(s.id, e.target.value)}
                                        className="w-full min-h-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 text-[14px] leading-relaxed dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all scrollbar-hide"
                                        placeholder={`Add clinical narrative for ${s.title}...`}
                                    />
                                ) : (
                                    <div className="text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-400 whitespace-pre-wrap font-medium">
                                        {!s.status.isBlank || isEditing ? s.body : (
                                            <span className="text-slate-300/80 dark:text-slate-800 italic text-[13.5px] select-none">(blank)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="pt-20 pb-20 flex flex-col items-center gap-4 opacity-10">
                            <div className="w-16 h-[2px] bg-slate-900 dark:bg-white rounded-full"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em]">End of Clinical Audit</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
