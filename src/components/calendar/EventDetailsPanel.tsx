
import React from 'react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import type { CalendarEvent } from '../../services/calendarService';
import { X, Trash2, Calendar, Clock, User, Phone, ShieldCheck, FileText, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EventDetailsPanelProps {
    event: CalendarEvent;
    onClose: () => void;
    onDelete: () => Promise<void>;
    onConfirm: () => Promise<void>;
    onUpdate: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
    className?: string;
}

export const EventDetailsPanel: React.FC<EventDetailsPanelProps> = ({ event, onClose, onDelete, onConfirm, onUpdate, className }) => {
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [confirming, setConfirming] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState({
        patient_name: event.patient_name || '',
        dob: event.patient_dob || '',
        insurance_carrier: event.insurance_carrier || '',
        insurance_member_id: event.insurance_member_id || '',
    });

    React.useEffect(() => {
        setEditData({
            patient_name: event.patient_name || '',
            dob: event.patient_dob || '',
            insurance_carrier: event.insurance_carrier || '',
            insurance_member_id: event.insurance_member_id || '',
        });
        setIsEditing(false);
    }, [event]);

    const formatVal = (val: any) => val || "—";

    const handleDelete = async () => {
        setConfirming(true);
        try {
            await onDelete();
            toast.success("Clinical session deleted successfully");
            onClose();
        } catch (err) {
            toast.error("Failed to delete session");
        } finally {
            setConfirming(false);
        }
    };

    const handleConfirm = async () => {
        if (event.approval_status === 'CONFIRMED' || confirming) return;
        setConfirming(true);
        try {
            await onConfirm();
            toast.success("Appointment confirmed successfully");
        } catch (err) {
            toast.error("Failed to confirm appointment");
        } finally {
            setConfirming(false);
        }
    };

    const handleSaveUpdate = async () => {
        setConfirming(true);
        try {
            await onUpdate(event.id, {
                patient_name: editData.patient_name,
                dob: editData.dob, // The service maps 'dob' to 'patient_dob'
                insurance: editData.insurance_carrier, // The service maps 'insurance' to 'insurance_carrier'
                member_id: editData.insurance_member_id, // The service maps 'member_id' to 'insurance_member_id'
            } as any);
            toast.success("Event updated successfully");
            setIsEditing(false);
        } catch (err) {
            toast.error("Failed to update event");
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className={cn(
            "bg-white border-l border-border/25 flex flex-col animate-in slide-in-from-right-4 duration-300 shadow-[-18px_0_60px_rgba(15,23,42,0.08)]",
            className || "fixed inset-y-0 right-0 w-[420px] z-[60]"
        )}>
            <div className="px-8 py-6 border-b border-slate-200/40 bg-white/80 relative z-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">Session details</h2>
                    <div className="flex items-center gap-2">
                        {!isEditing && event.status === 'booked' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1.5 hover:bg-slate-100 rounded-full text-[11px] font-bold text-primary transition-all active:scale-95 border border-primary/20 hover:border-primary/40"
                            >
                                Edit
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-800 active:scale-90 border border-transparent hover:border-slate-200/60">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 no-scrollbar pb-32">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold tracking-tight border shadow-sm shadow-black/[0.01]",
                        event.status === 'booked'
                            ? (event.approval_status === 'PENDING' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20')
                            : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                    )}>
                        {event.status === 'booked'
                            ? (event.approval_status === 'PENDING' ? 'Pending Approval' : 'Confirmed')
                            : 'Cancelled'}
                    </div>
                    {event.source === 'ai_voice' && (
                        <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-tight border bg-indigo-500/10 text-indigo-700 border-indigo-500/20 shadow-sm shadow-indigo-500/5">
                            AI booked
                        </div>
                    )}
                </div>

                <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={13} className="text-slate-500" />
                        <h3 className="text-[11px] font-bold text-slate-500 tracking-[0.05em] uppercase">Schedule</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl shadow-sm shadow-black/[0.01]">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Start time</p>
                            <p className="text-[16px] font-bold text-slate-900 tracking-tight">{format(new Date(event.start_at), "h:mm a")}</p>
                            <p className="text-[12px] text-slate-600 font-semibold mt-0.5">{format(new Date(event.start_at), "MMM d, yyyy")}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl shadow-sm shadow-black/[0.01]">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">End time</p>
                            <p className="text-[16px] font-bold text-slate-900 tracking-tight">{format(new Date(event.end_at), "h:mm a")}</p>
                            <p className="text-[12px] text-slate-600 font-semibold mt-0.5">{format(new Date(event.end_at), "MMM d, yyyy")}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 mb-4">
                        <User size={13} className="text-slate-500" />
                        <h3 className="text-[11px] font-bold text-slate-500 tracking-[0.05em] uppercase">Patient context</h3>
                    </div>
                    <div className="bg-white/60 rounded-2xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden shadow-sm shadow-black/[0.01]">
                        {isEditing ? (
                            <div className="p-4 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full name</label>
                                    <input
                                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        value={editData.patient_name}
                                        onChange={(e) => setEditData({ ...editData, patient_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of birth</label>
                                    <input
                                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        value={editData.dob}
                                        placeholder="MM/DD/YYYY"
                                        onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            [
                                {
                                    label: 'Full name',
                                    value: `${event.patient_first_name || ''} ${event.patient_last_name || ''}`.trim() || event.patient_name,
                                },
                                { label: 'Date of birth', value: event.patient_dob },
                                { label: 'Identity suffix', value: event.patient_last4 ? `**** **** **** ${event.patient_last4}` : '—' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 group hover:bg-slate-50 transition-colors">
                                    <span className="text-[12px] font-semibold text-slate-500">{item.label}</span>
                                    <span className="text-[13px] font-bold text-slate-800">{formatVal(item.value)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={13} className="text-slate-500" />
                        <h3 className="text-[11px] font-bold text-slate-500 tracking-[0.05em] uppercase">Coverage details</h3>
                    </div>
                    <div className="bg-white/60 rounded-2xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden shadow-sm shadow-black/[0.01]">
                        {isEditing ? (
                            <div className="p-4 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Carrier</label>
                                    <input
                                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        value={editData.insurance_carrier}
                                        onChange={(e) => setEditData({ ...editData, insurance_carrier: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Member identity</label>
                                    <input
                                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        value={editData.insurance_member_id}
                                        onChange={(e) => setEditData({ ...editData, insurance_member_id: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            [
                                { label: 'Carrier', value: event.insurance_carrier },
                                { label: 'Member identity', value: event.insurance_member_id }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <span className="text-[12px] font-semibold text-slate-500">{item.label}</span>
                                    <span className="text-[13px] font-bold text-slate-800">{formatVal(item.value)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Sticky Footer for actions */}
            {event.status === 'booked' && (
                <div className="absolute bottom-0 inset-x-0 p-8 pt-4 bg-gradient-to-t from-white via-white/95 to-transparent border-t border-border/10 flex flex-col gap-3">
                    {isEditing ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="h-12 px-4 bg-white text-slate-500 font-bold rounded-full text-[13px] border border-border/30 transition-all hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveUpdate}
                                disabled={confirming}
                                className="h-12 px-4 bg-primary text-white font-bold rounded-full text-[13px] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {confirming && <Loader2 size={14} className="animate-spin" />}
                                Save changes
                            </button>
                        </div>
                    ) : (
                        <>
                            {event.approval_status === 'PENDING' && !isDeleting && (
                                <button
                                    onClick={handleConfirm}
                                    disabled={confirming}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/20 text-white font-bold h-12 rounded-full transition-all text-[13px] active:scale-[0.98]"
                                >
                                    {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Confirm clinical session
                                </button>
                            )}
                            {!isDeleting ? (
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="w-full flex items-center justify-center gap-2 bg-rose-500/[0.08] hover:bg-rose-500 shadow-sm shadow-black/[0.02] hover:text-white text-rose-600 font-semibold h-12 rounded-full transition-all text-[13px] border border-rose-500/10 hover:border-rose-500 active:scale-[0.98]"
                                >
                                    <Trash2 size={14} /> Void clinical session
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300 bg-rose-500/[0.03] p-6 rounded-2xl border border-rose-500/10">
                                    <p className="text-[14px] font-bold text-rose-600 tracking-tight text-center">Are you sure you want to delete this session?</p>
                                    <p className="text-[12px] text-slate-500 text-center font-medium leading-relaxed">
                                        This action is permanent and will remove the clinical appointment from all registries.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <button
                                            onClick={() => setIsDeleting(false)}
                                            disabled={confirming}
                                            className="h-11 px-4 bg-white text-slate-500 font-bold rounded-xl text-[12px] border border-border/30 transition-all hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            No, keep it
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={confirming}
                                            className="h-11 px-4 bg-rose-500 text-white font-bold rounded-xl text-[12px] shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {confirming ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            Yes, delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
