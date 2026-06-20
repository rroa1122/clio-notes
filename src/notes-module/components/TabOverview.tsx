import React from 'react';
import { StructuredNote } from '../lib/storage';
import { User, Building2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import KeyValueGrid from './KeyValueGrid';

interface TabOverviewProps {
    data: StructuredNote;
}

const TabOverview: React.FC<TabOverviewProps> = ({ data }) => {
    const {
        meta = {} as any,
        patient = {} as any,
        facility = {} as any,
        provider = {} as any,
        appointment = {} as any
    } = data || {};

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Warnings Summary */}
            {(meta.missing_critical_fields?.length ?? 0) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-amber-900">Missing Critical Fields</p>
                        <div className="flex flex-wrap gap-2">
                            {meta.missing_critical_fields?.map((field: string) => (
                                <span key={field} className="bg-amber-100/50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                                    {field.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Patient Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                            <User size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Client Demographics</h3>
                    </div>
                    <div className="p-6">
                        <KeyValueGrid data={patient} />
                    </div>
                </div>

                {/* Provider & Facility Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Building2 size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Provider & Facility</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Facility Info</h4>
                            <KeyValueGrid data={facility || {}} />
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Provider Info</h4>
                            <KeyValueGrid data={provider} />
                        </div>
                    </div>
                </div>

                {/* Appointment Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Calendar size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Visit Details</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <KeyValueGrid data={{
                            date_of_service: appointment?.date_of_service,
                            start_time: appointment?.start_time,
                            location: appointment?.location,
                            chief_complaint: appointment?.chief_complaint
                        }} />
                        {appointment?.reason_for_appointment && (
                            <div className="pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Reason for Appointment</label>
                                <div className="flex flex-wrap gap-2">
                                    {appointment.reason_for_appointment.map((reason: string) => (
                                        <span key={reason} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta & Compliance Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
                            <ShieldCheck size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Compliance & Meta</h3>
                    </div>
                    <div className="p-6">
                        <KeyValueGrid data={{
                            note_type: meta.note_type,
                            encounter_mode: meta.encounter_mode,
                            hipaa_telehealth_consent: meta.hipaa_telehealth_consent,
                            confidence_overall: meta.confidence_overall ? `${(meta.confidence_overall * 100).toFixed(0)}%` : null
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabOverview;
