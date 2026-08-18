import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mic, Square, Play, Trash2, AlertCircle, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AudioData = {
    blob: Blob;
    url: string;
    mimeType: string;
    duration: number;
    size: number;
};

export interface RecorderCardProps {
    onAudioReady: (data: AudioData) => void;
    onDiscard: () => void;
    className?: string;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'];
    for (const type of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
};

export function RecorderCard({ onAudioReady, onDiscard, className }: RecorderCardProps) {
    const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'stopped' | 'error'>('idle');
    const [timer, setTimer] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recordedData, setRecordedData] = useState<AudioData | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        if (timerIntervalRef.current) {
            window.clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
    }, [audioUrl]);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const startRecording = async () => {
        setError(null);
        setStatus('requesting');
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const mimeTypeActual = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, { type: mimeTypeActual });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                const data: AudioData = {
                    blob,
                    url,
                    mimeType: mimeTypeActual,
                    duration: timer,
                    size: blob.size
                };
                setRecordedData(data);
                setStatus('stopped');
            };

            mediaRecorder.start();
            setStatus('recording');
            setTimer(0);
            timerIntervalRef.current = window.setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            console.error('Error accessing microphone:', err);
            setError(err.name === 'NotAllowedError'
                ? 'Microphone permission denied. Please enable microphone access in your browser settings.'
                : 'Could not access microphone. Please ensure your microphone is connected and try again.');
            setStatus('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && (status === 'recording' || status === 'requesting')) {
            mediaRecorderRef.current.stop();
            if (timerIntervalRef.current) {
                window.clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    };

    const handleDiscard = () => {
        cleanup();
        setAudioUrl(null);
        setRecordedData(null);
        setTimer(0);
        setStatus('idle');
        onDiscard();
    };

    const handleUseRecording = () => {
        if (recordedData) {
            onAudioReady(recordedData);
        }
    };

    return (
        <Card className={cn("w-full max-w-md mx-auto overflow-hidden border-border/80 dark:border-border/60 bg-card/95 dark:bg-card/85 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/40 rounded-2xl transition-all duration-300", className)}>
            <CardHeader className="bg-muted/30 dark:bg-muted/15 border-b border-border/60 px-5 py-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground tracking-tight">
                        <span className={cn(
                            "relative flex size-2.5 rounded-full",
                            status === 'recording' ? "bg-red-500" : status === 'stopped' ? "bg-emerald-500" : "bg-primary"
                        )}>
                            {status === 'recording' && (
                                <span className="absolute -inset-0.5 rounded-full bg-red-500 animate-ping opacity-75" />
                            )}
                        </span>
                        <Mic className={cn(
                            "size-4.5 transition-colors",
                            status === 'recording' ? "text-red-500" : "text-muted-foreground"
                        )} />
                        <span>Clinical Audio Recorder</span>
                    </CardTitle>

                    {/* Status Pill Badge */}
                    {status === 'recording' ? (
                        <Badge variant="destructive" className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase animate-pulse shadow-sm">
                            <span className="size-1.5 rounded-full bg-white animate-ping" />
                            REC
                        </Badge>
                    ) : status === 'stopped' ? (
                        <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            READY
                        </Badge>
                    ) : status === 'requesting' ? (
                        <Badge variant="secondary" className="text-[10px] font-medium animate-pulse">
                            CONNECTING...
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="text-[10px] font-medium text-muted-foreground">
                            STANDBY
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Main Visualizer Stage */}
                <div className={cn(
                    "relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border transition-all duration-300 overflow-hidden",
                    status === 'recording'
                        ? "bg-red-500/[0.03] dark:bg-red-500/[0.06] border-red-500/30 shadow-inner"
                        : "bg-muted/25 dark:bg-muted/10 border-dashed border-border/70 dark:border-border/50"
                )}>
                    {/* IDLE STATE */}
                    {status === 'idle' && (
                        <div className="text-center space-y-3.5 py-2">
                            <div className="group/idle relative size-20 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-indigo-500/10 dark:from-primary/20 dark:to-indigo-500/20 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-xs transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-primary/10">
                                <Mic className="size-9 text-primary transition-transform duration-300 group-hover/idle:scale-110 stroke-[2]" />
                                <div className="absolute inset-0 rounded-2xl bg-primary/10 opacity-0 group-hover/idle:opacity-100 blur-sm transition-opacity" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-foreground tracking-tight">Ready to Record</h3>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    Click start below to begin capturing your clinical encounter audio.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* RECORDING OR REQUESTING STATE */}
                    {(status === 'recording' || status === 'requesting') && (
                        <div className="text-center space-y-4 py-2 w-full">
                            {/* Ambient Glowing Pulsing Ring Container */}
                            <div className="relative flex items-center justify-center my-2">
                                {/* Layer 1: Ambient Outer Glow Bloom */}
                                <div className="absolute -inset-6 rounded-full bg-red-500/15 dark:bg-red-500/25 blur-xl animate-pulse pointer-events-none" />

                                {/* Layer 2: Expanding Radar / Ripple Ping Ring */}
                                <div className="absolute -inset-3 rounded-full border-2 border-red-500/40 dark:border-red-500/50 animate-ping pointer-events-none duration-1000" />

                                {/* Layer 3: Secondary Pulsing Glow Ring */}
                                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-red-500/30 via-rose-500/20 to-red-600/30 animate-pulse blur-xs pointer-events-none" />

                                {/* Layer 4: Central Recording Indicator */}
                                <div className="relative size-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-xl shadow-red-500/35 ring-4 ring-red-500/20 dark:ring-red-400/20 transition-transform duration-300">
                                    <Mic className="size-9 text-white animate-pulse stroke-[2.25]" />
                                </div>

                                {/* Floating REC Badge */}
                                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-md shadow-red-600/40 border border-white/20">
                                    <span className="size-1.5 rounded-full bg-white animate-ping" />
                                    REC
                                </div>
                            </div>

                            {/* Simulated equalizer visualizer wave bars */}
                            <div className="flex items-center justify-center gap-1.5 h-6 py-1">
                                {[40, 75, 100, 60, 90, 50, 80].map((height, i) => (
                                    <span
                                        key={i}
                                        className="w-1 bg-red-500/80 dark:bg-red-400/80 rounded-full transition-all duration-300 animate-pulse"
                                        style={{
                                            height: `${status === 'recording' ? height : 30}%`,
                                            animationDelay: `${i * 120}ms`,
                                            animationDuration: '800ms'
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Monospace Typography Timer Display */}
                            <div className="space-y-1">
                                <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight tabular-nums text-foreground drop-shadow-xs">
                                    {formatTime(timer)}
                                </div>
                                <p className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
                                    {status === 'requesting' ? (
                                        <>
                                            <Loader2 className="size-3.5 animate-spin text-primary" />
                                            <span>Requesting microphone access...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                                            <span>Recording session in progress...</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STOPPED / COMPLETED STATE */}
                    {status === 'stopped' && audioUrl && (
                        <div className="w-full space-y-5 py-1">
                            <div className="text-center space-y-2.5">
                                <div className="size-16 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                                    <Play className="size-7 fill-emerald-600/30 dark:fill-emerald-400/30 stroke-[2.25]" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold text-foreground tracking-tight">Recording Complete</h3>
                                    <div className="flex items-center justify-center gap-2 text-xs">
                                        <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground/90 border border-border/60">
                                            {formatTime(timer)}
                                        </span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground/90 border border-border/60">
                                            {(recordedData?.size ? (recordedData.size / (1024 * 1024)).toFixed(2) : 0)} MB
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Styled Audio Player */}
                            <div className="p-3 bg-muted/50 dark:bg-muted/30 rounded-xl border border-border/60 shadow-inner">
                                <audio src={audioUrl} controls className="w-full h-9 rounded-lg focus:outline-none" />
                            </div>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {status === 'error' && (
                        <div className="text-center space-y-3.5 py-2">
                            <div className="size-16 rounded-2xl bg-destructive/15 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center justify-center mx-auto shadow-xs">
                                <AlertCircle className="size-8 stroke-[2]" />
                            </div>
                            <div className="space-y-1.5 px-3">
                                <h3 className="text-sm font-semibold text-destructive">Microphone Error</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                    <span>Microphone access required. Works best on modern browsers with HTTPS or localhost.</span>
                </div>
            </CardContent>

            <Separator className="border-border/60" />

            {/* Tactile Control Buttons Footer */}
            <CardFooter className="bg-muted/30 dark:bg-muted/15 p-4 flex justify-between gap-3">
                {status === 'idle' || status === 'error' ? (
                    <Button
                        onClick={startRecording}
                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 gap-2 group/btn"
                    >
                        {status === 'error' ? (
                            <>
                                <RefreshCw className="size-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                                <span>Try Again</span>
                            </>
                        ) : (
                            <>
                                <Mic className="size-4 group-hover/btn:scale-110 transition-transform duration-200" />
                                <span>Start Recording</span>
                            </>
                        )}
                    </Button>
                ) : status === 'recording' || status === 'requesting' ? (
                    <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold text-sm shadow-md shadow-red-600/30 hover:shadow-lg hover:shadow-red-600/40 active:scale-[0.98] transition-all duration-200 gap-2"
                    >
                        <Square className="size-4 fill-current" />
                        <span>Stop Recording</span>
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl border-border/80 hover:border-destructive/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all duration-200 gap-2 font-medium text-xs sm:text-sm group/discard"
                            onClick={handleDiscard}
                        >
                            <Trash2 className="size-4 group-hover/discard:rotate-12 transition-transform duration-200" />
                            <span>Discard</span>
                        </Button>
                        <Button
                            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 gap-2 group/use"
                            onClick={handleUseRecording}
                        >
                            <CheckCircle2 className="size-4 group-hover/use:scale-110 transition-transform duration-200" />
                            <span>Use Recording</span>
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}

