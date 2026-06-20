import React from 'react';
import { StructuredNote } from '../lib/storage';
import { ClipboardList, MessageSquare, Clock } from 'lucide-react';
import DataTable from './DataTable';

interface TabAssessmentProps {
    data: StructuredNote;
}

const TabAssessment: React.FC<TabAssessmentProps> = ({ data }) => {
    const { assessments, treatment, follow_up } = data;

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Diagnosis / Assessments */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <ClipboardList size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Assessments / Diagnoses</h3>
                </div>
                <div className="p-4 sm:p-6 space-y-3">
                    {assessments && assessments.length > 0 ? (
                        assessments.map((item, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:border-blue-200 dark:hover:border-blue-900/50 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold text-[#1980e6] shadow-sm border border-slate-100 dark:border-slate-800">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">{item.diagnosis}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{item.icd10 || 'No ICD-10 Code'}</p>
                                    </div>
                                </div>
                                {item.primary && (
                                    <span className="mt-2 sm:mt-0 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-full self-start sm:self-center">
                                        Primary
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-400 italic text-sm text-center py-8">No formal assessments recorded.</p>
                    )}
                </div>
            </div>

            {/* Treatment & Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Medication Orders */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm lg:col-span-2">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <ClipboardList size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Medication Orders & Refills</h3>
                    </div>
                    <div className="p-6">
                        <DataTable
                            headers={['Name', 'Dose', 'Form', 'Route', 'Frequency', 'Sig', 'Duration', 'Quantity', 'Refills', 'Pharmacist Notes']}
                            rows={treatment?.medication_orders_or_refills || []}
                            emptyMessage="No new medication orders."
                        />
                    </div>
                </div>

                {/* Patient Education & Preventive */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <MessageSquare size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Education & Prevention</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Education</p>
                            {treatment?.patient_education && treatment.patient_education.length > 0 ? (
                                <ul className="space-y-2">
                                    {treatment.patient_education.map((item, idx) => (
                                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-2 shrink-0"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-xs text-slate-400 italic">None noted.</p>}
                        </div>
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preventive Medicine</p>
                            {treatment?.preventive_medicine && treatment.preventive_medicine.length > 0 ? (
                                <ul className="space-y-2">
                                    {treatment.preventive_medicine.map((item, idx) => (
                                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                                            <div className="w-1 h-1 rounded-full bg-emerald-400 mt-2 shrink-0"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-xs text-slate-400 italic">None noted.</p>}
                        </div>
                    </div>
                </div>

                {/* Plan Narrative */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                            <ClipboardList size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Recommendations & Plan</h3>
                    </div>
                    <div className="p-6">
                        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed italic border-l-4 border-[#1980e6] pl-4">
                            {treatment?.plan_recommendations_instructions || "No specific instructions provided."}
                        </div>
                    </div>
                </div>

                {/* Follow-up */}
                <div className="bg-[#1980e6] rounded-2xl border border-[#1570cc] overflow-hidden shadow-lg lg:col-span-2">
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl whitespace-nowrap h-fit">
                                <Clock size={24} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Follow-up Schedule</p>
                                <p className="text-2xl font-black">{follow_up?.interval || "As needed"}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 p-4 rounded-xl flex-1 backdrop-blur-sm border border-white/10">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Specific Instructions</p>
                            <p className="font-bold sm:text-lg">{follow_up?.instructions || "Continue treatment as discussed."}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabAssessment;
