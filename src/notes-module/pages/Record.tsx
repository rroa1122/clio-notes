
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, FileCheck, Loader2, AlertCircle, RefreshCw, Pause, Play, ChevronsUpDown, ChevronDown, User, Upload, CheckCircle2, Sparkles, FileText, ClipboardList, Check, Lock, Layers, Trash2, Plus, Calendar, Clock, Target, Compass, Edit2, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getPDFServiceErrorMessage, PDFService } from '../lib/PDFService';
import type { PDFResponse, ClinicalNoteData } from '../lib/PDFService';
import { NotePrintPreview } from '../components/NotePrintPreview';
import { ClioNoteViewer } from '../components/ClioNoteViewer';
import { normalizeClioNote, calculateAge, mergePatientIntoNote, mergeProfileIntoNote, mergeJointNotes } from '../lib/clioUtils';
import { extractNormalizedTimeRange, areOverlapping } from '../lib/conflictUtils';
import { createAudioUploadPayload } from '../lib/noteRequestUtils';
import { storage, type Template, type Patient } from '../lib/storage';
import { supabase } from '../../lib/supabaseClient';
import { settingsService } from '../../services/settingsService';
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

const formatServiceDate = (dateStr?: string, lang?: string) => {
    if (!dateStr) return '';
    try {
        const parsed = parseISO(dateStr);
        if (isValid(parsed)) {
            return format(parsed, "PPP", { locale: lang === 'es' ? es : undefined });
        }
    } catch (e) {
        console.error(e);
    }
    return dateStr;
};

const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})\s*(am|pm)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toLowerCase();
    if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    if (!period && hours >= 24) return null;
    return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number): string => {
    let m = minutes % (24 * 60);
    if (m < 0) m += 24 * 60;
    let hours = Math.floor(m / 60);
    const mins = m % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    const padHours = hours.toString().padStart(2, '0');
    const padMins = mins.toString().padStart(2, '0');
    return `${padHours}:${padMins} ${period}`;
};

const TCM_SUB_TEMPLATES_BY_GROUP = [
    {
        category: "Core Case Management",
        items: [
            'TCM Initial Home Visit',
            'TCM Collateral & Contact Note',
            'TCM Initial Assessment & Certification',
            'TCM Service Plan Development',
            'TCM Service Plan Discussion',
            'TCM Hurricane Season: Addendum',
            'TCM Hurricane Season: Update'
        ]
    },
    {
        category: "Physical & Preventive Health",
        items: [
            'TCM Vaccination Assistance',
            'OTC Benefit Assistance'
        ]
    },
    {
        category: "Basic Needs & Supplies",
        items: [
            'Obtain Supply Donation',
            'TCM MHV + Provide Donation'
        ]
    },
    {
        category: "Transportation & Mobility",
        items: [
            'TCM Complete STS Application',
            'TCM Collect STS from PCP',
            'TCM Submit STS',
            'TCM Obtain Disabled Parking Permit',
            'TCM Complete Disabled Parking Permit',
            'TCM Submit DPP to PCP',
            'Coordinate Transportation'
        ]
    },
    {
        category: "Housing & Shelter",
        items: [
            'TCM Housing Application Assistance'
        ]
    },
    {
        category: "Legal & Immigration",
        items: [
            'USCIS / Immigration Process Assistance'
        ]
    },
    {
        category: "Supportive Coordination",
        items: [
            'Provider Appointment Coordination',
            'PCP Coordination / Staffing (In-Person)',
            'Update Information in the Community'
        ]
    },
    {
        category: "Other",
        items: [
            'Custom Template',
            'Other'
        ]
    }
];

