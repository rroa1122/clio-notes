import React from 'react';
import { StructuredNote } from '../lib/storage';
import { FileText, ListChecks } from 'lucide-react';
import KeyValueGrid from './KeyValueGrid';

interface TabHPIProps {
    data: StructuredNote;
}

const TabHPI: React.FC<TabHPIProps> = ({ data }) => {
    const { history_of_present_illness } = data;

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Main Narrative Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FileText size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Narrative HPI</h3>
                </div>
                <div className="p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-lg leading-relaxed whitespace-pre-wrap font-serif">
                        {history_of_present_illness?.narrative}
                    </div>
                </div>
            </div>

            {/* Detailed Factors Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <ListChecks size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Clinician Details</h3>
                </div>
                <div className="p-6">
                    <KeyValueGrid
                        data={{
                            presenting_problem: history_of_present_illness?.presenting_problem,
                            duration: history_of_present_illness?.duration,
                            onset: history_of_present_illness?.onset,
                            severity: history_of_present_illness?.severity,
                            context: history_of_present_illness?.context,
                            associated_symptoms: history_of_present_illness?.associated_symptoms,
                            relieving_factors: history_of_present_illness?.relieving_factors,
                            worsening_factors: history_of_present_illness?.worsening_factors,
                            patient_goals: history_of_present_illness?.patient_goals_or_requests,
                            collateral_info: history_of_present_illness?.collateral_information
                        }}
                        columns={2}
                    />
                </div>
            </div>
        </div>
    );
};

export default TabHPI;
