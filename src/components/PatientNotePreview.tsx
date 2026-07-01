
import React from 'react';
import {
    X,
    Printer,
    Maximize2,
    Calendar,
    User,
    Stethoscope
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ClioNoteViewer } from '../notes-module/components/ClioNoteViewer';
import { normalizeClioNote } from '../notes-module/lib/clioUtils';
import { format } from 'date-fns';

interface PatientNotePreviewProps {
    note: any;
    isOpen: boolean;
    onClose: () => void;
    onViewFull: (id: string) => void;
}

export const PatientNotePreview: React.FC<PatientNotePreviewProps> = ({
    note,
    isOpen,
    onClose,
    onViewFull
}) => {
    if (!note) return null;

    const normalizedNote = normalizeClioNote(note.rawResponse || note.structured_note || note);
    const date = note.created_at || note.createdAt;
    const templateName = note.template_name || note.noteType || (normalizedNote as any)?.meta?.template_id || 'Clinical Note';

    // Defensive provider extraction
    const providerName = (normalizedNote as any)?.provider?.provider_name ||
        (normalizedNote as any)?.staff?.case_manager_name ||
        'Clinical Staff';

    const handlePrint = () => {
        window.open(`/notes/print/${note.id}`, '_blank');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[110] cursor-pointer transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[120] transform transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Sub-header / Meta (Now the top bar) */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-6 overflow-x-auto no-scrollbar shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">DOS / Timestamp</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Calendar size={14} className="text-slate-400" />
                            {date ? format(new Date(date), 'MMM d, yyyy • h:mm a') : 'N/A'}
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Provider Exec</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <User size={14} className="text-slate-400" />
                            {providerName}
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => onViewFull(note.id)}
                            className="rounded-lg font-bold gap-2 h-9 px-4 animate-in fade-in"
                        >
                            <Maximize2 size={15} />
                            Open Full
                        </Button>
                        
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                    <div className="py-8">
                        <ClioNoteViewer note={normalizedNote} />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
                    <p className="text-[11px] font-medium text-slate-400 italic">
                        Viewing official clinical record. Locked for editing.
                    </p>
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold text-slate-500">
                        Close Preview
                    </Button>
                </div>
            </div>
        </>
    );
};
