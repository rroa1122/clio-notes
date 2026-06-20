
import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CalendarEvent } from '../../services/calendarService';
import { format, parseISO } from 'date-fns';

interface CreateEventModalProps {
    onClose: () => void;
    onCreate: (event: Partial<CalendarEvent>) => Promise<void>;
    initialDate?: Date;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onCreate, initialDate }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        patient_name: '',
        patient_id: '',
        dob: '',
        insurance: '',
        member_id: '',
        visit_type: 'Follow-up',
        start_at: initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        duration_mins: '30'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const start = parseISO(formData.start_at);
            const end = new Date(start.getTime() + parseInt(formData.duration_mins) * 60000);

            await onCreate({
                patient_name: formData.patient_name,
                patient_id: formData.patient_id,
                patient_dob: formData.dob,
                insurance_carrier: formData.insurance,
                insurance_member_id: formData.member_id,
                visit_type: formData.visit_type,
                start_at: start.toISOString(),
                end_at: end.toISOString()
            });
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white border border-border/25 rounded-2xl w-full max-w-lg shadow-[0_18px_60px_rgba(15,23,42,0.18)] relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">New appointment</h2>
                            <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-wider">Manual schedule entry</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-800 active:scale-95 border border-transparent hover:border-slate-200/60">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Start time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold [color-scheme:light]"
                                    value={formData.start_at}
                                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Duration (mins)</label>
                                <select
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold appearance-none"
                                    value={formData.duration_mins}
                                    onChange={(e) => setFormData({ ...formData, duration_mins: e.target.value })}
                                >
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-3 space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Patient full name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold"
                                    placeholder="John Doe"
                                    value={formData.patient_name}
                                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Visit Type</label>
                                <select
                                    required
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold appearance-none"
                                    value={formData.visit_type}
                                    onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                                >
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="New Patient">New Patient</option>
                                    <option value="Procedure">Procedure</option>
                                    <option value="Consultation">Consultation</option>
                                    <option value="Hygiene">Hygiene</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Patient ID / Ref</label>
                                <input
                                    type="text"
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold"
                                    placeholder="P-12345"
                                    value={formData.patient_id}
                                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Date of birth</label>
                                <input
                                    type="text"
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold"
                                    placeholder="MM/DD/YYYY"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Insurance carrier</label>
                                <input
                                    type="text"
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold"
                                    placeholder="e.g. Aetna"
                                    value={formData.insurance}
                                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-wider">Member ID</label>
                                <input
                                    type="text"
                                    className="w-full h-10 bg-white border border-slate-200/60 rounded-xl px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-bold"
                                    placeholder="XYZ-789"
                                    value={formData.member_id}
                                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary/95 hover:bg-primary text-white font-bold h-12 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.20)] transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-tight"
                            >
                                {loading ? 'Processing...' : 'Schedule appointment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
