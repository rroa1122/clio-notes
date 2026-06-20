import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { ConflictNote } from '../hooks/useProviderTimeConflicts';
import { Clock, User, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TimeConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: ConflictNote[];
}

export const TimeConflictModal: React.FC<TimeConflictModalProps> = ({
    isOpen,
    onClose,
    conflicts
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        Provider Schedule Conflicts
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {conflicts.map((conflict, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-5 hover:bg-white hover:border-slate-200 transition-all group shadow-sm hover:shadow-md">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
                                            <User size={16} className="text-teal-600" />
                                        </div>
                                        <span className="font-black text-slate-900 tracking-tight">
                                            {conflict.patientName}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-6 text-[12px] font-bold text-slate-500">
                                        <div className="flex items-center gap-1.5 underline decoration-1 underline-offset-4 decoration-slate-200">
                                            <Calendar size={14} className="opacity-50" />
                                            {conflict.date}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                            <Clock size={14} />
                                            {conflict.startTime} - {conflict.endTime}
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/notes/new?id=${conflict.id}`}
                                    target="_blank"
                                    className="bg-white border border-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Open Note</span>
                                    <ExternalLink size={14} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="text-[12px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