const TCM_SUB_TEMPLATES = TCM_SUB_TEMPLATES_BY_GROUP.flatMap(g => g.items);

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
    const { language, t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    useTheme();

    const [clinicSettings, setClinicSettings] = useState<any>(null);

    useEffect(() => {
        const loadClinicSettings = async () => {
            if (user?.clinic_id) {
                try {
                    const settings = await settingsService.fetchSettings(user.clinic_id);
                    setClinicSettings(settings);
                } catch (err) {
                    console.error("Record: Failed to load clinic settings:", err);
                }
            }
        };
        loadClinicSettings();
    }, [user?.clinic_id]);

    // Core State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [recordedServices, setRecordedServices] = useState<Array<{ id: string, audioBlob: Blob | null, subTemplate: string, duration: number, manualText?: string, customTemplateText?: string, serviceDate?: string, timeIn?: string, timeOut?: string, units?: string }>>([]);

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
    const [units, setUnits] = useState('');
    const [durationMin, setDurationMin] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'capture' | 'services'>('info');
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(() => localStorage.getItem('clio_hide_guide') !== 'true');
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isTimePopoverOpen, setIsTimePopoverOpen] = useState(false);
    const [isTimeOutPopoverOpen, setIsTimeOutPopoverOpen] = useState(false);
    const [isMobileTimeOpen, setIsMobileTimeOpen] = useState(false);
    const [isMobileTimeOutOpen, setIsMobileTimeOutOpen] = useState(false);

    const [subTemplateSearchQuery, setSubTemplateSearchQuery] = useState('');

    const filteredSubTemplatesByGroup = useMemo(() => {
        if (!subTemplateSearchQuery.trim()) return TCM_SUB_TEMPLATES_BY_GROUP;
        const query = subTemplateSearchQuery.toLowerCase();
        return TCM_SUB_TEMPLATES_BY_GROUP.map(group => {
            const filteredItems = group.items.filter(item => 
                item.toLowerCase().includes(query) || 
                group.category.toLowerCase().includes(query)
            );
            return {
                ...group,
                items: filteredItems
            };
        }).filter(group => group.items.length > 0);
    }, [subTemplateSearchQuery]);

    useEffect(() => {
        if (!isDropdownOpen) {
            setSubTemplateSearchQuery('');
        }
    }, [isDropdownOpen]);

    // Bootstrap Data State
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userClinic, setUserClinic] = useState<any>(null);
    const [noteCount, setNoteCount] = useState<number>(0);

    const isRestoredRef = useRef(false);
    const subTemplateDropdownRef = useRef<HTMLDivElement>(null);
    const mobileSubTemplateDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                (subTemplateDropdownRef.current && !subTemplateDropdownRef.current.contains(event.target as Node)) &&
                (mobileSubTemplateDropdownRef.current && !mobileSubTemplateDropdownRef.current.contains(event.target as Node))
            ) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Persistence: Save state to sessionStorage
    useEffect(() => {
        if (!isRestoredRef.current) return;

        const hasContent = selectedPatient || 
                           recordedServices.length > 0 || 
                           clioNote || 
                           timeIn || 
                           timeOut || 
                           units || 
                           durationMin || 
                           patientInfo.name || 
                           patientInfo.dob;

        if (hasContent) {
            const draft = {
                status,
                pdfResponse,
                clioNote,
                selectedPatient,
                recordedServices: recordedServices.map(s => ({ ...s, audioBlob: null })),
                selectedTemplateId,
                selectedSubTemplate,
                serviceDate,
                timeIn,
                timeOut,
                units,
                durationMin,
                patientInfo,
                activeTab
            };
            sessionStorage.setItem('clio_encounter_draft', JSON.stringify(draft));
        } else {
            sessionStorage.removeItem('clio_encounter_draft');
        }
    }, [status, pdfResponse, clioNote, selectedPatient, recordedServices, selectedTemplateId, selectedSubTemplate, serviceDate, timeIn, timeOut, units, durationMin, patientInfo, activeTab]);

    // Persistence: Restore state from sessionStorage on mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem('clio_encounter_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                
                const urlId = searchParams.get('id');
                const urlPatientId = searchParams.get('patientId');
                
                const draftId = parsed.clioNote?.id || parsed.pdfResponse?.data?.id;
                const draftPatientId = parsed.selectedPatient?.id;
                
                if (!urlId && draftId) {
                    sessionStorage.removeItem('clio_encounter_draft');
                    return;
                }
                
                if (urlId && urlId !== draftId) {
                    return;
                }
                if (urlPatientId && urlPatientId !== draftPatientId) {
                    return;
                }
                if (parsed.status !== undefined) {
                    const restoredStatus = (parsed.status === 'processing' || parsed.status === 'uploading') ? 'idle' : parsed.status;
                    setStatus(restoredStatus);
                }
                if (parsed.pdfResponse !== undefined) setPdfResponse(parsed.pdfResponse);
                if (parsed.clioNote !== undefined) setClioNote(parsed.clioNote);
                if (parsed.selectedPatient !== undefined) setSelectedPatient(parsed.selectedPatient);
                if (parsed.recordedServices !== undefined) {
                    setRecordedServices(parsed.recordedServices.map((s: any) => ({
                        ...s,
                        audioBlob: null
                    })));
                }
                if (parsed.selectedTemplateId !== undefined) setSelectedTemplateId(parsed.selectedTemplateId);
                if (parsed.selectedSubTemplate !== undefined) setSelectedSubTemplate(parsed.selectedSubTemplate);
                if (parsed.serviceDate !== undefined) setServiceDate(parsed.serviceDate);
                if (parsed.timeIn !== undefined) setTimeIn(parsed.timeIn);
                if (parsed.timeOut !== undefined) setTimeOut(parsed.timeOut);
                if (parsed.units !== undefined) setUnits(parsed.units);
                if (parsed.durationMin !== undefined) {
                    setDurationMin(parsed.durationMin);
                } else {
                    setDurationMin(calculateDurationMin(parsed.timeIn || '', parsed.timeOut || '', parsed.units || ''));
                }
                if (parsed.patientInfo !== undefined) setPatientInfo(parsed.patientInfo);
                if (parsed.activeTab !== undefined) setActiveTab(parsed.activeTab);
            }
        } catch (e) {
            console.error("Error restoring encounter draft:", e);
        } finally {
            isRestoredRef.current = true;
        }
    }, []);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const initialTemplateId = useRef(storage.getActiveTemplateId());

    useEffect(() => {
        if (selectedSubTemplate === 'TCM Initial Assessment & Certification') {
            setSelectedTemplateId('tcm_assessment_note');
        } else if (selectedSubTemplate === 'TCM Service Plan Development') {
            setSelectedTemplateId('tcm_service_plan_note');
        } else if (selectedSubTemplate === 'TCM Service Plan Discussion') {
            setSelectedTemplateId('tcm_service_plan_discussion');
        } else if (selectedSubTemplate === 'TCM Initial Home Visit') {
            setSelectedTemplateId('tcm_initial_home_visit_note');
        } else if (selectedSubTemplate === 'TCM Collateral & Contact Note') {
            setSelectedTemplateId('tcm_collateral_note');
        } else if (selectedSubTemplate === 'TCM Hurricane Season: Addendum') {
            setSelectedTemplateId('tcm_hurricane_addendum_note');
        } else if (selectedSubTemplate === 'TCM Hurricane Season: Update') {
            setSelectedTemplateId('tcm_hurricane_update_note');
        } else if (selectedSubTemplate === 'TCM Complete STS Application') {
            setSelectedTemplateId('tcm_sts_complete_note');
        } else if (selectedSubTemplate === 'TCM Collect STS from PCP') {
            setSelectedTemplateId('tcm_sts_collect_note');
        } else if (selectedSubTemplate === 'TCM Submit STS') {
            setSelectedTemplateId('tcm_sts_submit_note');
        } else if (selectedSubTemplate === 'TCM Obtain Disabled Parking Permit') {
            setSelectedTemplateId('tcm_dpp_obtain_note');
        } else if (selectedSubTemplate === 'TCM Complete Disabled Parking Permit') {
            setSelectedTemplateId('tcm_dpp_complete_note');
        } else if (selectedSubTemplate === 'TCM Submit DPP to PCP') {
            setSelectedTemplateId('tcm_dpp_submit_pcp_note');
        } else if (selectedSubTemplate === 'TCM MHV + Provide Donation') {
            setSelectedTemplateId('tcm_mhv_provide_donation_note');
        } else if (selectedSubTemplate === 'Obtain Supply Donation') {
            setSelectedTemplateId('tcm_donation_obtain_note');
        } else if (selectedSubTemplate === 'TCM Vaccination Assistance') {
            setSelectedTemplateId('tcm_vaccination_assistance_note');
        } else if (selectedSubTemplate === 'Provider Appointment Coordination') {
            setSelectedTemplateId('tcm_provider_appt_coord_note');
        } else if (selectedSubTemplate === 'USCIS / Immigration Process Assistance') {
            setSelectedTemplateId('tcm_uscis_assistance_note');
        } else if (selectedSubTemplate === 'TCM Housing Application Assistance') {
            setSelectedTemplateId('tcm_housing_assistance_note');
        } else if (selectedSubTemplate) {
            setSelectedTemplateId('tcm_progress_note');
        }
    }, [selectedSubTemplate]);

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

    const calculateDurationMin = (tIn: string, tOut: string, u: string) => {
        const startMins = parseTimeToMinutes(tIn);
        const endMins = parseTimeToMinutes(tOut);
        if (startMins !== null && endMins !== null) {
            let diff = endMins - startMins;
            if (diff < 0) diff += 24 * 60;
            return diff.toString();
        } else if (u) {
            const parsedU = parseInt(u);
            if (!isNaN(parsedU)) {
                return (parsedU * 15).toString();
            }
        }
        return '';
    };

    const handleTimeInChange = (newTimeIn: string) => {
        setTimeIn(newTimeIn);
        const startMins = parseTimeToMinutes(newTimeIn);
        const endMins = parseTimeToMinutes(timeOut);
        
        if (startMins !== null) {
            if (endMins !== null) {
                // Calculate duration in minutes and units
                let duration = endMins - startMins;
                if (duration < 0) duration += 24 * 60;
                setDurationMin(duration.toString());
                const calculatedUnits = Math.floor(duration / 15) + (duration % 15 >= 8 ? 1 : 0);
                setUnits(calculatedUnits.toString());
            } else if (durationMin) {
                // Calculate timeOut from timeIn and durationMin
                const mins = parseInt(durationMin);
                if (!isNaN(mins) && mins >= 0) {
                    const calculatedEndMins = startMins + mins;
                    setTimeOut(formatMinutesToTime(calculatedEndMins));
                }
            } else if (units) {
                // Calculate timeOut from timeIn and units
                const u = parseInt(units);
                if (!isNaN(u) && u >= 0) {
                    const calculatedEndMins = startMins + (u * 15);
                    setTimeOut(formatMinutesToTime(calculatedEndMins));
                }
            }
        }
    };

    const handleTimeOutChange = (newTimeOut: string) => {
        setTimeOut(newTimeOut);
        const startMins = parseTimeToMinutes(timeIn);
        const endMins = parseTimeToMinutes(newTimeOut);
        
        if (startMins !== null && endMins !== null) {
            let duration = endMins - startMins;
            if (duration < 0) duration += 24 * 60;
            setDurationMin(duration.toString());
            const calculatedUnits = Math.floor(duration / 15) + (duration % 15 >= 8 ? 1 : 0);
            setUnits(calculatedUnits.toString());
        }
    };

    const handleDurationMinChange = (newDurationMin: string) => {
        const trimmed = newDurationMin.trim();
        setDurationMin(trimmed);
        if (trimmed === '') {
            setUnits('');
            setTimeOut('');
        } else {
            const mins = parseInt(trimmed);
            if (!isNaN(mins) && mins >= 0) {
                // Calculate units based on minutes (8-minute rule)
                const calculatedUnits = Math.floor(mins / 15) + (mins % 15 >= 8 ? 1 : 0);
                setUnits(calculatedUnits.toString());
                
                // Calculate timeOut from timeIn and minutes duration
                const startMins = parseTimeToMinutes(timeIn);
                if (startMins !== null) {
                    const calculatedEndMins = startMins + mins;
                    setTimeOut(formatMinutesToTime(calculatedEndMins));
                }
            }
        }
    };

    const handleUnitsChange = (newUnits: string) => {
        const trimmed = newUnits.trim();
        setUnits(trimmed);
        if (trimmed === '') {
            setDurationMin('');
            setTimeOut('');
        } else {
            const u = parseInt(trimmed);
            if (!isNaN(u) && u >= 0) {
                setDurationMin((u * 15).toString());
                const startMins = parseTimeToMinutes(timeIn);
                if (startMins !== null) {
                    const calculatedEndMins = startMins + (u * 15);
                    setTimeOut(formatMinutesToTime(calculatedEndMins));
                }
            }
        }
    };

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

    useEffect(() => {
        const isPrint = searchParams.get('print') === 'true';
        if (isPrint && clioNote && !isLoadingFromHistory) {
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, clioNote, isLoadingFromHistory]);

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
                setStatus('idle');
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
                duration: 0,
                serviceDate: serviceDate,
                timeIn: timeIn,
                timeOut: timeOut,
                units: units
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
        if (editingServiceId === idToRemove) {
            handleCancelEdit();
        }
        setRecordedServices(prev => prev.filter(s => s.id !== idToRemove));
    };

    const handleEditService = (svc: typeof recordedServices[0]) => {
        setEditingServiceId(svc.id);
        setSelectedSubTemplate(svc.subTemplate);
        setServiceDate(svc.serviceDate || getLocalDateString());
        setTimeIn(svc.timeIn || '');
        setTimeOut(svc.timeOut || '');
        setUnits(svc.units || '');
        setDurationMin(calculateDurationMin(svc.timeIn || '', svc.timeOut || '', svc.units || ''));
        setPatientInfo(prev => ({
            ...prev,
            context: svc.manualText || '',
            customTemplateText: svc.customTemplateText || ''
        }));
        
        if (svc.audioBlob) {
            setAudioBlob(svc.audioBlob);
            const url = URL.createObjectURL(svc.audioBlob);
            setAudioUrl(url);
            setTimer(svc.duration || 0);
        } else {
            setAudioBlob(null);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
            setTimer(0);
        }
        
        setActiveTab('info');
        toast.info(language === 'es' ? 'Detalles cargados en el formulario para editar' : 'Details loaded into form for editing');
    };

    const handleCancelEdit = () => {
        setEditingServiceId(null);
        setSelectedSubTemplate('');
        setTimeIn('');
        setTimeOut('');
        setUnits('');
        setDurationMin('');
        setPatientInfo(prev => ({
            ...prev,
            context: '',
            customTemplateText: ''
        }));
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setTimer(0);
        
        toast.info(language === 'es' ? 'Edición cancelada' : 'Editing cancelled');
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

        if (selectedSubTemplate === 'OTC Benefit Assistance') {
            // Add three independent services: OTC Obt, OTC Comp, OTC Sub
            setRecordedServices(prev => [
                ...prev,
                {
                    id: 'manual-obt-' + Date.now().toString(),
                    audioBlob: null,
                    subTemplate: 'OTC Obt',
                    duration: 42 * 60, // 42 minutes in seconds
                    manualText: 'The Targeted Case Manager (TCM) will assist the patient in obtaining the OTC benefit form from the pharmacy.',
                    customTemplateText: '',
                    serviceDate: serviceDate,
                    timeIn: '09:38 AM',
                    timeOut: '10:20 AM',
                    units: '3'
                },
                {
                    id: 'manual-comp-' + (Date.now() + 1).toString(),
                    audioBlob: null,
                    subTemplate: 'OTC Comp',
                    duration: 43 * 60, // 43 minutes
                    manualText: 'The Targeted Case Manager (TCM) will assist the patient in completing the OTC items catalog selection.',
                    customTemplateText: '',
                    serviceDate: serviceDate,
                    timeIn: '12:50 PM',
                    timeOut: '01:33 PM',
                    units: '3'
                },
                {
                    id: 'manual-sub-' + (Date.now() + 2).toString(),
                    audioBlob: null,
                    subTemplate: 'OTC Sub',
                    duration: 44 * 60, // 44 minutes
                    manualText: 'The Targeted Case Manager (TCM) will assist the patient in submitting the OTC catalog order.',
                    customTemplateText: '',
                    serviceDate: serviceDate,
                    timeIn: '04:15 PM',
                    timeOut: '04:59 PM',
                    units: '3'
                }
            ]);
            setSelectedSubTemplate('');
            toast.success(language === 'es' ? 'Se agregaron los 3 bloques de servicio OTC' : 'Added all 3 OTC service blocks');
            return;
        }
        
        const hasAudio = !!audioBlob;

        if (selectedSubTemplate === 'Custom Template' && (!patientInfo.customTemplateText || patientInfo.customTemplateText.trim() === '')) {
            toast.error('Please provide the Custom Template text.');
            return;
        }

        if (editingServiceId) {
            setRecordedServices(prev => prev.map(s => s.id === editingServiceId ? {
                ...s,
                audioBlob: audioBlob,
                subTemplate: selectedSubTemplate,
                duration: timer,
                manualText: patientInfo.context,
                customTemplateText: patientInfo.customTemplateText,
                serviceDate: serviceDate,
                timeIn: timeIn,
                timeOut: timeOut,
                units: units
            } : s));
            setEditingServiceId(null);
            toast.success(language === 'es' ? 'Servicio actualizado' : 'Service updated');
        } else {
            setRecordedServices(prev => [...prev, {
                id: (hasAudio ? 'audio-' : 'manual-') + Date.now().toString(),
                audioBlob: audioBlob,
                subTemplate: selectedSubTemplate,
                duration: timer,
                manualText: patientInfo.context,
                customTemplateText: patientInfo.customTemplateText,
                serviceDate: serviceDate,
                timeIn: timeIn,
                timeOut: timeOut,
                units: units
            }]);
            toast.success('Service added to joint note');
        }

        // Clean up pending states
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setTimer(0);
        setPatientInfo(prev => ({ ...prev, context: '', customTemplateText: '' }));
        setSelectedSubTemplate('');
        setTimeIn('');
        setTimeOut('');
        setUnits('');
        setDurationMin('');
        setActiveTab('services');
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
        const isTcm = ['tcm_progress_note', 'tcm_assessment_note', 'tcm_service_plan_note', 'tcm_initial_home_visit_note', 'tcm_collateral_note', 'tcm_service_plan_discussion', 'tcm_hurricane_addendum_note', 'tcm_hurricane_update_note', 'tcm_sts_complete_note', 'tcm_sts_collect_note', 'tcm_sts_submit_note', 'tcm_dpp_obtain_note', 'tcm_dpp_complete_note', 'tcm_dpp_submit_pcp_note', 'tcm_mhv_provide_donation_note', 'tcm_donation_obtain_note', 'tcm_vaccination_assistance_note', 'tcm_provider_appt_coord_note', 'tcm_uscis_assistance_note', 'tcm_housing_assistance_note'].includes(selectedTemplateId);

        setStatus('uploading');
        setError(null);
        setPdfResponse(null);

        const allServicesToProcess = [...recordedServices];
        if (recordedServices.length === 0 && hasContext) {
            allServicesToProcess.push({
                id: 'text-only',
                audioBlob: null,
                subTemplate: selectedSubTemplate,
                duration: 0,
                serviceDate: serviceDate,
                timeIn: timeIn,
                timeOut: timeOut
            });
        }

        const generatedNotes: ClioNote[] = [];
        let lastPdfResult: PDFResponse | null = null;
        
        try {
            for (let i = 0; i < allServicesToProcess.length; i++) {
                const svc = allServicesToProcess[i];
                const svcDate = (svc as any).serviceDate || serviceDate;
                const svcTimeIn = (svc as any).timeIn || timeIn;
                const svcTimeOut = (svc as any).timeOut || timeOut;
                const svcUnits = (svc as any).units || units;
                
                toast.loading(`Processing service ${i + 1} of ${allServicesToProcess.length}...`, { id: 'joint-progress' });

                const formData = new FormData();
                const audioFieldName = isTcm ? 'audio' : 'text';
                
                // If there's no audio, we send a tiny silent audio placeholder (100 bytes) 
                // to satisfy n8n binary nodes that might fail on a truly empty 0-byte file.
                const audioPayload = createAudioUploadPayload(svc.audioBlob);
                const blobToSend = audioPayload.blob;
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
                    
                    const clinicalContextObj: any = { ...selectedPatient };
                    if (!clinicalContextObj.pcp_medications || clinicalContextObj.pcp_medications === 'None reported' || clinicalContextObj.pcp_medications.trim() === '') {
                        clinicalContextObj.pcp_medications = 'The client reports no current prescribed medications at the time of the assessment.';
                    }
                    if (!clinicalContextObj.psych_medications || clinicalContextObj.psych_medications === 'None reported' || clinicalContextObj.psych_medications.trim() === '') {
                        clinicalContextObj.psych_medications = 'The client reports no current psychotropic medications.';
                    }
                    if (!clinicalContextObj.physical_conditions || clinicalContextObj.physical_conditions.trim() === '') {
                        clinicalContextObj.physical_conditions = 'No acute physical medical conditions reported.';
                    }
                    clinicalContextObj.clinical_directives = 'Document all findings affirmatively. Do not use phrases like "not available", "not documented", or "not reported". If no medications or symptoms exist, state that client reports none.';

                    const clinicalContext = JSON.stringify(clinicalContextObj);
                    formData.append('patient_clinical_context', clinicalContext);
                } else {
                    formData.append('patient_name', patientInfo.name);
                    formData.append('patient_dob', patientInfo.dob);
                }

                // If it's a manual text service, use that as the primary context
                const medInstruction = (!selectedPatient?.pcp_medications || selectedPatient?.pcp_medications === 'None reported')
                    ? '\nMedications: The client reports no current prescribed medications.'
                    : '';
                const enrichedContext = `Encounter Context:\n${svc.manualText || patientInfo.context}\n\nDate: ${svcDate}\nTime In: ${svcTimeIn || 'Not specified'}\nTime Out: ${svcTimeOut || 'Not specified'}${medInstruction}\nClinical Documentation Directive: Document all findings affirmatively. Do not use phrases like 'not available', 'not documented', or 'not reported'. If no medications exist, document that client reports none.`;
                formData.append('patient_context', enrichedContext);
                
                // Add unique identifiers so n8n can process them completely separately
                formData.append('service_id', svc.id);
                formData.append('joint_note_index', (i + 1).toString());
                formData.append('joint_note_total', allServicesToProcess.length.toString());
                formData.append('is_joint_note', allServicesToProcess.length > 1 ? 'true' : 'false');

                if (clinicSettings) {
                    formData.append('agency_name', clinicSettings.clinicName || '');
                    formData.append('facility_name', clinicSettings.clinicName || '');
                    formData.append('facility_address', clinicSettings.physicalAddress || '');
                    formData.append('facility_phone', clinicSettings.mainPhone || '');
                    formData.append('facility_fax', clinicSettings.faxNumber || '');
                    formData.append('facility_email', clinicSettings.clinicEmail || '');
                }

                // Compute a unique service title to avoid n8n deduplicating multiple identical templates 
                const sameTypeBefore = allServicesToProcess.slice(0, i).filter(s => s.subTemplate === svc.subTemplate).length;
                const totalOfSameType = allServicesToProcess.filter(s => s.subTemplate === svc.subTemplate).length;
                let uniqueServiceTitle = svc.subTemplate;
                if (totalOfSameType > 1) {
                    uniqueServiceTitle = `${svc.subTemplate} (Part ${sameTypeBefore + 1})`;
                }

                if (isTcm) {
                    formData.append('template_id', selectedTemplateId);
                    formData.append('service_date', svcDate);
                    formData.append('time_in', svcTimeIn);
                    formData.append('time_out', svcTimeOut);
                    formData.append('units', svcUnits);
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
                        service_date: svcDate,
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

                let result: PDFResponse;
                try {
                    result = await PDFService.generatePDF(
                        formData,
                        {
                            template_id: selectedTemplateId,
                            patient_id: selectedPatient?.id
                        },
                        controller.signal
                    );
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!result.data || Object.keys(result.data).length === 0) {
                    // Specific handling for text-only TCM notes that the backend might not be ready for
                    if (audioPayload.isPlaceholder) {
                        throw new Error(`The backend (n8n) did not return a response for this text-only service. This usually means the workflow requires audio to proceed. Please record a short audio or update the n8n workflow.`);
                    }
                    throw new Error(`Service ${i + 1} (${svc.subTemplate}) returned an empty response. Verify n8n logs.`);
                }

                if (isTcm && result.data.template_id && result.data.template_id !== selectedTemplateId) {
                    console.warn('Template mismatch:', result.data.template_id);
                    // We allow it to continue if it's 'Other' but log the warning
                    if (svc.subTemplate !== 'Other') {
                        throw new Error(`Template mismatch for ${svc.subTemplate}: expected ${selectedTemplateId}`);
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
                    normalized.encounter.dos_date = svcDate;
                    normalized.encounter.time_in = svcTimeIn;
                    normalized.encounter.time_out = svcTimeOut;
                    
                    // Calculate duration in minutes and units strictly based on time span
                    const startMins = parseTimeToMinutes(svcTimeIn);
                    const endMins = parseTimeToMinutes(svcTimeOut);
                    let calcDuration = 0;
                    if (startMins !== null && endMins !== null) {
                        let diff = endMins - startMins;
                        if (diff < 0) diff += 1440;
                        calcDuration = diff;
                    }
                    if (calcDuration === 0 && svcUnits) {
                        calcDuration = parseInt(svcUnits) * 15;
                    }
                    if (calcDuration === 0) {
                        calcDuration = Math.round(svc.duration / 60) || 15;
                    }
                    
                    const calcUnits = Math.floor(calcDuration / 15) + (calcDuration % 15 >= 8 ? 1 : 0);
                    
                    normalized.encounter.duration = calcDuration.toString();
                    normalized.encounter.duration_minutes = calcDuration.toString();
                    normalized.encounter.units = calcUnits.toString();
                    
                    generatedNotes.push(normalized);
                }
            } // end loop

            toast.dismiss('joint-progress');
            
            if (generatedNotes.length > 0 && lastPdfResult) {
                // --- Overlap Check for Joint Notes using Standard Logic ---
                if (generatedNotes.length > 1) {
                    let hasOverlap = false;

                    // 1. Ensure all generated notes have a valid dos_date before we extract ISO strings
                    generatedNotes.forEach((note, idx) => {
                        if (note.encounter && (!note.encounter.dos_date || note.encounter.dos_date === '—')) {
                            const matchingSvc = allServicesToProcess[idx];
                            note.encounter.dos_date = (matchingSvc as any).serviceDate || serviceDate;
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
                        
                        if (outcomes.length > 0 || nextSteps.length > 0) {
                            toast.loading("Synthesizing joint narrative (n8n)...", { id: 'joint-progress' });
                            const synthesized = await PDFService.synthesizeJointNote(outcomes, nextSteps);
                            
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

        } catch (err: unknown) {
            toast.dismiss('joint-progress');
            console.error('Note generation failed.');
            const errorMessage = getPDFServiceErrorMessage(err);
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
        sessionStorage.removeItem('clio_encounter_draft');
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
        setTimeIn('');
        setTimeOut('');
        setUnits('');
        setDurationMin('');
        setActiveTab('info');
    };

    const handleBack = () => {
        const idParam = searchParams.get('id');
        if (idParam) {
            navigate(-1);
        } else {
            handleReset();
        }
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
        <div className="flex flex-col items-center max-w-7xl mx-auto w-full px-2 lg:px-4 pt-2 lg:pt-8 pb-12 animate-in fade-in duration-500">
            {status === 'done' && pdfResponse ? (
                <div className="max-w-6xl w-full space-y-4 animate-in fade-in duration-500">
                    {/* Back Button */}
                    <div className="flex items-center no-print">
                        <button
                            onClick={handleBack}
                            className="group flex items-center gap-2 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors font-black text-[10px] uppercase tracking-widest active:scale-[0.98] bg-transparent border-none p-0 outline-none cursor-pointer"
                        >
                            <ArrowLeft size={13} className="text-indigo-400" />
                            Back
                        </button>
                    </div>

                    <div id="review-workspace-root" className="clio-notes-new w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] rounded-[2.5rem] p-6 md:p-10 relative">
                        {isTemplatesLoading && (
                            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem]">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        )}
                        {clioNote ? (
                            <div className="pt-0 pb-4 px-2 md:px-0">
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
            ) : (
                <Card className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1540px] bg-transparent md:bg-surface border-0 md:border border-border/60 shadow-none md:shadow-soft rounded-2xl md:rounded-3xl xl:rounded-[2rem] 2xl:rounded-[2.5rem] overflow-visible md:overflow-hidden relative group transition-all duration-300">
                    <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8 space-y-3 sm:space-y-4 md:space-y-4 xl:space-y-5">
                        {showGuide && (
                            <div className="bg-gradient-to-r from-indigo-50/60 via-violet-50/40 to-slate-50 dark:from-indigo-950/10 dark:via-violet-950/5 dark:to-slate-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl p-6 relative animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm hidden md:flex flex-row items-center justify-between gap-6">
                                <button 
                                    onClick={() => {
                                        localStorage.setItem('clio_hide_guide', 'true');
                                        setShowGuide(false);
                                    }}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg font-bold leading-none p-1"
                                    title="Hide tutorial guide"
                                >
                                    &times;
                                </button>
                                <div className="space-y-1">
                                    <h4 className="text-[13px] font-black tracking-wider text-indigo-950 dark:text-indigo-200 uppercase flex items-center gap-2">
                                        {t('record.quick_start_guide', '✨ Quick Start Guide')}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                        {language === 'es' ? 'Completa estos sencillos pasos' : 'Complete these simple steps'}
                                        <span className="text-[#6366f1] dark:text-indigo-400 font-semibold animate-pulse">
                                            {language === 'es' ? ' (pasa el cursor para ver detalles)' : ' (hover steps for details)'}
                                        </span>:
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1 md:max-w-3xl">
                                    {/* Step 1 */}
                                    <div className="relative group/tooltip">
                                        <div className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 cursor-help",
                                            selectedPatient 
                                                ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-semibold" 
                                                : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-100 dark:hover:border-indigo-950"
                                        )}>
                                            <div className={cn(
                                                "size-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                                selectedPatient ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                            )}>
                                                {selectedPatient ? "✓" : "1"}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] font-black uppercase tracking-wider opacity-75">{t('record.step.client', 'Client')}</span>
                                                <span className="text-[11px] leading-tight truncate">
                                                    {selectedPatient ? selectedPatient.full_name : t('record.step.client_desc', 'Select client')}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Tooltip Content */}
                                        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2.5 w-60 p-3 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] rounded-xl shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 -translate-y-1 transition-all duration-300 text-center font-medium leading-relaxed">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95 dark:border-b-slate-950/95" />
                                            {language === 'es' 
                                                ? "Busca y selecciona un paciente del registro existente o crea uno nuevo haciendo clic en el botón con el signo \"+\"."
                                                : "Search and select a patient from the existing registry or create a new one by clicking the \"+\" button."}
                                        </div>
                                    </div>
                                    
                                    {/* Step 2 */}
                                    {(() => {
                                        const isStep2Done = Boolean(timeIn) && (Boolean(timeOut) || Boolean(units));
                                        return (
                                            <div className="relative group/tooltip">
                                                <div className={cn(
                                                    "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 cursor-help",
                                                    isStep2Done 
                                                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-semibold" 
                                                        : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-100 dark:hover:border-indigo-950"
                                                )}>
                                                    <div className={cn(
                                                        "size-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                                        isStep2Done ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                                    )}>
                                                        {isStep2Done ? "✓" : "2"}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-black uppercase tracking-wider opacity-75">{t('record.step.times', 'Times')}</span>
                                                        <span className="text-[11px] leading-tight truncate">
                                                            {isStep2Done ? `${timeIn} - ${timeOut || (units ? parseInt(units) * 15 + ' min' : '')}` : t('record.step.times_desc', 'Set date & times')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Tooltip Content */}
                                                <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2.5 w-60 p-3 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] rounded-xl shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 -translate-y-1 transition-all duration-300 text-center font-medium leading-relaxed">
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95 dark:border-b-slate-950/95" />
                                                    {language === 'es' 
                                                        ? "Selecciona la fecha y las horas del encuentro. Puedes ingresar la hora de inicio y fin, o simplemente la hora de inicio y la duración en minutos; el sistema calculará la hora final automáticamente."
                                                        : "Select the encounter date and times. You can input the start and end times, or simply the start time and duration in minutes; the system will automatically calculate the end time."}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Step 3 */}
                                    <div className="relative group/tooltip">
                                        <div className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 cursor-help",
                                            selectedSubTemplate 
                                                ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-semibold" 
                                                : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-100 dark:hover:border-indigo-950"
                                        )}>
                                            <div className={cn(
                                                "size-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                                selectedSubTemplate ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                            )}>
                                                {selectedSubTemplate ? "✓" : "3"}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] font-black uppercase tracking-wider opacity-75">{t('record.step.service', 'Service')}</span>
                                                <span className="text-[11px] leading-tight truncate">
                                                    {selectedSubTemplate ? selectedSubTemplate : t('record.step.service_desc', 'Select service')}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Tooltip Content */}
                                        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2.5 w-60 p-3 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] rounded-xl shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 -translate-y-1 transition-all duration-300 text-center font-medium leading-relaxed">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95 dark:border-b-slate-950/95" />
                                            {language === 'es' 
                                                ? "Elige el servicio clínico brindado. Si seleccionas \"Custom Template\", se activará un panel para pegar tu plantilla de texto personalizada. \"Other\" sirve para cualquier otro servicio no listado."
                                                : "Choose the clinical service provided. If you select \"Custom Template\", a panel will appear to paste your custom text template. \"Other\" is used for any other service not listed."}
                                        </div>
                                    </div>

                                    {/* Step 4 */}
                                    {(() => {
                                        const hasInput = Boolean(audioBlob) || Boolean(patientInfo.customTemplateText?.trim());
                                        return (
                                            <div className="relative group/tooltip">
                                                <div className={cn(
                                                    "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 cursor-help",
                                                    hasInput 
                                                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-semibold" 
                                                        : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-100 dark:hover:border-indigo-950"
                                                )}>
                                                    <div className={cn(
                                                        "size-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                                        hasInput ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                                    )}>
                                                        {hasInput ? "✓" : "4"}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-black uppercase tracking-wider opacity-75">{t('record.step.capture', 'Capture')} <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 lowercase">({language === 'es' ? 'opcional' : 'optional'})</span></span>
                                                        <span className="text-[11px] leading-tight truncate">
                                                            {audioBlob 
                                                                ? (language === 'es' ? "Audio grabado" : "Audio Recorded") 
                                                                : (patientInfo.customTemplateText?.trim() 
                                                                    ? (language === 'es' ? "Objetivos escritos" : "Objectives written") 
                                                                    : t('record.step.capture_desc', 'Record or write'))}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Tooltip Content */}
                                                <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2.5 w-60 p-3 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] rounded-xl shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 -translate-y-1 transition-all duration-300 text-center font-medium leading-relaxed">
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95 dark:border-b-slate-950/95" />
                                                    {language === 'es' 
                                                        ? "Presiona el icono de micrófono para grabar la sesión o describe los objetivos en el panel de texto. (Este paso es opcional si solo deseas registrar la información del servicio sin audio ni objetivos)."
                                                        : "Press the microphone icon to record the session, or write the goals/details in the text panel. (This step is optional if you only want to register the service info without audio or goals)."}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                        <div className="flex md:hidden border-b border-border/40 pb-1 mb-4 gap-1">
                            <button 
                                onClick={() => setActiveTab('info')}
                                className={cn(
                                    "flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all",
                                    activeTab === 'info' ? "border-primary text-primary" : "border-transparent text-slate-400"
                                )}
                            >
                                1. Info
                            </button>
                            <button 
                                onClick={() => setActiveTab('capture')}
                                className={cn(
                                    "flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all",
                                    activeTab === 'capture' ? "border-primary text-primary" : "border-transparent text-slate-400"
                                )}
                            >
                                2. Capture
                            </button>
                            <button 
                                onClick={() => setActiveTab('services')}
                                className={cn(
                                    "flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all relative",
                                    activeTab === 'services' ? "border-primary text-primary" : "border-transparent text-slate-400"
                                )}
                            >
                                3. Services
                                {recordedServices.length > 0 && (
                                    <Badge className="absolute -top-1 right-2 bg-primary text-primary-foreground size-5 p-0 flex items-center justify-center rounded-full text-[9px] font-black border border-background">
                                        {recordedServices.length}
                                    </Badge>
                                )}
                            </button>
                        </div>

                        {/* 1. Desktop Layout (hidden md:block) */}
                        <div className="hidden md:block space-y-2.5 md:space-y-3.5 xl:space-y-4">
                            {/* Top Tier: Mandatory Clinical Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-10 gap-2.5 md:gap-3 lg:gap-4 xl:gap-5 pb-3 md:pb-3.5 xl:pb-4 border-b border-slate-100 dark:border-slate-800">
                                {/* Patient Selection */}
                                <div className="space-y-3 md:col-span-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={14} className="text-slate-400" />
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{t('record.client_identity', 'Client identity')}</Label>
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
                                <div className="space-y-3 md:col-span-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={14} className="text-slate-400" />
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{t('record.encounter_info', 'Encounter Info')}</Label>
                                        {serviceDate && timeIn && <Check size={12} className="text-emerald-400" />}
                                    </div>
                                    <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-sm transition-all hover:border-slate-350 dark:hover:border-slate-700 focus-within:border-indigo-500/40 focus-within:ring-4 focus-within:ring-indigo-500/5 overflow-hidden mt-1 h-11 items-center">
                                        {/* Date */}
                                        <div className="flex-[1.0] min-w-[105px] border-r border-slate-100 dark:border-slate-800">
                                            <DatePicker 
                                                date={serviceDate} 
                                                setDate={setServiceDate} 
                                                className="h-11 rounded-none border-0 shadow-none bg-transparent w-full focus-visible:ring-0 px-2.5 font-medium text-slate-600 dark:text-slate-300 tracking-tight text-[13px]"
                                            />
                                        </div>
                                        {/* Time In */}
                                        <div className="border-r border-slate-100 dark:border-slate-800 h-full flex items-center pr-1">
                                            <Popover open={isTimePopoverOpen} onOpenChange={setIsTimePopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" className="h-11 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 font-semibold text-slate-500 dark:text-slate-300 min-w-[90px] w-auto flex items-center gap-1.5 justify-center transition-colors tracking-tight">
                                                        <Clock size={14} className="text-slate-400 dark:text-slate-400 shrink-0" />
                                                        <span className="text-[13px] whitespace-nowrap text-slate-600 dark:text-slate-300">{timeIn ? `In: ${timeIn}` : (language === 'es' ? 'Inicio' : 'Start')}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0 rounded-[2.5rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl" side="bottom" align="center" sideOffset={12}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-8 pb-4 text-center">
                                                            <span className="font-medium tracking-tight text-slate-800 dark:text-slate-100 text-[18px]">{language === 'es' ? 'Seleccionar hora' : 'Select Time'}</span>
                                                            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 opacity-80">{language === 'es' ? 'Inicio del encuentro' : 'Encounter Start'}</div>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeIn}
                                                                onConfirm={(timeStr) => {
                                                                    handleTimeInChange(timeStr);
                                                                    setIsTimePopoverOpen(false);
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        {/* Time Out */}
                                        <div className="border-r border-slate-100 dark:border-slate-800 h-full flex items-center pr-1">
                                            <Popover open={isTimeOutPopoverOpen} onOpenChange={setIsTimeOutPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" className="h-11 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 font-semibold text-slate-500 dark:text-slate-300 min-w-[90px] w-auto flex items-center gap-1.5 justify-center transition-colors tracking-tight">
                                                        <Clock size={14} className="text-slate-400 dark:text-slate-400 shrink-0" />
                                                        <span className="text-[13px] whitespace-nowrap text-slate-600 dark:text-slate-300">{timeOut ? `Out: ${timeOut}` : (language === 'es' ? 'Fin' : 'End')}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0 rounded-[2.5rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl" side="bottom" align="center" sideOffset={12}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-8 pb-4 text-center">
                                                            <span className="font-medium tracking-tight text-slate-800 dark:text-slate-100 text-[18px]">{language === 'es' ? 'Seleccionar hora' : 'Select Time'}</span>
                                                            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 opacity-80">{language === 'es' ? 'Fin del encuentro' : 'Encounter End'}</div>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeOut}
                                                                onConfirm={(timeStr) => {
                                                                    handleTimeOutChange(timeStr);
                                                                    setIsTimeOutPopoverOpen(false);
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        {/* Duration in Minutes */}
                                        <div className="w-[90px] h-full flex items-center px-2 shrink-0">
                                            <input 
                                                type="number"
                                                min="0"
                                                autoComplete="off"
                                                placeholder={language === 'es' ? "Min." : "Min"}
                                                value={durationMin}
                                                onChange={(e) => handleDurationMinChange(e.target.value)}
                                                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                                                className="h-full !border-0 focus:!border-0 focus:!border-transparent focus-visible:!border-0 focus-visible:!border-transparent bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none outline-none text-center text-[13px] w-full px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Service Provided */}
                                <div className="space-y-3 md:col-span-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ClipboardList size={14} className="text-slate-400" />
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{t('record.service_provided', 'Service Provided')}</Label>
                                        {selectedSubTemplate && <Check size={12} className="text-emerald-400" />}
                                    </div>
                                    <div ref={subTemplateDropdownRef} className="relative mt-1">
                                        <div 
                                            onClick={() => setIsDropdownOpen(true)}
                                            className={cn(
                                                "w-full h-11 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-sm cursor-text transition-all hover:border-slate-350 dark:hover:border-slate-700 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/5",
                                                isDropdownOpen ? "border-indigo-500/40 ring-4 ring-indigo-500/5" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <input
                                                    type="text"
                                                    style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                                    className="w-full h-full !border-0 focus:!border-0 focus:!border-transparent focus-visible:!border-0 focus-visible:!border-transparent bg-transparent focus:bg-transparent active:bg-transparent focus-visible:bg-transparent text-[13px] font-medium tracking-tight text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 p-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none outline-none"
                                                    placeholder="Select encounter type..."
                                                    value={isDropdownOpen ? subTemplateSearchQuery : selectedSubTemplate}
                                                    onChange={(e) => {
                                                        setSubTemplateSearchQuery(e.target.value);
                                                        setIsDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsDropdownOpen(true)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {selectedSubTemplate && isDropdownOpen && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedSubTemplate('');
                                                            setSubTemplateSearchQuery('');
                                                        }}
                                                        className="text-slate-450 hover:text-slate-650 dark:hover:text-slate-350 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <ChevronDown className={cn("size-4 text-slate-400 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                            </div>
                                        </div>

                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-500 ease-out">
                                                <div className="flex flex-col gap-1.5 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
                                                    {filteredSubTemplatesByGroup.length === 0 ? (
                                                        <div className="text-center py-8 text-slate-400 text-xs font-medium">
                                                            {language === 'es' ? 'No se encontraron servicios' : 'No services found'}
                                                        </div>
                                                    ) : (
                                                        filteredSubTemplatesByGroup.map((group) => (
                                                            <div key={group.category} className="mb-2.5 last:mb-0">
                                                                <div className="text-[9px] font-extrabold text-indigo-900/40 dark:text-indigo-400/40 uppercase tracking-widest px-4 py-1.5 select-none mb-1 border-b border-slate-100/50 dark:border-slate-800/50 pb-0.5">
                                                                    {group.category}
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    {group.items.map((t) => {
                                                                        const isActive = selectedSubTemplate === t;
                                                                        return (
                                                                            <button
                                                                                key={t}
                                                                                onClick={() => {
                                                                                    setSelectedSubTemplate(t);
                                                                                    setIsDropdownOpen(false);
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full justify-between items-center h-10 px-5 text-xs font-semibold rounded-full transition-colors flex group/item",
                                                                                    isActive ? 'bg-primary/5 text-primary hover:bg-primary/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                                                                )}
                                                                            >
                                                                                <span className="tracking-tight">{t}</span>
                                                                                {isActive && <Check size={14} strokeWidth={3} className="animate-in zoom-in" />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle Tier: Unified Capture Interface */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 xl:gap-7">
                                {/* Voice Capture Section */}
                                <TiltCard intensity={5} scale={1.005} className="h-full">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-[2rem] p-5 md:p-6 xl:p-7 flex flex-col gap-4 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_-8px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.08)] dark:hover:shadow-[0_12px_45px_-8px_rgba(0,0,0,0.5)] hover:border-indigo-200/60 dark:hover:border-indigo-900/50 h-full min-h-[240px] md:min-h-[260px] xl:min-h-[280px]">
                                        <div className="flex items-center justify-between w-full px-1">
                                            <div className="flex items-center gap-1.5">
                                                <Mic size={14} className="text-slate-400" />
                                                <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-100 dark:border-slate-800 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest text-[10px]">
                                                    {t('record.voice_capture', 'Voice Capture')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center flex-1 gap-3 xl:gap-4 w-full py-1">
                                            <div className="relative group w-fit flex items-center justify-center">
                                                {/* Continuous vector-sharp breathing aura */}
                                                {status === 'idle' && !audioBlob && (
                                                    <div className="absolute size-34 md:size-38 xl:size-42 animate-aura-breathing rounded-full pointer-events-none z-0" />
                                                )}

                                                <button
                                                    onClick={status === 'idle' && !audioBlob ? startRecording : (status === 'recording' ? stopRecording : undefined)}
                                                    disabled={!!audioBlob}
                                                    className={cn(
                                                        "relative size-23 md:size-25 xl:size-28 rounded-full flex items-center justify-center transition-all duration-355 ease-out transform-gpu will-change-transform z-10 border shadow-sm group/mic-btn overflow-hidden",
                                                        audioBlob 
                                                            ? "metallic-btn-emerald text-emerald-600 cursor-default" 
                                                            : status === 'recording'
                                                                ? "bg-gradient-to-tr from-rose-600 to-red-500 border-rose-500 text-white cursor-pointer hover:from-rose-700 hover:to-red-600 active:scale-95 animate-red-ring-pulse"
                                                                : "metallic-btn text-indigo-500/80 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 cursor-pointer active:scale-95 hover:shadow-[0_12px_30px_-4px_rgba(99,102,241,0.22)] hover:border-indigo-400/50 dark:hover:border-indigo-400/30"
                                                    )}
                                                >
                                                    <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none animate-shimmer-sweep" />

                                                    {status === 'recording' ? (
                                                        <div className="size-7 xl:size-8 rounded-md xl:rounded-lg bg-white shadow-md flex items-center justify-center animate-[zoom-in-50_0.2s_ease-out]">
                                                            <div className="size-3 xl:size-3.5 bg-rose-600 rounded-sm" />
                                                        </div>
                                                    ) : (
                                                        <div className="relative z-10 transition-all duration-300 ease-in-out flex items-center justify-center">
                                                            <Mic size={34} strokeWidth={1.5} className={cn(
                                                                "transition-colors duration-300 relative z-10 xl:hidden",
                                                                audioBlob ? "text-emerald-500" : "text-indigo-500/70 dark:text-slate-400 group-hover/mic-btn:text-indigo-600 group-hover/mic-btn:scale-105"
                                                            )} />
                                                            <Mic size={38} strokeWidth={1.5} className={cn(
                                                                "transition-colors duration-300 relative z-10 hidden xl:block",
                                                                audioBlob ? "text-emerald-500" : "text-indigo-500/70 dark:text-slate-400 group-hover/mic-btn:text-indigo-600 group-hover/mic-btn:scale-105"
                                                            )} />
                                                        </div>
                                                    )}
                                                </button>

                                                {audioBlob && (
                                                    <div className="absolute -top-1.5 -right-1.5 size-8 xl:size-9 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xl animate-in zoom-in-50 duration-500 z-20">
                                                        <Check size={16} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-center gap-1 min-h-[38px] justify-start mt-1">
                                                {status === 'recording' ? (
                                                    <div className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-500">
                                                        <span className="text-xl xl:text-2xl font-bold tabular-nums tracking-tighter text-rose-500 dark:text-rose-400">
                                                            {formatTime(timer)}
                                                        </span>
                                                        <div className="flex items-center gap-1 h-4 justify-center w-20 xl:w-24">
                                                            <span className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-sound-bar-1" />
                                                            <span className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-sound-bar-2" />
                                                            <span className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-sound-bar-3" />
                                                            <span className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-sound-bar-4" />
                                                            <span className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-sound-bar-2" />
                                                            <span className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-sound-bar-1" />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-50">
                                                            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">
                                                                {t('record.recording', 'Recording...')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-0.5 animate-in fade-in duration-500">
                                                        <p className={cn(
                                                            "text-[10px] xl:text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300",
                                                            audioBlob ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400/70 dark:text-slate-500"
                                                        )}>
                                                            {audioBlob ? t('record.session_finalized', 'Session Finalized') : t('record.system_standby', 'System Standby')}
                                                        </p>
                                                        {!audioBlob && (
                                                            <div className="h-3.5 flex items-center">
                                                                <p className="text-[10px] font-semibold text-indigo-500/60 dark:text-indigo-400/60 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-0.5 group-hover:translate-y-0">
                                                                    {t('record.ready_to_record', 'Ready to record')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2 w-full max-w-[200px] mt-0.5">
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
                                                            className="h-8 w-full rounded-full font-black text-[10px] uppercase tracking-[0.15em] text-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all"
                                                        >
                                                            {t('record.discard', 'Discard')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TiltCard>

                                {/* Text Capture Section */}
                                <TiltCard intensity={5} scale={1.005} className="h-full">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-[2rem] p-5 md:p-6 xl:p-7 flex flex-col gap-4 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_-8px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.08)] dark:hover:shadow-[0_12px_45px_-8px_rgba(0,0,0,0.5)] hover:border-indigo-200/60 dark:hover:border-indigo-900/50 h-full min-h-[240px] md:min-h-[260px] xl:min-h-[280px]">
                                        {selectedSubTemplate === 'Custom Template' ? (
                                            <div className="flex flex-col gap-3.5 h-full">
                                                <div className="flex-1 flex flex-col gap-2 relative">
                                                    <div className="flex items-center justify-between w-full px-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Target size={14} className="text-slate-400" />
                                                            <Badge variant="outline" className="bg-white/80 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 border-slate-100/50 dark:border-slate-800/50 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest text-[10px]">
                                                                {t('record.encounter_goals', 'Goals')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Textarea
                                                        value={patientInfo.context}
                                                        onChange={(e) => setPatientInfo(prev => ({ ...prev, context: e.target.value }))}
                                                        placeholder={t('record.goals_placeholder', 'Symptoms or session objectives...')}
                                                        className="w-full flex-1 min-h-[85px] bg-white/40 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800/60 px-3.5 py-2.5 text-[13px] font-medium rounded-xl text-slate-700 dark:text-slate-200 shadow-sm focus-visible:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:bg-white dark:hover:bg-slate-950/70 focus:bg-white dark:focus:bg-slate-950/90 transition-all duration-300"
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col gap-2 relative">
                                                    <div className="flex items-center justify-between w-full px-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Sparkles size={14} className="text-emerald-400 animate-pulse" />
                                                            <Badge variant="outline" className="bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/50 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest text-[10px]">
                                                                {language === 'es' ? 'Plantilla' : 'Template'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Textarea
                                                        value={patientInfo.customTemplateText}
                                                        onChange={(e) => setPatientInfo(prev => ({ ...prev, customTemplateText: e.target.value }))}
                                                        placeholder={language === 'es' ? 'Pega tu plantilla personalizada aquí...' : 'Paste your custom template here...'}
                                                        className="w-full flex-1 min-h-[85px] bg-white/40 dark:bg-slate-950/30 border border-emerald-200/40 dark:border-emerald-900/40 px-3.5 py-2.5 text-[13px] font-medium rounded-xl text-slate-700 dark:text-slate-200 shadow-sm focus-visible:ring-emerald-500/20 placeholder:text-slate-400 dark:placeholder:text-emerald-600 hover:bg-white dark:hover:bg-slate-950/70 focus:bg-white dark:focus:bg-slate-950/90 transition-all duration-300"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 h-full relative group/text flex-1">
                                                <div className="flex items-center justify-between w-full px-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Target size={14} className="text-slate-400" />
                                                        <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-100 dark:border-slate-800 font-bold px-2.5 py-0.5 rounded-full scale-90 uppercase tracking-widest text-[10px]">
                                                            {t('record.encounter_goals', 'Encounter Goals')}
                                                        </Badge>
                                                    </div>
                                                    {patientInfo.context.trim().length > 0 && (
                                                        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-500 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900 flex items-center gap-1 font-bold animate-in zoom-in px-2.5 py-0.5 rounded-full scale-90 text-[10px]">
                                                            <Check size={11} strokeWidth={3} /> {language === 'es' ? "Añadido" : "Added"}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col relative justify-start pt-1">
                                                    {!patientInfo.context.trim() && (
                                                        <div className="absolute inset-x-0 top-1 pointer-events-none px-1 flex group-focus-within/text:opacity-0 transition-opacity duration-300">
                                                            <div className="flex items-start gap-1">
                                                                <div className="w-[2px] h-4.5 bg-indigo-500/40 animate-cursor-blink rounded-full mt-0.5" />
                                                                <span className="text-[13px] font-medium text-slate-400/60 dark:text-slate-500/60 tracking-tight leading-relaxed animate-in fade-in">
                                                                    {t('record.goals_placeholder', 'Specify symptoms, history focus, or session objectives (optional)...')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Textarea
                                                        value={patientInfo.context}
                                                        onChange={(e) => setPatientInfo(prev => ({ ...prev, context: e.target.value }))}
                                                        placeholder=""
                                                        className="w-full flex-1 bg-transparent border-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0 text-[13px] font-medium text-slate-600 dark:text-slate-200 placeholder:text-transparent resize-none leading-relaxed transition-all shadow-none tracking-tight z-10 min-h-[110px] md:min-h-[130px] xl:min-h-[150px]"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TiltCard>
                            </div>

                            {/* Action & Status Tier */}
                            <div className="flex flex-col gap-2 xl:gap-2.5 pt-2.5 md:pt-3 xl:pt-4 mt-1 border-t border-slate-100/50 dark:border-slate-800/60">
                                {/* Compact Recorded Services Capsule Ribbon */}
                                {recordedServices.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto px-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="flex items-center gap-1.5 mr-1">
                                            <Layers className="text-indigo-500/70" size={13} />
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                {language === 'es' ? 'Añadidos' : 'Added'} ({recordedServices.length}):
                                            </span>
                                        </div>
                                        {recordedServices.map((svc, i) => (
                                            <div 
                                                key={svc.id} 
                                                className={cn(
                                                    "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] shadow-sm transition-all duration-300",
                                                    editingServiceId === svc.id 
                                                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                                                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                                                )}
                                            >
                                                <span className="size-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <span className="font-semibold truncate max-w-[140px] xl:max-w-[200px]">
                                                    {svc.subTemplate}
                                                </span>
                                                {(svc.timeIn || svc.timeOut || svc.units) && (
                                                    <span className="text-[10px] opacity-70 border-l border-slate-200 dark:border-slate-700 pl-1.5 whitespace-nowrap">
                                                        {svc.timeIn && svc.timeOut 
                                                            ? `${svc.timeIn}-${svc.timeOut}` 
                                                            : (svc.timeIn ? svc.timeIn : `${parseInt(svc.units || '0') * 15}m`)}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-700 pl-1">
                                                    <button 
                                                        onClick={() => handleEditService(svc)} 
                                                        className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                                        title={language === 'es' ? "Editar" : "Edit"}
                                                    >
                                                        <Edit2 size={10} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveService(svc.id)} 
                                                        className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                        title={language === 'es' ? "Eliminar" : "Delete"}
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={handleReset}
                                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors px-1.5 py-0.5"
                                            title={language === 'es' ? "Descartar todos" : "Discard all"}
                                        >
                                            {language === 'es' ? 'Descartar' : 'Discard'}
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-row items-stretch gap-3 xl:gap-4 w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto px-2">
                                    {(() => {
                                        const hasIdentity = selectedPatient || patientInfo.name.trim().length > 0;
                                        const canAdd = hasIdentity && serviceDate && selectedSubTemplate && (selectedSubTemplate !== 'Custom Template' || patientInfo.customTemplateText?.trim().length > 0);
                                        return (
                                            <>
                                                <Button
                                                    onClick={handleAddService}
                                                    disabled={!canAdd}
                                                    className={cn(
                                                        "h-10 md:h-10.5 xl:h-11 flex-1 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-[0.14em] gap-1.5 transition-all duration-300 shadow-sm border cursor-pointer",
                                                        canAdd 
                                                            ? (editingServiceId 
                                                                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-md shadow-primary/20 active:scale-95"
                                                                : "bg-card text-primary border-primary/25 hover:bg-primary/5 hover:border-primary/50 shadow-primary/5 active:scale-95") 
                                                            : "bg-muted/40 text-muted-foreground/60 border-border/40 shadow-none cursor-not-allowed"
                                                    )}
                                                >
                                                    {editingServiceId ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
                                                    <span>
                                                        {editingServiceId 
                                                            ? (language === 'es' ? "Guardar Cambios" : "Save Changes") 
                                                            : (audioBlob && (patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) 
                                                                ? (language === 'es' ? "Añadir Combinado" : "Add Combined") 
                                                                : (audioBlob 
                                                                    ? (language === 'es' ? "Añadir Audio" : "Add Audio") 
                                                                    : ((patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) 
                                                                        ? (language === 'es' ? "Añadir Texto" : "Add Texto") 
                                                                        : (language === 'es' ? "Añadir Servicio" : "Add Service"))))}
                                                    </span>
                                                </Button>
                                                {editingServiceId && (
                                                    <Button
                                                        onClick={handleCancelEdit}
                                                        variant="outline"
                                                        className="h-10 md:h-10.5 xl:h-11 flex-1 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground border border-border/80 bg-transparent hover:bg-secondary cursor-pointer active:scale-95"
                                                    >
                                                        {language === 'es' ? "Cancelar" : "Cancel"}
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {!editingServiceId && (
                                        <Button
                                            onClick={sendToGenerate}
                                            disabled={recordedServices.length === 0 || status === 'uploading' || status === 'processing'}
                                            className={cn(
                                                "h-10 md:h-10.5 xl:h-11 flex-1 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-[0.14em] gap-1.5 transition-all duration-300 active:scale-95 shadow-md cursor-pointer",
                                                recordedServices.length > 0
                                                    ? "bg-foreground text-background hover:bg-foreground/90 shadow-foreground/10"
                                                    : "bg-muted/40 text-muted-foreground/60 pointer-events-none border border-border/40"
                                            )}
                                        >
                                            {status === 'processing' || status === 'uploading' ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={13} />
                                                    <span>{language === 'es' ? "Procesando..." : "Processing..."}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileCheck size={13} />
                                                    <span>{language === 'es' ? "Finalizar" : "Finalize"} ({recordedServices.length})</span>
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {(!selectedPatient && !patientInfo.name.trim()) || !selectedSubTemplate ? (
                                    <p className="text-center text-[9px] xl:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em] animate-pulse transition-opacity duration-1000 mt-0.5">
                                        {t('record.fill_fields_to_enable', 'Fill patient & service fields to enable')}
                                    </p>
                                ) : null}
                                {!showGuide && (
                                    <div className="flex justify-center mt-1.5">
                                        <button 
                                            onClick={() => {
                                                localStorage.removeItem('clio_hide_guide');
                                                setShowGuide(true);
                                            }}
                                            className="text-[9px] xl:text-[10px] font-bold uppercase tracking-widest text-[#6366f1] hover:text-[#6366f1]/80 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1.5 p-1 px-3 rounded-full hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-indigo-50 dark:border-indigo-950/30"
                                        >
                                            <Compass className="size-3 text-[#6366f1] dark:text-indigo-400 animate-[spin_10s_linear_infinite]" />
                                            <span>{language === 'es' ? 'Mostrar Guía de Inicio' : 'Show Quick Start Guide'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>


                    </CardContent>
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
