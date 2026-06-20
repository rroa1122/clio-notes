import React from 'react';
import { StructuredNote } from '../lib/storage';
import { BarChart3, ChevronRight } from 'lucide-react';

interface TabScreeningsProps {
    data: StructuredNote;
}

const TabScreenings: React.FC<TabScreeningsProps> = ({ data }) => {
    const { screenings } = data;

    const renderScreening = (title: string, screening: any) => {
        if (!screening) return null;

        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col h-full">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <BarChart3 size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                    </div>
                </div>
                <div className="p-6 space-y-6 flex-1">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Score</p>
                            <p className="text-3xl font-black text-[#1980e6]">{screening.total_score}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Interpretation</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{screening.interpretation}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Breakdown</p>
                        <div className="space-y-2">
                            {screening.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-3 text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-lg transition-colors group">
                                    <div className="shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-tight">{item.question}</p>
                                        <div className="flex items-center gap-1.5 mt-1 text-blue-600 dark:text-blue-400 font-bold">
                                            <ChevronRight size={14} />
                                            <span>{item.answer}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (!screenings?.gad7 && !screenings?.phq9) {
        return (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-2 animate-fadeIn">
                <BarChart3 className="mx-auto text-slate-300 dark:text-slate-700" size={48} />
                <p className="text-slate-500 font-medium">No standardized screenings detected in this encounter.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn pb-10">
            {renderScreening("GAD-7 (Anxiety)", screenings.gad7)}
            {renderScreening("PHQ-9 (Depression)", screenings.phq9)}
        </div>
    );
};

export default TabScreenings;
