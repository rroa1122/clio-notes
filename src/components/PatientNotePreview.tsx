
import React from 'react';
import {
    X,
    Printer,
    Maximize2,
    Calendar,
    User,
    Stethoscope,
    Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ClioNoteViewer } from '../notes-module/components/ClioNoteViewer';
import { normalizeClioNote, getNoteServiceDate } from '../notes-module/lib/clioUtils';
import { format } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';

interface PatientNotePreviewProps {
    note: any;
    isOpen: boolean;
    onClose: () => void;
    onViewFull: (id: string) => void;
    onDelete?: (id: string) => void;
}

export const PatientNotePreview: React.FC<PatientNotePreviewProps> = ({
    note,
    isOpen,
    onClose,
    onViewFull,
    onDelete
}) => {
    const { language } = useLanguage();
    if (!note) return null;

    const normalizedNote = normalizeClioNote(note.rawResponse || note.structured_note || note);
    const svcDate = getNoteServiceDate(note);
    const timeStr = note.encounter?.time_in || note.appointment?.start_time || '';
    
    // Extract service / template name accurately
    const rawNote = note as any;
    const norm = normalizedNote as any;
    const templateName = rawNote.primary_service_provided ||
        rawNote.primaryServiceProvided ||
        norm?.primary_service_provided ||
        norm?.meta?.primary_service_provided ||
        rawNote.subTemplate ||
        rawNote.sub_template ||
        rawNote.service_title ||
        norm?.meta?.subTemplate ||
        rawNote.template_name ||
        rawNote.templateName ||
        norm?.meta?.template_name ||
        rawNote.noteType ||
        rawNote.note_type ||
        norm?.meta?.noteType ||
        norm?.meta?.note_type ||
        (norm?.meta?.template_id ? norm.meta.template_id.split('_').map((w: string) => w.toUpperCase() === 'TCM' ? 'TCM' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Clinical Note');

    // Defensive provider extraction
    const providerName = (normalizedNote as any)?.provider?.provider_name ||
        (normalizedNote as any)?.staff?.case_manager_name ||
        'Clinical Staff';

    const handlePrint = () => {
        window.open(`/notes/new?id=${note.id}&print=true`, '_blank');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[110] cursor-pointer transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`print-preview-drawer-wrapper fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl z-[120] transform transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Sub-header / Meta (Now the top bar) */}
                <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-6 overflow-x-auto no-scrollbar shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            {language === 'es' ? 'Fecha de Servicio (DOS)' : 'Date of Service (DOS)'}
                        </span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <Calendar size={14} className="text-slate-400" />
                            {svcDate ? (
                                timeStr ? `${format(svcDate, 'MMM d, yyyy')} • ${timeStr}` : format(svcDate, 'MMM d, yyyy')
                            ) : 'N/A'}
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-8 dark:bg-slate-800" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Provider Exec</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <User size={14} className="text-slate-400" />
                            {providerName}
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {onDelete && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDelete(note.id)}
                                className="rounded-lg font-bold gap-2 h-9 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40"
                                title={language === 'es' ? "Eliminar nota clínica" : "Delete clinical note"}
                            >
                                <Trash2 size={15} />
                                <span className="hidden sm:inline">{language === 'es' ? 'Borrar' : 'Delete'}</span>
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={() => onViewFull(note.id)}
                            className="rounded-lg font-bold gap-2 h-9 px-4 animate-in fade-in bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                        >
                            <Maximize2 size={15} />
                            Open Full
                        </Button>
                        
                        <Separator orientation="vertical" className="h-6 mx-1 dark:bg-slate-800" />
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/40">
                    <div className="py-8">
                        <ClioNoteViewer note={normalizedNote} onPrint={handlePrint} />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950 flex items-center justify-between">
                    <p className="text-[11px] font-medium text-slate-400 italic">
                        Viewing official clinical record. Locked for editing.
                    </p>
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800/60">
                        Close Preview
                    </Button>
                </div>
            </div>
        </>
    );
};
