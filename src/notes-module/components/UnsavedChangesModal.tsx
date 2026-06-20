import React from 'react';
import { AlertCircle, Save, LogOut, ArrowLeft } from 'lucide-react';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void; // Stay
    onDiscard: () => void; // Exit without saving
    onSaveAndExit: () => void; // Save then Exit
    isSaving?: boolean;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    onClose,
    onDiscard,
    onSaveAndExit,
    isSaving = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-amber-50/50 dark:bg-amber-500/5">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <AlertCircle size={22} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                Unsaved Documentation
                            </h3>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                                Risk of clinical data loss
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8">
                        You have generated clinical notes that haven't been saved to the patient's history. Would you like to save this progress before leaving the workspace?
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={onSaveAndExit}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Save size={16} />
                            )}
                            {isSaving ? "Saving..." : "Save & Exit Workspace"}
                        </button>

                        <button
                            onClick={onDiscard}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-white/5 border border-red-100 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all"
                        >
                            <LogOut size={16} /> Discard & Exit Anyway
                        </button>

                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all"
                        >
                            <ArrowLeft size={16} /> Stay on this page
                        </button>
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="px-8 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[9px] text-center text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
                        Exiting without saving will permanently delete the current session's generated clinical content.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesModal;
