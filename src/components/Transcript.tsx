import { Search } from 'lucide-react';
import type { TranscriptLine } from '../data/mockData';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface TranscriptProps {
    segments: TranscriptLine[];
    callerName?: string;
}

export function Transcript({ segments, callerName }: TranscriptProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const getNameInitials = (name: string) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const callerDisplayName = callerName || 'Caller';
    const callerInitials = getNameInitials(callerDisplayName);

    const filteredSegments = (segments || []).filter(s =>
        (s.text || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card h-[600px] flex flex-col bg-white border border-slate-200/60 shadow-sm overflow-hidden ring-1 ring-black/[0.02]">
            {/* Transcript Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">Transcript</h3>
                    <div className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[10px] font-bold rounded-md border border-teal-100">
                        {filteredSegments.length} TURNS
                    </div>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={14} />
                    <input
                        type="text"
                        placeholder="Search dialogue..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                {filteredSegments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Search size={32} className="mb-2 opacity-20" />
                        <p className="text-sm font-medium">No dialogue matches your search</p>
                    </div>
                ) : (
                    filteredSegments.map((segment) => (
                        <div
                            key={segment.id}
                            className={cn(
                                "flex gap-4 group/msg animate-in fade-in slide-in-from-bottom-2 duration-500",
                                segment.speaker === 'CLIO' ? 'flex-row-reverse' : 'flex-row'
                            )}
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm transition-transform group-hover/msg:scale-110",
                                segment.speaker === 'CLIO'
                                    ? 'bg-[#1e293b] text-white'
                                    : 'bg-white text-slate-600 border border-slate-200'
                            )}>
                                {segment.speaker === 'CLIO' ? 'CLIO' : callerInitials}
                            </div>

                            {/* Bubble Context */}
                            <div className={cn(
                                "flex flex-col max-w-[75%]",
                                segment.speaker === 'CLIO' ? 'items-end' : 'items-start'
                            )}>
                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {segment.speaker === 'CLIO' ? 'CLIO AI' : callerDisplayName}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-300">
                                        {formatTime(segment.time)}
                                    </span>
                                </div>

                                <div className={cn(
                                    "p-4 rounded-3xl text-[13px] leading-relaxed shadow-sm transition-all group-hover/msg:shadow-md",
                                    segment.speaker === 'CLIO'
                                        ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 rounded-tr-none'
                                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/60'
                                )}>
                                    {segment.text}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
