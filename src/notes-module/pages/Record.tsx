
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, FileCheck, Loader2, AlertCircle, RefreshCw, Pause, Play, ChevronsUpDown, ChevronDown, User, Upload, CheckCircle2, Sparkles, FileText, ClipboardList, Check, Lock, Layers, Trash2, Plus, Calendar, Clock, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PDFService } from '../lib/PDFService';
import type { PDFResponse, ClinicalNoteData } from '../lib/PDFService';
import { NotePrintPreview } from '../components/NotePrintPreview';
import { ClioNoteViewer } from '../components/ClioNoteViewer';
import { normalizeClioNote, calculateAge, mergePatientIntoNote, mergeProfileIntoNote, mergeJointNotes } from '../lib/clioUtils';
import { extractNormalizedTimeRange, areOverlapping } from '../lib/conflictUtils';
import { storage, type Template, type Patient } from '../lib/storage';
import { supabase } from '../../lib/supabaseClient';
import { PatientSelector } from '../components/PatientSelector';
import { PatientSummaryCard } from '../components/PatientSummaryCard';
import { PatientCreateModal } from '../components/PatientCreateModal';
import type { ClioNote } from '../types';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { TimeSpinner } from '../../components/ui/time-spinner';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { DatePicker } from '../../components/ui/date-picker';
import { TiltCard } from '../../components/ui/tilt-card';

const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const TCM_SUB_TEMPLATES = [
    'Monthly Home Visit (MHV)',
    'Update Information in the Community',
    'Obtain Supply Donation',
    'PCP Coordination / Staffing (In-Person)',
    'Coordinate Transportation',
    'Custom Template',
    'Other'
];

