import React from 'react';
import { Note } from '../lib/storage';
import { Mic, PenTool, CheckCircle2 } from 'lucide-react';

interface TabTranscriptProps {
    note: Note;
}

const TabTranscript: React.FC<TabTranscriptProps> = ({ note }) => {
    const { structured_note, transcript } = note;
    const signOff = structured_note?.sign_off;

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Transcript Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Mic size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Full Session Transcript</h3>
                </div>
                <div className="p-8">
                    {transcript ? (
                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap border border-slate-100 dark:border-slate-800 h-[500px] overflow-y-auto custom-scrollbar">
                            {transcript}
                        </div>
                    ) : (
                        <div className="text-center py-20 grayscale opacity-40">
                            <Mic size={48} className="mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-500 font-medium">No raw transcript available for this encounter.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sign-off Card */}
            {signOff && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <PenTool size={18} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Clinical Sign-off</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-full text-white">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Current Status</p>
                                        <p className="text-xl font-black text-emerald-900 dark:text-emerald-100 uppercase">{signOff.status}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Electronically Signed By</p>
                                        <p className="font-bold text-emerald-900 dark:text-emerald-100">{signOff.electronically_signed_by || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Date/Time</p>
                                        <p className="font-bold text-emerald-900 dark:text-emerald-100">{signOff.signed_date} {signOff.signed_time}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t md:border-t-0 md:border-l border-emerald-200 dark:border-emerald-800/50 pt-6 md:pt-0 md:pl-10 flex items-center justify-center">
                                <div className="text-center italic opacity-40 font-serif text-3xl text-emerald-900 dark:text-emerald-100 pointer-events-none select-none">
                                    {signOff.electronically_signed_by || "Dr. Reinier"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabTranscript;
