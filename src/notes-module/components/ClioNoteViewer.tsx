import React from 'react';
import {
    FileText,
    AlertCircle
} from 'lucide-react';
import EcwPrintNote from './EcwPrintNote';
import TcmNoteShell from './TcmNoteShell';
import type { ClioNote } from '../types';

interface ClioNoteViewerProps {
    note: ClioNote | null;
    loading?: boolean;
    error?: string | null;
    onSaveComplete?: (saved: boolean) => void;
}

export const ClioNoteViewer: React.FC<ClioNoteViewerProps> = ({
    note,
    loading,
    error,
    onSaveComplete
}) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                <div className="size-16 rounded-3xl border-4 border-slate-100 dark:border-white/5 border-t-primary animate-spin mb-6"></div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-[0.3em]">Synthesizing Intelligence</h3>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4 text-center">
                <div className="size-20 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Analysis Failed</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                    {error}
                </p>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="py-40 text-center opacity-30">
                <FileText size={48} className="mx-auto mb-6 opacity-20" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Acquisition Pending</h3>
            </div>
        );
    }

    const isTcm = note.meta?.template_id?.startsWith('tcm_');

    return (
        <div className="clinical-viewer-root max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 px-4">
            {isTcm ? (
                <TcmNoteShell note={note} onSaveComplete={onSaveComplete} />
            ) : (
                <EcwPrintNote note={note} onSaveComplete={onSaveComplete} />
            )}
        </div>
    );
};

export default ClioNoteViewer;
