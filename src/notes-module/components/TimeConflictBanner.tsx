import React, { useState } from 'react';
import { AlertTriangle, Clock, ExternalLink, Info } from 'lucide-react';
import { ConflictNote } from '../hooks/useProviderTimeConflicts';
import { TimeConflictModal } from './TimeConflictModal';

interface TimeConflictBannerProps {
    conflicts: ConflictNote[];
    confidence: 'high' | 'low';
    isLoading: boolean;
}

export const TimeConflictBanner: React.FC<TimeConflictBannerProps> = ({
    conflicts,
    confidence,
    isLoading
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (isLoading) return null;

    // Use muted banner for low confidence cases as requested
    if (confidence === 'low') {
        return (
            <div className="mx-auto w-full max-w-none mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <Info size={18} className="text-slate-400 shrink-0" />
                    <p className="text-[13px] font-medium text-slate-600">
                        Unable to verify provider time conflicts reliably (missing structured time fields).
                    </p>
                </div>
            </div>
        );
    }

    if (conflicts.length === 0) return null;

    return (
        <div className="mx-auto w-full max-w-none mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-amber-200/30 transition-colors duration-500" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200/50">
                        <AlertTriangle size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h4 className="text-[14px] font-black text-amber-900 tracking-tight leading-none mb-1">
                            Time Conflict Detected
                        </h4>
                        <p className="text-[12px] font-bold text-amber-700/80">
                            This provider has {conflicts.length} overlapping {conflicts.length === 1 ? 'session' : 'sessions'} recorded on {conflicts[0].date}.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="relative z-10 bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2 shadow-sm"
                >
                    View Conflicts
                    <ExternalLink size={12} />
                </button>

                <TimeConflictModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    conflicts={conflicts}
                />
            </div>
        </div>
    );
};
