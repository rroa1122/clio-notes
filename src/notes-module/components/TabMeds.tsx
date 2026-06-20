import React from 'react';
import { StructuredNote } from '../lib/storage';
import { Pill, AlertTriangle, Hospital } from 'lucide-react';
import DataTable from './DataTable';

interface TabMedsProps {
    data: StructuredNote;
}

const TabMeds: React.FC<TabMedsProps> = ({ data }) => {
    const { current_medications, allergies, hospitalizations } = data;

    const medHeaders = ['Name', 'Dose', 'Form', 'Route', 'Frequency', 'Sig', 'Duration', 'Quantity', 'Refills', 'Pharmacist Notes'];

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Medications Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Pill size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Current Medications</h3>
                </div>
                <div className="p-6">
                    <DataTable
                        headers={medHeaders}
                        rows={current_medications || []}
                        emptyMessage="No active medications reported."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Allergies Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">
                            <AlertTriangle size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Allergies</h3>
                    </div>
                    <div className="p-6">
                        {allergies && allergies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {allergies.map(allergy => (
                                    <span key={allergy} className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg text-sm font-bold border border-amber-100 dark:border-amber-500/20">
                                        {allergy}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-sm text-center py-4 border border-dashed rounded-xl">No known allergies (NKDA)</p>
                        )}
                    </div>
                </div>

                {/* Hospitalizations Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
                            <Hospital size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Hospitalizations</h3>
                    </div>
                    <div className="p-6">
                        {hospitalizations && hospitalizations.length > 0 ? (
                            <ul className="space-y-2">
                                {hospitalizations.map((item, idx) => (
                                    <li key={idx} className="flex gap-2 items-start text-sm text-slate-700 dark:text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 shrink-0"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-400 italic text-sm text-center py-4 border border-dashed rounded-xl">No prior hospitalizations reported.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabMeds;
