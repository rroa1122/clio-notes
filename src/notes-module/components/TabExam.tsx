import React from 'react';
import { StructuredNote } from '../lib/storage';
import { BrainCircuit, Stethoscope } from 'lucide-react';
import KeyValueGrid from './KeyValueGrid';

interface TabExamProps {
    data: StructuredNote;
}

const TabExam: React.FC<TabExamProps> = ({ data }) => {
    const { exam } = data;

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Psychiatry MSE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
                        <BrainCircuit size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Psychiatry MSE (Mental Status Exam)</h3>
                </div>
                <div className="p-6">
                    <KeyValueGrid data={exam.psychiatry_mse || {}} columns={3} />
                </div>
            </div>

            {/* Physical Exam */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Stethoscope size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Physical Exam</h3>
                </div>
                <div className="p-6">
                    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {exam.physical_exam.narrative}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabExam;