const formatTimeInput = (val: string): string => {
    let v = val.trim().toLowerCase();
    if (!v) return '';

    v = v.replace(/[^0-9:amp]/g, '');

    let hours = "";
    let minutes = "00";
    let period = "AM"; // Default to AM or keep existing PM

    if (v.includes('p')) period = 'PM';
    else if (v.includes('a')) period = 'AM';
    else {
        // If no AM/PM specified, guess based on business hours (e.g., 1-5 is PM, 6-12 is AM)
        const numOnly = parseInt(v.replace(/[^0-9]/g, ''), 10);
        if (numOnly >= 100 && numOnly <= 659) period = 'PM'; 
        else if (numOnly >= 1 && numOnly <= 6) period = 'PM';
    }

    const numbers = v.replace(/[^0-9]/g, '');

    if (numbers.length >= 3) {
        hours = numbers.slice(0, numbers.length === 3 ? 1 : 2);
        minutes = numbers.slice(-2);
    } else if (numbers.length > 0) {
        hours = numbers;
    } else {
        return val; // Return original if parsing fails
    }

    let h = parseInt(hours, 10);
    if (isNaN(h)) return val;

    if (h === 0) h = 12;
    if (h > 12) {
        h = h - 12;
        period = 'PM';
    }
    
    let m = parseInt(minutes, 10);
    if (isNaN(m) || m >= 60) m = 0;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

const Record: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    useTheme();

    // Core State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [recordedServices, setRecordedServices] = useState<Array<{ id: string, audioBlob: Blob | null, subTemplate: string, duration: number, manualText?: string, customTemplateText?: string }>>([]);

    // Process State
    const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'processing' | 'done'>('idle');
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingFromHistory, setIsLoadingFromHistory] = useState(false);

    // Data State
    const [patientInfo, setPatientInfo] = useState({
        name: '',
        dob: '',
        context: '',
        customTemplateText: ''
    });
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [pdfResponse, setPdfResponse] = useState<PDFResponse | null>(null);
    const [clioNote, setClioNote] = useState<ClioNote | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tcm_progress_note');
    const [selectedSubTemplate, setSelectedSubTemplate] = useState<string>('');
    const [serviceDate, setServiceDate] = useState(getLocalDateString());
    const [timeIn, setTimeIn] = useState('');
    const [timeOut, setTimeOut] = useState('');
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isTimePopoverOpen, setIsTimePopoverOpen] = useState(false);

    // Bootstrap Data State
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userClinic, setUserClinic] = useState<any>(null);
    const [noteCount, setNoteCount] = useState<number>(0);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const initialTemplateId = useRef(storage.getActiveTemplateId());

    useEffect(() => {
        const loadBootstrapData = async () => {
            if (!user) return;
            try {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    setUserProfile(profile);
                    if (profile.clinic_id) {
                        const { data: clinic } = await supabase.from('clinics').select('*').eq('id', profile.clinic_id).single();
                        if (clinic) setUserClinic(clinic);
                    }
                }
            } catch (err) {
                console.error("Error loading bootstrap data:", err);
            }
        };
        loadBootstrapData();

        if (user) {
            storage.getNotesCount(user.id).then(count => setNoteCount(count));
        }
    }, [user]);

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
            // Wait for auth AND bootstrap data (profile)
            if (!user || !userProfile) return;

            setIsTemplatesLoading(true);
            try {
                const fetched = await storage.getTemplates();
                setTemplates(fetched);
                // Force TCM Progress Note for Phase 1
                setSelectedTemplateId('tcm_progress_note');
            } catch (err) {
                console.error("Failed to load templates in Record:", err);
            } finally {
                setIsTemplatesLoading(false);
            }
        };
        loadTemplates();
    }, [user, userProfile]); // Depend on userProfile to avoid race condition

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dateInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const id = searchParams.get('id');
        const pId = searchParams.get('patientId');
        
        const dateParam = searchParams.get('date');
        const nameParam = searchParams.get('patientName');
        const timeParam = searchParams.get('time');

        if (dateParam) {
            setServiceDate(dateParam);
        }
        
        if (timeParam) {
            setTimeIn(timeParam);
        }
        
        if (nameParam) {
            setPatientInfo(prev => ({ ...prev, name: nameParam }));
            // We could also do a client search here if we want to auto-select the patient dropdown
        }

        if (id && !pdfResponse && !isLoadingFromHistory) {
            loadNoteFromHistory(id);
        } else if (pId && !selectedPatient) {
            loadPatientById(pId);
        } else if (!id && !pId && (status === 'done' || pdfResponse)) {
            handleReset();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [searchParams]);

    const isPausedRef = useRef(false);

    useEffect(() => {
        const handleGlobalReset = () => {
            handleReset();
        };
        window.addEventListener('clio-reset-workspace', handleGlobalReset);
        return () => window.removeEventListener('clio-reset-workspace', handleGlobalReset);
    }, [audioUrl]);

    // Automatic stacking of recordings had a bug and was confusing. 
    // Now we use an explicit "Add to Joint Note" button.

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
                    // Carry over patient_id
                    if ((note as any).patient_id) {
                        normalized.patient_id = (note as any).patient_id;
                    }

                    // Populate full patient details if linked
                    const pId = (note as any).patient_id || normalized.patient_id;
                    if (pId) {
                        const patient = await storage.getPatient(pId);
                        if (patient) {
                            mergePatientIntoNote(normalized, patient);

                            // Sync UI state
                            setSelectedPatient(patient);
                            setPatientInfo(prev => ({
                                ...prev,
                                name: patient.full_name,
                                dob: patient.dob || ''
                            }));
                        }
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

    const loadPatientById = async (patientId: string) => {
        try {
            const allPatients = await storage.getPatients();
            const patient = allPatients.find(p => p.id === patientId);
            if (patient) {
                setSelectedPatient(patient);
                setPatientInfo({
                    name: patient.full_name,
                    dob: patient.dob || '',
                    context: '',
                    customTemplateText: ''
                });
            }
        } catch (err) {
            console.error("Failed to load patient by ID:", err);
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
            if (!selectedSubTemplate) {
                toast.error('Please select a Service Provided before importing.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            setRecordedServices(prev => [...prev, {
                id: Date.now().toString(),
                audioBlob: file,
                subTemplate: selectedSubTemplate,
                duration: 0
            }]);
            setSelectedSubTemplate('');
            toast.success('Audio file imported successfully');

            // Explicitly reset the file input value so the same file can be imported again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveService = (idToRemove: string) => {
        setRecordedServices(prev => prev.filter(s => s.id !== idToRemove));
    };

    const handleAddService = () => {
        if (!selectedPatient && !patientInfo.name.trim()) {
            toast.error('Client Identity is required. Please select or type a patient name.');
            return;
        }
        if (!selectedSubTemplate) {
            toast.error('Please select a service provided.');
            return;
        }
        
        const hasAudio = !!audioBlob;
        const hasText = (!!patientInfo.context && patientInfo.context.trim() !== '') || (!!patientInfo.customTemplateText && patientInfo.customTemplateText.trim() !== '');

        if (selectedSubTemplate === 'Custom Template' && (!patientInfo.customTemplateText || patientInfo.customTemplateText.trim() === '')) {
            toast.error('Please provide the Custom Template text.');
            return;
        }

        if (!hasAudio && !hasText) {
            toast.error('Please provide either an audio recording, encounter goals, or custom template text.');
            return;
        }

        setRecordedServices(prev => [...prev, {
            id: (hasAudio ? 'audio-' : 'manual-') + Date.now().toString(),
            audioBlob: audioBlob,
            subTemplate: selectedSubTemplate,
            duration: timer,
            manualText: patientInfo.context,
            customTemplateText: patientInfo.customTemplateText
        }]);

        // Clean up pending states
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setTimer(0);
        setPatientInfo(prev => ({ ...prev, context: '', customTemplateText: '' }));
        // We keep selectedSubTemplate for convenience or reset it? 
        // User said: "y que se agreguen todos los campos... se habilita el boton de add note"
        // Let's reset the sub-template to force the user to pick again for the next service if it's a joint note.
        setSelectedSubTemplate('');
        
        toast.success('Service added to joint note');
    };

    const sendToGenerate = async () => {
        if (!selectedPatient && !patientInfo.name.trim()) {
            toast.error('Client Identity is required. Please select or type a patient name.');
            return;
        }
        if (!serviceDate) {
            toast.error('Encounter Date is required.');
            return;
        }
        
        const hasAudio = recordedServices.length > 0;
        const hasContext = (!!patientInfo.context && patientInfo.context.trim() !== '') || (!!patientInfo.customTemplateText && patientInfo.customTemplateText.trim() !== '');
        
        if (!hasAudio && !hasContext) {
            toast.error('Please provide either an audio recording or encounter goals.');
            return;
        }

        if (!hasAudio && !selectedSubTemplate) {
            toast.error('Service Provided is required for text-only notes. Please select an option.');
            return;
        }

        if (!user) {
            toast.error('Session expired. Please log in again.');
            return;
        }

        const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
        const isTcm = selectedTemplateId === 'tcm_progress_note';

        setStatus('uploading');
        setError(null);
        setPdfResponse(null);

        const allServicesToProcess = [...recordedServices];
        if (recordedServices.length === 0 && hasContext) {
            allServicesToProcess.push({
                id: 'text-only',
                audioBlob: new Blob([''], { type: 'audio/webm' }),
                subTemplate: selectedSubTemplate,
                duration: 0
            });
        }

        const generatedNotes: ClioNote[] = [];
        let lastPdfResult: PDFResponse | null = null;
        
        try {
            for (let i = 0; i < allServicesToProcess.length; i++) {
                const svc = allServicesToProcess[i];
                
                toast.loading(`Processing service ${i + 1} of ${allServicesToProcess.length}...`, { id: 'joint-progress' });

                const formData = new FormData();
                const audioFieldName = isTcm ? 'audio' : 'text';
                
                // If there's no audio, we send a tiny silent audio placeholder (100 bytes) 
                // to satisfy n8n binary nodes that might fail on a truly empty 0-byte file.
                const blobToSend = svc.audioBlob || new Blob([new Uint8Array(100)], { type: 'audio/webm' });
                formData.append(audioFieldName, blobToSend, 'encounter_audio.' + (blobToSend.type.split('/')[1] || 'webm'));

                // Always send the text field explicitly as well, as some n8n versions might prefer it
                if (svc.manualText) {
                    formData.append('text', svc.manualText);
                }
                if (svc.customTemplateText) {
                    formData.append('custom_template_text', svc.customTemplateText);
                }

                if (selectedPatient) {
                    formData.append('patient_id', selectedPatient.id);
                    formData.append('patient_name', selectedPatient.full_name);
                    if (selectedPatient.dob) formData.append('patient_dob', selectedPatient.dob);
                    const clinicalContext = JSON.stringify(selectedPatient);
                    formData.append('patient_clinical_context', clinicalContext);
                } else {
                    formData.append('patient_name', patientInfo.name);
                    formData.append('patient_dob', patientInfo.dob);
                }

                // If it's a manual text service, use that as the primary context
                const enrichedContext = `Encounter Context:\n${svc.manualText || patientInfo.context}\n\nDate: ${serviceDate}\nTime In: ${timeIn || 'Not specified'}\nTime Out: ${timeOut || 'Not specified'}`;
                formData.append('patient_context', enrichedContext);
                
                // Add unique identifiers so n8n can process them completely separately
                formData.append('service_id', svc.id);
                formData.append('joint_note_index', (i + 1).toString());
                formData.append('joint_note_total', allServicesToProcess.length.toString());
                formData.append('is_joint_note', allServicesToProcess.length > 1 ? 'true' : 'false');

                // Compute a unique service title to avoid n8n deduplicating multiple identical templates 
                const sameTypeBefore = allServicesToProcess.slice(0, i).filter(s => s.subTemplate === svc.subTemplate).length;
                const totalOfSameType = allServicesToProcess.filter(s => s.subTemplate === svc.subTemplate).length;
                let uniqueServiceTitle = svc.subTemplate;
                if (totalOfSameType > 1) {
                    uniqueServiceTitle = `${svc.subTemplate} (Part ${sameTypeBefore + 1})`;
                }

                if (isTcm) {
                    formData.append('template_id', 'tcm_progress_note');
                    formData.append('service_date', serviceDate);
                    formData.append('time_in', timeIn);
                    formData.append('time_out', timeOut);
                    formData.append('primary_service_provided', uniqueServiceTitle);
                } else {
                    const bodyData = {
                        patient_name: selectedPatient?.full_name || patientInfo.name,
                        patient_dob: selectedPatient?.dob || patientInfo.dob,
                        context: patientInfo.context,
                        custom_template_text: svc.customTemplateText,
                        template_text: currentTemplate.content,
                        template_id: currentTemplate.id,
                        template_version: currentTemplate.version,
                        provider_name: user?.name,
                        patient_id: selectedPatient?.id,
                        service_date: serviceDate,
                        service_id: svc.id,
                        joint_note_index: i + 1,
                        joint_note_total: allServicesToProcess.length,
                        is_joint_note: allServicesToProcess.length > 1,
                        primary_service_provided: uniqueServiceTitle
                    };
                    formData.append('body', JSON.stringify(bodyData));
                }

                formData.append('user_id', user.id);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 180000);

                const result = await PDFService.generatePDF(
                    formData,
                    {
                        template_id: selectedTemplateId,
                        patient_id: selectedPatient?.id
                    },
                    controller.signal
                );
                clearTimeout(timeoutId);

                if (!result.data || Object.keys(result.data).length === 0) {
                    // Specific handling for text-only TCM notes that the backend might not be ready for
                    if (!svc.audioBlob) {
                        throw new Error(`The backend (n8n) did not return a response for this text-only service. This usually means the workflow requires audio to proceed. Please record a short audio or update the n8n workflow.`);
                    }
                    throw new Error(`Service ${i + 1} (${svc.subTemplate}) returned an empty response. Verify n8n logs.`);
                }

                if (isTcm && result.data.template_id && result.data.template_id !== 'tcm_progress_note') {
                    console.warn('Template mismatch:', result.data.template_id);
                    // We allow it to continue if it's 'Other' but log the warning
                    if (svc.subTemplate !== 'Other') {
                        throw new Error(`Template mismatch for ${svc.subTemplate}: expected tcm_progress_note`);
                    }
                }

                lastPdfResult = result;
                const normalized = normalizeClioNote(result.data);
                if (normalized && typeof normalized === 'object') {
                    if (!normalized.meta) (normalized as any).meta = {};
                    normalized.meta.template_id = selectedTemplateId;
                    normalized.patient_id = selectedPatient?.id;
                    
                    (normalized as any)._frontend_service_title = svc.subTemplate;

                    if (selectedPatient) mergePatientIntoNote(normalized, selectedPatient);
                    if (userProfile || userClinic) mergeProfileIntoNote(normalized, userProfile, userClinic);
                    
                    // Always enforce the frontend-selected service date to override AI omissions or hallucinations
                    if (!normalized.encounter) normalized.encounter = {} as any;
                    normalized.encounter.dos_date = serviceDate;
                    
                    generatedNotes.push(normalized);
                }
            } // end loop

            toast.dismiss('joint-progress');
            
            if (generatedNotes.length > 0 && lastPdfResult) {
                // --- Overlap Check for Joint Notes using Standard Logic ---
                if (generatedNotes.length > 1) {
                    let hasOverlap = false;

                    // 1. Ensure all generated notes have a valid dos_date before we extract ISO strings
                    generatedNotes.forEach(note => {
                        if (note.encounter && (!note.encounter.dos_date || note.encounter.dos_date === '—')) {
                            note.encounter.dos_date = serviceDate;
                        }
                    });

                    for (let i = 0; i < generatedNotes.length; i++) {
                        // 2. Self-Validation: Check if the AI hallucinated an inverted time schedule (e.g. 10AM to 1:30AM)
                        const selfRange = extractNormalizedTimeRange(generatedNotes[i]);
                        if (selfRange.startAtISO && selfRange.endAtISO) {
                            if (selfRange.endAtISO < selfRange.startAtISO) {
                                hasOverlap = true; // Inverted time logic implies an invalid/overlapping session
                                break;
                            }
                        }

                        // 3. Cross-Validation: Check overlap with other services
                        for (let j = i + 1; j < generatedNotes.length; j++) {
                            const rangeA = extractNormalizedTimeRange(generatedNotes[i]);
                            const rangeB = extractNormalizedTimeRange(generatedNotes[j]);

                            if (rangeA.startAtISO && rangeA.endAtISO && rangeB.startAtISO && rangeB.endAtISO) {
                                if (areOverlapping(rangeA.startAtISO, rangeA.endAtISO, rangeB.startAtISO, rangeB.endAtISO)) {
                                    hasOverlap = true;
                                    break;
                                }
                            }
                        }
                        if (hasOverlap) break;
                    }

                    if (hasOverlap) {
                        toast.warning("Time Conflict/Overlap Detected: Multiple services occur at the same time or have invalid times. Please adjust to prevent billing issues.", { duration: 10000 });
                    }
                }

                const unifiedNote = mergeJointNotes(generatedNotes);

                // --- Synthesis Step for Joint Notes ---
                console.log("[JointNote] Checking for synthesis. Services count:", generatedNotes.length);
                if (generatedNotes.length > 1) {
                    try {
                        const outcomes = generatedNotes.map(n => n.narrative?.outcome_of_services).filter(Boolean) as string[];
                        const nextSteps = generatedNotes.map(n => n.narrative?.next_steps).filter(Boolean) as string[];
                        
                        console.log("[JointNote] Individual outcomes:", outcomes);
                        console.log("[JointNote] Individual next steps:", nextSteps);

                        if (outcomes.length > 0 || nextSteps.length > 0) {
                            toast.loading("Synthesizing joint narrative (n8n)...", { id: 'joint-progress' });
                            const synthesized = await PDFService.synthesizeJointNote(outcomes, nextSteps);
                            
                            console.log("[JointNote] Synthesis response:", synthesized);

                            if (synthesized.outcome) {
                                unifiedNote.narrative!.outcome_of_services = synthesized.outcome;
                            }
                            if (synthesized.nextSteps) {
                                unifiedNote.narrative!.next_steps = synthesized.nextSteps;
                            }
                            toast.success("Narrative synthesized", { id: 'joint-progress' });
                        } else {
                            console.warn("[JointNote] No outcomes or next steps found to synthesize.");
                        }
                    } catch (err) {
                        console.error("[JointNote] Narrative synthesis failed:", err);
                        toast.error("Synthesis failed, using concatenated fallback", { id: 'joint-progress' });
                    }
                }
                
                setPdfResponse({
                   ...lastPdfResult,
                   data: unifiedNote as any
                });
                
                setClioNote(unifiedNote);
                setStatus('done');
                if (lastPdfResult.data?.id) {
                    setSearchParams({ id: lastPdfResult.data.id });
                }
                toast.success('Documentation Ready');
            }

        } catch (err: any) {
            toast.dismiss('joint-progress');
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
        recordedServices.forEach(s => {
            if (s.audioBlob) URL.revokeObjectURL(URL.createObjectURL(s.audioBlob));
        });
        setPdfResponse(null);
        setClioNote(null);
        setStatus('idle');
        setPatientInfo({ name: '', dob: '', context: '', customTemplateText: '' });
        setSelectedPatient(null);
        setAudioUrl(null);
        setAudioBlob(null);
        setRecordedServices([]);
        setError(null);
        setIsPaused(false);
        setTimer(0);
        if (timerRef.current) clearInterval(timerRef.current);

        // Clean navigation to strip all search params
        navigate('/notes/new', { replace: true });
        setTimeIn('');
        setTimeOut('');
    };



    const isLimitReached = user?.subscription_tier === 'free' && noteCount >= 50 && user?.email !== 'reinier.roa@gmail.com' && user?.email !== 'reinier.roa2.0@gmail.com';

    if (isLimitReached) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-500 w-full relative">
                {/* Background decorative elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-violet-400/20 rounded-full blur-3xl" />
                </div>

                <div className="max-w-md w-full text-center space-y-6 relative z-10 m-auto">
                    <div className="size-20 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-900/5 ring-1 ring-indigo-100/50">
                        <Lock size={32} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black tracking-tight text-slate-800">Plan Limit Reached</h2>
                        <p className="text-slate-500 font-medium leading-relaxed">You have used all 50 of your free notes. To continue generating unlimited AI clinical documentation, please upgrade your subscription.</p>
                    </div>

                    <Card className="border-indigo-100/50 bg-white shadow-xl shadow-indigo-900/5 mt-8 overflow-hidden rounded-3xl relative">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                        <CardContent className="p-8">
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <Sparkles className="text-indigo-500 size-5" />
                                <h3 className="font-black text-xl text-slate-800 tracking-tight">ClinicFlow Pro</h3>
                            </div>
                            <ul className="text-sm font-medium text-slate-600 text-left space-y-4 mb-8">
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-indigo-500 shrink-0" /> Unlimited AI Generation</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-indigo-500 shrink-0" /> Print & Export PDF</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-indigo-500 shrink-0" /> Fast HIPAA Cloud Storage</li>
                            </ul>
                            <Button className="w-full font-bold h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-900/20 transition-all hover:scale-[1.02]">
                                Upgrade Plan (Coming Soon)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

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

    return (
        <div className="flex flex-col items-center w-full pt-6 lg:pt-8 px-4 pb-12 animate-in fade-in duration-500">
            {status === 'done' && pdfResponse ? (
                <div id="review-workspace-root" className="clio-notes-new fixed inset-0 z-[100] flex flex-col bg-slate-900/40 p-4 md:p-8 animate-in fade-in duration-500 overflow-hidden print:bg-white print:p-0">
                    {/* Decorative Background Layer */}
                    <div className="absolute inset-0 -z-10 bg-white/95 no-print" />

                    <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto overflow-hidden">
                        <div className="flex items-center justify-between mb-6 no-print">
                            <Button
                                variant="outline"
                                onClick={() => handleReset()}
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

                        <div id="record-scroll-container" className="flex-1 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] p-2 custom-scrollbar relative">
                            {isTemplatesLoading && (
                                <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            )}
                            {clioNote ? (
                                <div className="py-4 px-2 md:px-0">
                                    <ClioNoteViewer
                                        note={clioNote}
                                        onSaveComplete={(saved) => {
                                            if (saved) {
                                                toast.success("Saved successfully");
                                            }
                                        }}
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
            ) : (
                <Card className="max-w-6xl w-full bg-surface border border-border/60 shadow-soft rounded-[2.5rem] overflow-hidden relative group">
                    <CardContent className="px-6 md:px-10 pt-8 pb-10 space-y-8">
                        {/* Unified Action Center (Phase 1: Metadata & Phase 2: Capture) */}
                        <div className="space-y-6">
                            {/* Top Tier: Mandatory Clinical Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-8 border-b border-slate-100">
                                {/* Patient Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={14} className="text-slate-400" />
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Client identity</Label>
                                        {selectedPatient && <Check size={12} className="text-emerald-400" />}
                                    </div>
                                    {selectedPatient ? (
                                        <PatientSummaryCard
                                            patient={selectedPatient}
                                            onReset={() => {
                                                setSelectedPatient(null);
                                                setPatientInfo({ name: '', dob: '', context: '', customTemplateText: '' });
                                                setClioNote(null);
                                            }}
                                        />
                                    ) : (
                                        <PatientSelector
                                            onSelect={(p) => {
                                                setSelectedPatient(p);
                                                setPatientInfo(prev => ({
                                                    ...prev,
                                                    name: p.full_name,
                                                    dob: p.dob || ''
                                                }));
                                            }}
                                            onInputChange={(val) => {
                                                setPatientInfo(prev => ({ ...prev, name: val }));
                                            }}
                                            onCreateNew={() => setIsCreateModalOpen(true)}
                                        />
                                    )}
                                </div>

                                {/* Encounter Date & Time */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={14} className="text-slate-400" />
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Encounter Info</Label>
                                        {serviceDate && timeIn && <Check size={12} className="text-emerald-400" />}
                                    </div>
                                    <div className="flex bg-white border border-slate-200 rounded-full shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden mt-1">
                                        <div className="flex-1 min-w-[200px] border-r border-slate-100">
                                            <DatePicker 
                                                date={serviceDate} 
                                                setDate={setServiceDate} 
                                                className="h-11 rounded-none border-0 shadow-none bg-transparent w-full focus-visible:ring-0 px-5 font-medium text-slate-600 tracking-tight"
                                            />
                                        </div>
                                        <div className="relative shrink-0 flex items-center bg-slate-50/30 pr-1">
                                            <Popover open={isTimePopoverOpen} onOpenChange={setIsTimePopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" className="h-11 rounded-none hover:bg-slate-100 px-5 font-medium text-slate-500 min-w-[110px] w-auto flex items-center gap-2 justify-center transition-colors tracking-tight">
                                                        <Clock size={16} className="text-slate-300" />
                                                        {timeIn ? timeIn : "--:-- AM"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0 rounded-[2.5rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 bg-white/70 backdrop-blur-xl" side="bottom" align="end" sideOffset={12}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-8 pb-4 text-center">
                                                            <span className="font-medium tracking-tight text-slate-800 text-[18px]">Select Time</span>
                                                            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1 opacity-80">Encounter Start</div>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeIn}
                                                                onConfirm={(timeStr) => {
                                                                    setTimeIn(timeStr);
                                                                    setIsTimePopoverOpen(false);
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Provided */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ClipboardList size={14} className="text-slate-400" />
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Service Provided</Label>
                                        {selectedSubTemplate && <Check size={12} className="text-emerald-400" />}
                                    </div>
                                    <div className="relative mt-1">
                                        <div 
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className={cn(
                                                "w-full h-11 flex items-center justify-between px-6 bg-white border border-slate-200 rounded-full shadow-sm cursor-pointer transition-all hover:bg-slate-50",
                                                isDropdownOpen ? "border-primary/40 ring-4 ring-primary/10" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-[14px] font-medium tracking-tight",
                                                    selectedSubTemplate ? "text-slate-700" : "text-slate-400"
                                                )}>
                                                    {selectedSubTemplate || "Select encounter type..."}
                                                </span>
                                            </div>
                                            <ChevronDown className={cn("size-4 text-slate-400 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                        </div>

                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-500 ease-out">
                                                <div className="flex flex-col gap-1">
                                                    {TCM_SUB_TEMPLATES.map((t) => {
                                                        const isActive = selectedSubTemplate === t;
                                                        return (
                                                            <button
                                                                key={t}
                                                                onClick={() => {
                                                                    setSelectedSubTemplate(t);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full justify-between items-center h-10 px-5 text-xs font-medium rounded-full transition-colors flex group/item",
                                                                    isActive ? 'bg-primary/5 text-primary hover:bg-primary/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                                                )}
                                                            >
                                                                <span className="tracking-tight">{t}</span>
                                                                {isActive && <Check size={14} strokeWidth={3} className="animate-in zoom-in" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle Tier: Unified Capture Interface */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Voice Capture Section */}
                                <TiltCard intensity={5} scale={1.005} className="h-full">
                                    <div className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm transition-all hover:bg-white hover:shadow-md h-full min-h-[260px]">
                                        <div className="flex items-center justify-between w-full px-2">
                                            <div className="flex items-center gap-2">
                                                <Mic size={14} className="text-slate-400" />
                                                <Badge variant="outline" className="bg-white text-slate-400 border-slate-100 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest">
                                                    Voice Capture
                                                </Badge>
                                            </div>
                                        </div>
                                    <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full py-2">
                                        <div className="flex flex-col items-center gap-5 relative">
                                            {/* The Permanent Microphone - Precision Clinical Instrument Aesthetic */}
                                            <div className="relative group w-fit flex items-center justify-center">
                                                {/* Ambient Aura for Idle State - Soft, breathing background glow */}
                                                {status === 'idle' && !audioBlob && (
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 bg-primary/[0.04] rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite] pointer-events-none" />
                                                )}

                                                <button
                                                    onClick={status === 'idle' && !audioBlob ? startRecording : (status === 'recording' ? stopRecording : undefined)}
                                                    disabled={!!audioBlob}
                                                    className={cn(
                                                        "relative size-28 rounded-[2.8rem] flex items-center justify-center transition-all duration-700 z-10 overflow-hidden group/mic-btn",
                                                        audioBlob 
                                                            ? "bg-emerald-50/40 border-2 border-emerald-200 text-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.1)] cursor-default" 
                                                            : status === 'recording'
                                                                ? "animate-recording-pulse backdrop-blur-md border-2 border-rose-500/20 text-rose-500 cursor-pointer hover:scale-[0.98]"
                                                                : "glass-tactile border-2 border-white/80 text-slate-400 animate-tactile-pulse hover:text-primary hover:border-primary/30 hover:scale-105 cursor-pointer active:scale-95 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
                                                    )}
                                                >
                                                    {/* Premium Shimmer Sweep (Idle only) */}
                                                    {status === 'idle' && !audioBlob && (
                                                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-sweep pointer-events-none w-[200%]" />
                                                    )}

                                                    {/* Warm Breathing Pulse (Recording only) */}
                                                    {status === 'recording' && (
                                                        <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
                                                    )}

                                                    {status === 'recording' ? (
                                                        <div className="size-10 rounded-2xl bg-rose-500 animate-in zoom-in-50 duration-500 shadow-[0_8px_20px_rgba(244,63,94,0.4)] relative z-10 flex items-center justify-center">
                                                            <div className="size-4 bg-white/20 rounded-sm animate-pulse" />
                                                        </div>
                                                    ) : (
                                                        <div className={cn(
                                                            "relative z-10 transition-all duration-700",
                                                            status === 'idle' && !audioBlob ? "group-hover/mic-btn:scale-110" : ""
                                                        )}>
                                                            <Mic size={42} strokeWidth={1} className={cn(
                                                                "transition-all duration-700",
                                                                status === 'idle' && !audioBlob ? "text-primary/40 drop-shadow-[0_4px_8px_rgba(79,70,229,0.08)] group-hover/mic-btn:text-primary group-hover/mic-btn:drop-shadow-[0_8px_16px_rgba(79,70,229,0.2)]" : "text-emerald-500"
                                                            )} />
                                                        </div>
                                                    )}

                                                    {/* Glossy Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none opacity-50" />
                                                </button>

                                                {audioBlob && (
                                                    <div className="absolute -top-2 -right-2 size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-white shadow-xl animate-in zoom-in-50 duration-500 z-20">
                                                        <Check size={20} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>

                                            
                                            {/* Status Texts & Small Timer - Luxury Precision Labeling */}
                                            <div className="flex flex-col items-center gap-2 min-h-[44px] justify-start mt-1">
                                                {status === 'recording' ? (
                                                    <div className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-700">
                                                        <span className="text-2xl font-bold tabular-nums tracking-tighter text-rose-500 drop-shadow-sm">
                                                            {formatTime(timer)}
                                                        </span>
                                                        <div className="flex items-center gap-2 opacity-40">
                                                            <div className="size-1 rounded-full bg-rose-500 animate-pulse" />
                                                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
                                                                Recording...
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 animate-in fade-in duration-700">
                                                        <p className={cn(
                                                            "text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-700",
                                                            audioBlob ? "text-emerald-600" : "text-slate-400/60"
                                                        )}>
                                                            {audioBlob ? "Session Finalized" : "System Standby"}
                                                        </p>
                                                        {!audioBlob && (
                                                            <div className="h-4 flex items-center">
                                                                <p className="text-[10px] font-semibold text-primary/50 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0">
                                                                    Ready to record
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 w-full max-w-[240px] mt-2">
                                            
                                            {audioBlob && status !== 'recording' && (
                                                <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => {
                                                            if (audioUrl) URL.revokeObjectURL(audioUrl);
                                                            setAudioBlob(null);
                                                            setAudioUrl(null);
                                                            setTimer(0);
                                                        }}
                                                        className="h-11 w-full rounded-full font-black text-[10px] uppercase tracking-[0.2em] text-rose-400 hover:bg-rose-50/30 transition-all"
                                                    >
                                                        Discard
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                                </TiltCard>

                                {/* Text Capture Section */}
                                <TiltCard intensity={5} scale={1.005} className="h-full">
                                    <div className="bg-slate-50/50 border border-slate-200/80 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm transition-all hover:bg-white hover:shadow-md h-full min-h-[260px]">
                                    {selectedSubTemplate === 'Custom Template' ? (
                                        <div className="flex flex-col gap-6 h-full">
                                            <div className="flex-1 flex flex-col gap-3 relative">
                                                <div className="flex items-center justify-between w-full px-2">
                                                    <div className="flex items-center gap-2">
                                                        <Target size={14} className="text-slate-400" />
                                                        <Badge variant="outline" className="bg-white text-slate-400 border-slate-100 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest">
                                                            Goals
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    value={patientInfo.context}
                                                    onChange={(e) => setPatientInfo(prev => ({ ...prev, context: e.target.value }))}
                                                    placeholder="Symptoms or session objectives..."
                                                    className="w-full flex-1 min-h-[60px] bg-white border border-slate-100 px-4 py-3 text-[14px] font-medium rounded-2xl text-slate-700 shadow-sm focus-visible:ring-primary/20 placeholder:text-slate-300"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col gap-3 relative">
                                                <div className="flex items-center justify-between w-full px-2">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles size={14} className="text-emerald-400" />
                                                        <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-100/50 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest">
                                                            Template
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    value={patientInfo.customTemplateText}
                                                    onChange={(e) => setPatientInfo(prev => ({ ...prev, customTemplateText: e.target.value }))}
                                                    placeholder="Paste your custom template here..."
                                                    className="w-full flex-1 min-h-[60px] bg-white border border-emerald-100 px-4 py-3 text-[14px] font-medium rounded-2xl text-slate-700 shadow-sm focus-visible:ring-emerald-500/20 placeholder:text-emerald-300/60"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                            <div className="flex flex-col gap-4 h-full relative group/text flex-1">
                                                <div className="flex items-center justify-between w-full px-2">
                                                    <div className="flex items-center gap-2">
                                                        <Target size={14} className="text-slate-400" />
                                                        <Badge variant="outline" className="bg-white text-slate-400 border-slate-100 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest">
                                                            Encounter Goals
                                                        </Badge>
                                                    </div>
                                                    {patientInfo.context.trim().length > 0 && (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-500 border-emerald-100 flex items-center gap-1.5 font-bold animate-in zoom-in px-2.5 py-0.5 rounded-full scale-90">
                                                            <Check size={12} strokeWidth={3} /> Added
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 flex flex-col relative justify-start pt-2">
                                                    {!patientInfo.context.trim() && (
                                                        <div className="absolute inset-x-0 top-2 pointer-events-none px-2 flex group-focus-within/text:opacity-0 transition-opacity duration-300">
                                                            <div className="flex items-start gap-1">
                                                                <div className="w-[2.5px] h-5 bg-primary/40 animate-cursor-blink rounded-full mt-0.5" />
                                                                <span className="text-[15px] font-medium text-slate-400/60 animate-text-breathing tracking-tight leading-relaxed">
                                                                    Specify symptoms, history focus, or session objectives (optional)...
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Textarea
                                                        value={patientInfo.context}
                                                        onChange={(e) => setPatientInfo(prev => ({ ...prev, context: e.target.value }))}
                                                        placeholder=""
                                                        className="w-full flex-1 bg-transparent border-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-0 text-[15px] font-medium text-slate-600 placeholder:text-transparent resize-none leading-relaxed transition-all shadow-none tracking-tight z-10 min-h-[160px]"
                                                    />
                                                </div>
                                            </div>
                                    )}
                                </div>
                                </TiltCard>
                            </div>

                            {/* Action & Status Tier */}
                            <div className="flex flex-col gap-4 pt-6 mt-2 border-t border-slate-100/50">
                                <div className="flex flex-row items-stretch gap-4 w-full max-w-3xl mx-auto px-4">
                                    {(() => {
                                        const hasIdentity = selectedPatient || patientInfo.name.trim().length > 0;
                                        const canAdd = hasIdentity && serviceDate && selectedSubTemplate && (audioBlob || patientInfo.context.trim().length > 0 || (selectedSubTemplate === 'Custom Template' && patientInfo.customTemplateText?.trim().length > 0));
                                        return (
                                            <Button
                                                onClick={handleAddService}
                                                disabled={!canAdd}
                                                className={cn(
                                                    "h-12 flex-1 rounded-full font-bold text-[12px] uppercase tracking-[0.2em] gap-2 transition-all duration-500 shadow-sm border",
                                                    canAdd 
                                                        ? "bg-white text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 active:scale-[0.98]" 
                                                        : "bg-slate-50/50 text-slate-300 border-slate-100 shadow-none cursor-not-allowed"
                                                )}
                                            >
                                                <Plus size={14} strokeWidth={3} />
                                                <span>{audioBlob && (patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) ? "Add Combined" : (audioBlob ? "Add Audio" : ((patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) ? "Add Text" : "Add Service"))}</span>
                                            </Button>
                                        );
                                    })()}

                                    <Button
                                        onClick={sendToGenerate}
                                        disabled={recordedServices.length === 0 || status === 'uploading' || status === 'processing'}
                                        className={cn(
                                            "h-12 flex-1 rounded-full font-bold text-[12px] uppercase tracking-[0.2em] gap-2 transition-all duration-500 active:scale-[0.98] shadow-md",
                                            recordedServices.length > 0
                                                ? "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-900/10"
                                                : "bg-slate-50 text-slate-200 pointer-events-none border border-slate-100"
                                        )}
                                    >
                                        {status === 'processing' || status === 'uploading' ? (
                                            <>
                                                <Loader2 className="animate-spin" size={14} />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileCheck size={14} />
                                                <span>Finalize ({recordedServices.length})</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                                
                                {(!selectedPatient && !patientInfo.name.trim()) || !selectedSubTemplate ? (
                                    <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] animate-pulse transition-opacity duration-1000">
                                        Fill patient & service fields to enable
                                    </p>
                                ) : null}
                            </div>

                            {/* Bottom Tier: Recorded Services Stack */}
                            {recordedServices.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-slate-50 animate-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <div className="flex items-center gap-2">
                                            <Layers className="text-primary/40" size={16} />
                                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Joint Note Stack ({recordedServices.length})</h3>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={handleReset}
                                            className="h-7 text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg px-2.5"
                                        >
                                            Discard Session
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {recordedServices.map((svc, i) => (
                                            <div key={svc.id} className="bg-slate-50/30 border border-slate-100 rounded-[1.5rem] py-2 px-3.5 flex items-center justify-between shadow-sm hover:border-slate-200 transition-all duration-300 group overflow-hidden">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex items-center justify-center size-5 rounded-full bg-white border border-slate-100 text-[9px] font-bold text-slate-400 shrink-0 shadow-sm">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <h5 className="text-[11px] font-semibold text-slate-500 truncate leading-tight tracking-tight">{svc.subTemplate}</h5>
                                                        <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                                            {svc.audioBlob && (
                                                                <Mic size={9} className="text-slate-400" />
                                                            )}
                                                            {svc.manualText && (
                                                                <FileText size={9} className="text-slate-400" />
                                                            )}
                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                {svc.audioBlob && svc.manualText ? "Both" : (svc.audioBlob ? "Audio" : "Text")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveService(svc.id)} 
                                                    className="size-7 flex items-center justify-center rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all duration-300 shrink-0"
                                                >
                                                    <Trash2 size={13} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="audio/*" />

            <PatientCreateModal
                isOpen={isCreateModalOpen}
                context="encounter"
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={(p) => {
                    setSelectedPatient(p);
                    setPatientInfo(prev => ({
                        ...prev,
                        name: p.full_name,
                        dob: p.dob || ''
                    }));
                }}
            />
        </div >
    );
};

export default Record;
