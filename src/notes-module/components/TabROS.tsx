import React from 'react';
import { StructuredNote } from '../lib/storage';
import { Brain, Search, Activity } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface TabROSProps {
    data: StructuredNote;
}

const TabROS: React.FC<TabROSProps> = ({ data }) => {
    const { psychiatric_symptoms_checklist, review_of_systems, vital_signs } = data;

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Vitals narrative if present */}
            {vital_signs?.narrative && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg">
                            <Activity size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Vital Signs</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{vital_signs.narrative}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Psychiatric Checklist */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Brain size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Psychiatric Checklist</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[10px]">Symptom</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[10px]">Status</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[10px]">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {psychiatric_symptoms_checklist?.map((item, idx) => (
                                    <tr key={idx} className={`${item.status === 'not_mentioned' ? 'opacity-60 grayscale-[0.5]' : ''} hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors`}>
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.name}</td>
                                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs italic">{item.details || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Review of Systems */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Search size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Review of Systems</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[10px]">System</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[10px]">Status</th>
                                    <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[10px]">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {review_of_systems?.map((item, idx) => (
                                    <tr key={idx} className={`${item.status === 'not_mentioned' ? 'opacity-60 grayscale-[0.5]' : ''} hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors`}>
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.system}</td>
                                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs italic">{item.details || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabROS;
