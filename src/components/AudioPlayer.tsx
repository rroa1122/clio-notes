import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useCalls } from '../context/CallsContext';
import { cn } from '../lib/utils';

export function AudioPlayer() {
    const { id } = useParams();
    const { calls } = useCalls();
    const call = calls.find(c => c.id === id);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            const current = audio.currentTime;
            const duration = audio.duration || 1;
            setProgress((current / duration) * 100);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => setIsPlaying(false));
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
        };
    }, []);

    return (
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-2xl border border-white/5 group">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-[100px] pointer-events-none transition-all duration-1000 group-hover:bg-emerald-500/30" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none transition-all duration-1000 group-hover:bg-blue-500/20" />

            <div className="relative z-10 flex flex-col space-y-6">
                {/* Header Area */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Recording Workspace</h3>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-tighter">
                            {progress.toFixed(1)}% ANALYZED
                        </span>
                    </div>
                </div>

                {/* Main Visualization Workspace */}
                <div className="relative h-24 flex items-center justify-center gap-[3px] px-2 bg-black/20 rounded-2xl border border-white/5 py-4">
                    {Array.from({ length: 80 }).map((_, i) => {
                        const seed = (i * 0.3) + (progress * 0.1);
                        const baseHeight = 15 + Math.sin(seed) * 10;
                        const randomFactor = Math.abs(Math.sin(i * 1.5)) * 40;
                        const height = baseHeight + randomFactor;
                        const isActive = (i / 80) * 100 <= progress;

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 rounded-full transition-all duration-500 ease-out",
                                    isActive
                                        ? "bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                                        : "bg-slate-800"
                                )}
                                style={{
                                    height: `${height}%`,
                                    opacity: isActive ? 1 : 0.4
                                }}
                            />
                        );
                    })}
                </div>

                {/* Control Hub Area */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-6">
                        <button className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                            <SkipBack size={20} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className={cn(
                                "h-14 w-14 flex items-center justify-center rounded-2xl transition-all shadow-xl group/btn",
                                isPlaying
                                    ? "bg-white text-slate-950 hover:bg-slate-100"
                                    : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20"
                            )}
                        >
                            {isPlaying
                                ? <Pause size={24} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" />
                                : <Play size={24} fill="currentColor" className="ml-1 group-hover/btn:scale-110 transition-transform" />
                            }
                        </button>

                        <button className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                            <SkipForward size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 group/vol">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Volumen</span>
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-3/4 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                            </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 group-hover/vol:text-white group-hover/vol:bg-white/10 transition-all cursor-pointer">
                            <Volume2 size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={call?.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
            />
        </div>
    );
}
