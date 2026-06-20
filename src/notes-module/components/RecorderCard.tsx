import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mic, Square, Play, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AudioData = {
    blob: Blob;
    url: string;
    mimeType: string;
    duration: number;
    size: number;
};

interface RecorderCardProps {
    onAudioReady: (data: AudioData) => void;
    onDiscard: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
};

export function RecorderCard({ onAudioReady, onDiscard }: RecorderCardProps) {
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
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
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
                ? 'Microphone permission denied. Please enable it in your browser settings.'
                : 'Could not access microphone. Please ensure it is connected and try again.');
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
        <Card className="w-full max-w-md mx-auto overflow-hidden border-border/50 shadow-lg">
            <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Mic className={cn("h-5 w-5", status === 'recording' ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                    Audio Recorder
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border border-dashed border-border/60">
                    {status === 'idle' && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <Mic className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium">Ready to record</h3>
                                <p className="text-sm text-muted-foreground">Click start to begin capturing audio</p>
                            </div>
                        </div>
                    )}

                    {(status === 'recording' || status === 'requesting') && (
                        <div className="text-center space-y-4">
                            <div className="relative">
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <Mic className="h-10 w-10 text-red-500 animate-pulse" />
                                </div>
                                <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] animate-pulse">
                                    REC
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-mono font-bold tracking-tighter">
                                    {formatTime(timer)}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {status === 'requesting' ? 'Requesting mic...' : 'Recording in progress...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'stopped' && audioUrl && (
                        <div className="w-full space-y-4">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <Play className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="font-medium">Recording complete</h3>
                                <p className="text-xs text-muted-foreground">{formatTime(timer)} • {(recordedData?.size ? (recordedData.size / (1024 * 1024)).toFixed(2) : 0)} MB</p>
                            </div>
                            <div className="pt-2">
                                <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                            <div className="space-y-1 px-4">
                                <h3 className="font-medium text-red-600">Recording Error</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-[10px] text-center text-muted-foreground">
                    Recording requires microphone permission. Works best on HTTPS (localhost is OK).
                </div>
            </CardContent>
            <Separator />
            <CardFooter className="bg-muted/30 p-4 flex justify-between gap-3">
                {status === 'idle' || status === 'error' ? (
                    <Button
                        onClick={startRecording}
                        className="w-full gap-2"
                        disabled={false}
                    >
                        {status === 'error' ? <RefreshCw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {status === 'error' ? 'Try Again' : 'Start Recording'}
                    </Button>
                ) : status === 'recording' ? (
                    <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="w-full gap-2"
                    >
                        <Square className="h-4 w-4 fill-current" />
                        Stop Recording
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-950/20"
                            onClick={handleDiscard}
                        >
                            <Trash2 className="h-4 w-4" />
                            Discard
                        </Button>
                        <Button
                            className="flex-1 gap-2"
                            onClick={handleUseRecording}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Use Recording
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}

function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
