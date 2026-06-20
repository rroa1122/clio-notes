
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mic, FileCheck, Loader2, AlertCircle, RefreshCw, Pause, Play, ChevronsUpDown, User, Upload, CheckCircle2, Sparkles, FileText, ClipboardList, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PDFService } from '../lib/PDFService';
import type { PDFResponse, ClinicalNoteData } from '../lib/PDFService';
import { NotePrintPreview } from '../components/NotePrintPreview';
import { ClioNoteViewer } from '../components/ClioNoteViewer';
import { normalizeClioNote } from '../lib/clioUtils';
import { storage } from '../lib/storage';
import type { Template } from '../lib/storage';
import type { ClioNote } from '../types';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';

const Record: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    useTheme();

    // Core State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);

    // Process State
    const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'processing' | 'done'>('idle');
    const [isPaused, setIsPaused] = useState(false);
    const [isNoteUnsaved, setIsNoteUnsaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingFromHistory, setIsLoadingFromHistory] = useState(false);

    // Data State
    const [patientInfo, setPatientInfo] = useState({
        name: '',
        dob: '',
        context: ''
    });
    const [pdfResponse, setPdfResponse] = useState<PDFResponse | null>(null);
    const [clioNote, setClioNote] = useState<ClioNote | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(storage.getActiveTemplateId());
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const fetched = await storage.getTemplates();
                setTemplates(fetched);
                const activeId = storage.getActiveTemplateId();
                if (fetched.some(t => t.id === activeId)) {
                    setSelectedTemplateId(activeId);
                } else if (fetched.length > 0) {
                    setSelectedTemplateId(fetched[0].id);
                }
            } catch (err) {
                console.error("Failed to load templates in Record:", err);
            } finally {
                setIsTemplatesLoading(false);
            }
        };
        loadTemplates();
    }, []);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const id = searchParams.get('id');
        if (id && !pdfResponse && !isLoadingFromHistory) {
            loadNoteFromHistory(id);
        } else if (!id && (status === 'done' || pdfResponse)) {
            handleReset();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [searchParams]);

    const isPausedRef = useRef(false);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        (window as any).__CLIO_DIRTY = isNoteUnsaved;
        return () => { (window as any).__CLIO_DIRTY = false; };
    }, [isNoteUnsaved]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isNoteUnsaved) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isNoteUnsaved]);

    useEffect(() => {
        const handleGlobalReset = () => {
            handleReset();
        };
        window.addEventListener('clio-reset-workspace', handleGlobalReset);
        return () => window.removeEventListener('clio-reset-workspace', handleGlobalReset);
    }, [audioUrl, isNoteUnsaved]);

    const loadNoteFromHistory = async (id: string) => {
        setIsLoadingFromHistory(true);
        try {
            const note = await storage.getNote(id);
            if (note) {
                setPdfResponse({
                    mode: 'url',
                    url: note.pdf_url || '',
                    data: {
                        patient_name: note.patient_name,
                        patient_dob: note.patient_dob,
                        ...note
                    } as any
                });

                const normalized = normalizeClioNote(note.rawResponse || note.structured_note || note);
                if (normalized && typeof normalized === 'object') {
                    // Recover template_id from history if it exists
                    if (!normalized.meta) (normalized as any).meta = {};
                    if (!normalized.meta?.template_id && (note as any).template_id) {
                        normalized.meta.template_id = (note as any).template_id;
                    }
                    setClioNote(normalized);
                }

                setStatus('done');
            }
        } catch (err) {
            console.error("Failed to load note from history:", err);
            setError("Could not load note from history.");
        } finally {
            setIsLoadingFromHistory(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : MediaRecorder.isTypeSupported('audio/ogg')
                    ? 'audio/ogg'
                    : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);
            setStatus('recording');
            setIsNoteUnsaved(true);
            setTimer(0);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                if (!isPausedRef.current) {
                    setTimer(prev => prev + 1);
                }
            }, 1000);
        } catch (err) {
            console.error('Mic error:', err);
            setError('Microphone access denied or unavailable.');
            toast.error('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsPaused(false);
            setStatus('idle');
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && status === 'recording' && !isPaused) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && status === 'recording' && isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioBlob(file);
            setAudioUrl(URL.createObjectURL(file));
            setIsNoteUnsaved(true);
            toast.success('Audio file imported successfully');
        }
    };

    const sendToGenerate = async () => {
        if (!audioBlob) return;
        if (!user) {
            toast.error('Session expired. Please log in again.');
            return;
        }

        const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
        const isTcm = selectedTemplateId === 'tcm_progress_note';

        setStatus('uploading');
        setError(null);
        setPdfResponse(null);

        const formData = new FormData();
        const audioFieldName = isTcm ? 'audio' : 'text';
        formData.append(audioFieldName, audioBlob, 'encounter_audio.' + (audioBlob.type.split('/')[1] || 'webm'));

        if (isTcm) {
            formData.append('template_id', 'tcm_progress_note');
            if (patientInfo.name) formData.append('patient_name', patientInfo.name);
            if (patientInfo.dob) formData.append('patient_dob', patientInfo.dob);
            if (patientInfo.context) formData.append('context', patientInfo.context);
        } else {
            const bodyData = {
                patient_name: patientInfo.name,
                patient_dob: patientInfo.dob,
                context: patientInfo.context,
                template_text: currentTemplate.content,
                template_id: currentTemplate.id,
                template_version: currentTemplate.version,
                provider_name: user?.name
            };
            formData.append('body', JSON.stringify(bodyData));
        }

        formData.append('user_id', user.id);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const result = await PDFService.generatePDF(formData, { template_id: selectedTemplateId }, controller.signal);
            clearTimeout(timeoutId);

            // Validation for TCM
            if (isTcm && result.data && result.data.template_id !== 'tcm_progress_note') {
                const errorMsg = 'Template mismatch: expected tcm_progress_note';
                setError(errorMsg);
                setStatus('idle');
                toast.error(errorMsg);
                return;
            }

            setPdfResponse(result);
            const normalized = normalizeClioNote(result.data);
            if (normalized && typeof normalized === 'object') {
                // Ensure template_id from generation is persisted in UI state
                if (!normalized.meta) (normalized as any).meta = {};
                normalized.meta.template_id = selectedTemplateId;
                setClioNote(normalized);
            }

            setStatus('done');
            if (result.data?.id) {
                setSearchParams({ id: result.data.id });
            }
            toast.success('Documentation Ready');
        } catch (err: any) {
            console.error('GenerateNote error:', err);
            let errorMessage = 'Could not generate document. Please try again.';
            if (err.name === 'AbortError') errorMessage = 'Request timed out (180s).';
            setError(errorMessage);
            setStatus('idle');
            toast.error(errorMessage);
        }
    };

    const handleRegenerate = async (updatedData: ClinicalNoteData) => {
        try {
            toast.loading("Regenerating PDF...");
            const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
            const result = await PDFService.regeneratePDF({
                ...updatedData,
                user_id: user?.id,
                context: patientInfo.context,
                template_text: currentTemplate.content
            });
            setPdfResponse(result);
            toast.dismiss();
            toast.success("Note Updated!");
        } catch (err) {
            toast.dismiss();
            toast.error("Failed to regenerate");
            throw err;
        }
    };

    const handleReset = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setPdfResponse(null);
        setClioNote(null);
        setStatus('idle');
        setPatientInfo({ name: '', dob: '', context: '' });
        setAudioBlob(null);
        setAudioUrl(null);
        setError(null);
        setSearchParams({});
        setIsNoteUnsaved(false);
    };

    if (isLoadingFromHistory) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
                <div className="size-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                    <Loader2 className="animate-spin text-primary/60" size={24} />
                </div>
                <p className="text-sm font-semibold tracking-tight text-slate-600">Synchronizing clinical record...</p>
            </div>
        );
    }

    if (status === 'done' && pdfResponse) {
        return (
            <div className="clio-notes-new fixed inset-0 z-[100] flex flex-col bg-slate-900/40 p-4 md:p-8 animate-in fade-in duration-500 overflow-hidden">
                {/* Decorative Background Layer */}
                <div className="absolute inset-0 -z-10 bg-white/95" />

                <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (isNoteUnsaved && !window.confirm("Discard current note and start new session?")) return;
                                handleReset();
                            }}
                            className="rounded-xl font-bold tracking-tight gap-2 h-10 border-slate-200/60 bg-white shadow-sm hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4 text-slate-500" />
                            New Acquisition Session
                        </Button>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-bold border-emerald-500/20 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">
                                Validation Mode
                            </Badge>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-2 custom-scrollbar relative">
                        {isTemplatesLoading && (
                            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        )}
                        {clioNote ? (
                            <div className="py-4 px-2 md:px-0">
                                <ClioNoteViewer
                                    note={clioNote}
                                    onSaveComplete={(saved) => setIsNoteUnsaved(!saved)}
                                />
                            </div>
                        ) : (
                            <NotePrintPreview
                                data={pdfResponse.data}
                                pdfUrl={pdfResponse.url}
                                onRegenerate={handleRegenerate}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="clio-notes-new flex flex-col items-center w-full bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f9fafb_100%)] pt-6 lg:pt-8 px-4 pb-12">

            <Card className="max-w-6xl w-full bg-white border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.03)] rounded-[32px] overflow-hidden relative group">
                <CardHeader className="px-10 pt-10 pb-2 space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">New encounter</CardTitle>
                    </div>
                    <CardDescription className="text-[14px] text-slate-600 font-medium ml-12 tracking-tight normal-case opacity-100 mt-1">
                        Capture clinical sessions and generate structured documentation instantly.
                    </CardDescription>
                </CardHeader>
                <span className="sr-only">Status: {status}</span>

                <CardContent className="px-10 pt-8 pb-10 space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="space-y-6 flex flex-col">
                            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                                <FileText size={18} className="text-slate-400" />
                                <h3 className="text-base font-semibold text-slate-900">Patient details</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-semibold tracking-tight text-slate-700 ml-0.5">Patient identity</Label>
                                    <div className="relative group/input">
                                        <Input
                                            type="text"
                                            value={patientInfo.name}
                                            onChange={(e) => setPatientInfo(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Enter patient name..."
                                            className="h-11 pl-4 pr-10 rounded-xl bg-white border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:ring-offset-0 text-sm font-medium text-slate-900 transition-all duration-200 placeholder:text-slate-400 shadow-none"
                                        />
                                        <User size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within/input:text-primary transition-colors" />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <Label className="text-xs font-semibold tracking-tight text-slate-700 ml-0.5">Date of birth</Label>
                                    <Input
                                        type="date"
                                        value={patientInfo.dob}
                                        onChange={(e) => setPatientInfo(prev => ({ ...prev, dob: e.target.value }))}
                                        className="h-11 rounded-xl bg-white border-slate-200 hover:border-slate-300 px-4 font-semibold font-mono text-sm [color-scheme:light] text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:ring-offset-0 transition-all duration-200 shadow-none"
                                    />
                                </div>

                                <div className="space-y-2.5 sm:col-span-2">
                                    <Label className="text-xs font-semibold tracking-tight text-slate-700 ml-0.5">Clinical template</Label>
                                    <div className="relative" ref={dropdownRef}>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className={cn(
                                                "w-full h-11 rounded-xl bg-white border-slate-200 justify-between px-4 font-semibold text-sm text-slate-900 transition-all duration-200 hover:bg-slate-50/50 hover:border-slate-300 shadow-none",
                                                isDropdownOpen && "ring-2 ring-primary/20 border-primary/40 bg-white"
                                            )}
                                        >
                                            <span className="truncate">
                                                {templates.find(t => t.id === selectedTemplateId)?.name || 'Select template'}
                                            </span>
                                            <ChevronsUpDown size={14} className="opacity-40 ml-2 shrink-0" />
                                        </Button>

                                        {isDropdownOpen && (
                                            <Card className="absolute top-[calc(100%+6px)] left-0 right-0 z-[100] shadow-[0_10px_30px_rgba(15,23,42,0.12)] rounded-xl p-1.5 border-slate-200/60 bg-white animate-in fade-in zoom-in-95 duration-200">
                                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-0.5">
                                                    {templates.map(t => {
                                                        const isActive = t.id === selectedTemplateId;
                                                        return (
                                                            <Button
                                                                key={t.id}
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSelectedTemplateId(t.id);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full justify-between items-center h-9 px-3 text-xs font-semibold rounded-lg transition-colors",
                                                                    isActive ? 'bg-primary/5 text-primary hover:bg-primary/10' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                                )}
                                                            >
                                                                {t.name}
                                                                {isActive && <Check size={14} className="text-primary" />}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 flex flex-col h-full">
                            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                                <ClipboardList size={18} className="text-slate-400" />
                                <h3 className="text-base font-semibold text-slate-900">Encounter goals</h3>
                            </div>

                            <div className="space-y-2.5 flex-1 flex flex-col">
                                <Label className="text-xs font-semibold tracking-tight text-slate-700 ml-0.5">Contextual brief</Label>
                                <Textarea
                                    value={patientInfo.context}
                                    onChange={(e) => setPatientInfo(prev => ({ ...prev, context: e.target.value }))}
                                    placeholder="Specify symptoms, history focus, or session objectives..."
                                    className="w-full flex-1 min-h-[160px] bg-white border-slate-200 hover:border-slate-300 rounded-xl p-4 text-sm font-medium text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:ring-offset-0 leading-relaxed resize-none placeholder:text-slate-400 transition-all duration-200 shadow-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center pt-4">
                        {/* Primary Action Module */}
                        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-[28px] p-8 flex flex-col items-center gap-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] group/action">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Badge variant="outline" className="bg-slate-50/50 border-slate-200 text-slate-500 font-semibold px-2.5 py-0.5 rounded-full mb-1">
                                    Primary Task
                                </Badge>
                                <h4 className="text-xl font-semibold text-slate-900 tracking-tight">
                                    {status === 'recording' ? 'Session in progress' : 'Ready for session'}
                                </h4>
                                <p className="text-[14px] text-slate-500/90 font-medium max-w-sm">
                                    {status === 'recording'
                                        ? 'Capturing clinical dialogue for structured analysis.'
                                        : 'Initiate a capture session or import a clinical audio file to begin.'}
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-8 w-full">
                                <div className="flex flex-col items-center gap-4">
                                    {status === 'recording' && (
                                        <div className="flex items-center gap-3 px-4 py-1.5 bg-red-50 border border-red-100 rounded-full animate-in zoom-in duration-300 shadow-sm shadow-red-100">
                                            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-xs font-bold text-red-600 tracking-tight font-mono">
                                                LIVE RECORDING &bull; {formatTime(timer)}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "relative size-20 rounded-[24px] border-2 flex items-center justify-center transition-all duration-500 transition-colors",
                                            status === 'recording'
                                                ? "bg-red-50 border-red-200 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                                                : "bg-slate-50/50 border-slate-100/80 text-slate-400 group-hover/action:border-slate-200 group-hover/action:bg-white"
                                        )}
                                    >
                                        <Mic size={28} className={cn("transition-transform", status === 'recording' && "animate-pulse scale-110")} />
                                        <div className={cn(
                                            "absolute inset-0 rounded-[22px] border border-white/50 pointer-events-none",
                                            status === 'recording' && "border-red-500/10"
                                        )} />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full px-4">
                                    {status === 'idle' && !audioBlob && (
                                        <>
                                            <Button
                                                size="lg"
                                                onClick={startRecording}
                                                className="h-11 flex-1 max-w-[240px] rounded-xl font-semibold text-sm bg-slate-900 text-white shadow-md shadow-slate-200 hover:translate-y-[-1px] hover:bg-slate-800 active:translate-y-[0px] transition-all duration-200"
                                            >
                                                Initiate capture
                                            </Button>

                                            <Button
                                                size="lg"
                                                variant="outline"
                                                onClick={triggerFileUpload}
                                                className="h-11 px-8 rounded-xl font-semibold text-sm text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-200 gap-2.5"
                                            >
                                                <Upload size={16} className="text-slate-400" />
                                                Import audio
                                            </Button>
                                        </>
                                    )}

                                    {status === 'recording' && (
                                        <div className="flex items-center gap-4">
                                            <Button
                                                onClick={!isPaused ? pauseRecording : resumeRecording}
                                                variant={!isPaused ? "outline" : "default"}
                                                className={cn(
                                                    "size-11 rounded-xl shadow-sm transition-all active:translate-y-[0.5px]",
                                                    !isPaused ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20' : 'bg-slate-900'
                                                )}
                                            >
                                                {!isPaused ? <Pause size={20} /> : <Play size={20} />}
                                            </Button>
                                            <Button
                                                size="lg"
                                                onClick={stopRecording}
                                                className="h-11 px-12 bg-slate-900 rounded-xl font-bold text-sm text-white shadow-md shadow-slate-200 hover:translate-y-[-1px] transition-all"
                                            >
                                                Seal acquisition
                                            </Button>
                                        </div>
                                    )}

                                    {audioBlob && status !== 'recording' && status !== 'done' && (
                                        <div className="flex gap-4 w-full max-w-md">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                onClick={handleReset}
                                                disabled={status === 'uploading' || status === 'processing'}
                                                className="h-11 px-6 rounded-xl font-semibold text-sm text-slate-500 border-slate-200 hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-all"
                                            >
                                                Discard
                                            </Button>
                                            <Button
                                                size="lg"
                                                onClick={sendToGenerate}
                                                disabled={status === 'uploading' || status === 'processing'}
                                                className="flex-1 h-11 rounded-xl font-bold text-sm shadow-md shadow-slate-200 gap-2.5 bg-slate-900 text-white hover:translate-y-[-1px] active:translate-y-[0px] hover:bg-slate-800 transition-all"
                                            >
                                                {status === 'processing' || status === 'uploading' ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={18} />
                                                        Agent thinking...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileCheck size={18} /> Finalize documentation
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>

                {error && (
                    <div className="absolute -bottom-20 left-0 right-0 animate-in slide-in-from-top-4 duration-300">
                        <Badge variant="destructive" className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold shadow-xl shadow-red-100/50 border-red-200/50">
                            <AlertCircle size={18} />
                            {error}
                        </Badge>
                    </div>
                )}
            </Card>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="audio/*" />
        </div>
    );
};

export default Record;
