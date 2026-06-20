import { useState } from 'react';
import { RecorderCard } from '@/notes-module/components/RecorderCard';
import type { AudioData } from '@/notes-module/components/RecorderCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileAudio, Info, ListChecks, History } from 'lucide-react';

export function NewNote() {
    const [selectedRecording, setSelectedRecording] = useState<AudioData | null>(null);

    const handleAudioReady = (data: AudioData) => {
        setSelectedRecording(data);
        // In a real app, we would store this in global state or context
        console.log('Audio ready for processing:', data);
    };

    const handleDiscard = () => {
        setSelectedRecording(null);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">New Medical Note</h1>
                <p className="text-muted-foreground">Record your session or dictated notes for AI processing.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <RecorderCard
                        onAudioReady={handleAudioReady}
                        onDiscard={handleDiscard}
                    />

                    {selectedRecording && (
                        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                                        <FileAudio className="h-4 w-4" />
                                        Selected Recording
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[10px] bg-background">Ready to Process</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Duration</p>
                                        <p className="text-sm font-medium">
                                            {Math.floor(selectedRecording.duration / 60)}:{(selectedRecording.duration % 60).toString().padStart(2, '0')}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Format</p>
                                        <p className="text-sm font-medium">{selectedRecording.mimeType.split(';')[0].replace('audio/', '')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Size</p>
                                        <p className="text-sm font-medium">{(selectedRecording.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Recorded On</p>
                                        <p className="text-sm font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-500" />
                                Instructions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4 text-muted-foreground">
                            <p>To ensure high transcription accuracy, please follow these guidelines:</p>
                            <ul className="space-y-3">
                                <li className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <ListChecks className="h-3 w-3 text-primary" />
                                    </div>
                                    <span>Speak clearly and at a normal pace.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <ListChecks className="h-3 w-3 text-primary" />
                                    </div>
                                    <span>Minimize background noise if possible.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <ListChecks className="h-3 w-3 text-primary" />
                                    </div>
                                    <span>Mention patient ID or name at the start for better indexing.</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2 font-medium">
                                <History className="h-4 w-4 text-muted-foreground" />
                                Recent Drafts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <History className="h-8 w-8 text-muted/20 mb-2" />
                                <p className="text-xs text-muted-foreground italic">No recent drafts found.<br />Start recording to create one.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
