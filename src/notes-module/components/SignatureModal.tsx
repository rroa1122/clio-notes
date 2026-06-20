import React from 'react';
import { X, PenTool } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureData: string) => void;
    title?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave, title = "Physician Signature" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
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
                <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <PenTool size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                {title}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Physical or Electronic Validation
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-400 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    <SignaturePad
                        onSave={onSave}
                        onCancel={onClose}
                    />
                </div>

                {/* Footer Tip */}
                <div className="px-8 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[9px] text-center text-slate-400 font-medium uppercase tracking-widest">
                        This signature will be applied to the current clinical document only.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
