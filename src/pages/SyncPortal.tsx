import React, { useState, useEffect, useRef, Fragment } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Key, 
    Clock, 
    User, 
    Lock, 
    ShieldCheck, 
    Play, 
    AlertTriangle,
    Eye,
    EyeOff,
    X,
    Info,
    Trash2,
    Check,
    UserPlus,
    FileText,
    Shield,
    ClipboardList,
    Phone,
    Mail,
    RotateCcw,
    Sparkles,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { formatSyncError } from '../lib/services/syncErrorFormatter';

export function SyncPortal() {
    const { user } = useAuth();
    const { language } = useLanguage();
    
    // Credentials and Integration States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [savedPassword, setSavedPassword] = useState('');
    const [pin, setPin] = useState('1206');
    const [mfaStatus, setMfaStatus] = useState<'not_connected' | 'awaiting_2fa' | 'connected' | 'expired' | 'processing'>('not_connected');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaChannel, setMfaChannel] = useState<'sms' | 'email'>('sms');
    
    // UI States
    const [loadingIntegration, setLoadingIntegration] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submittingMfa, setSubmittingMfa] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(true);
    
    // Filter & Search states
    const [tasks, setTasks] = useState<any[]>([]);
    const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
    const tasksPageSize = 10;
    const [searchTerm] = useState('');
    const [statusFilter] = useState<'all' | 'completed' | 'failed' | 'pending' | 'processing'>('all');
    const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
    
    // Selected task for detailed report view
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    // Fetch Integration credentials and status
    useEffect(() => {
        const fetchIntegration = async () => {
            if (!user?.id) return;
            try {
                // Fetch decrypted integration credentials
                const { data: decryptedData, error: rpcError } = await supabase.rpc('get_decrypted_integration', {
                    target_user_id: user.id,
                    secret_key: 'clio_bot_secret_decryption_token_9823472'
                });

                const data = Array.isArray(decryptedData) ? decryptedData[0] : decryptedData;

                if (data && !rpcError) {
                    setEmail(data.amexzone_email || '');
                    setPassword(data.amexzone_password || '');
                    setSavedPassword(data.amexzone_password || '');
                    setPin(data.amexzone_pin || '1206');
                    setMfaStatus(data.mfa_status || 'not_connected');
                    setMfaChannel(data.mfa_channel || 'sms');
                } else {
                    // Fallback to regular table select if RPC fails
                    const { data: rawData, error } = await supabase
                        .from('provider_integrations')
                        .select('*')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (error) throw error;

                    if (rawData) {
                        setEmail(rawData.amexzone_email || '');
                        setPassword(rawData.amexzone_password || '');
                        setSavedPassword(rawData.amexzone_password || '');
                        setPin(rawData.amexzone_pin || '1206');
                        setMfaStatus(rawData.mfa_status || 'not_connected');
                        setMfaChannel(rawData.mfa_channel || 'sms');
                    }
                }
            } catch (err) {
                console.error("Error fetching integration:", err);
            } finally {
                setLoadingIntegration(false);
            }
        };

        fetchIntegration();
    }, [user?.id]);

    // Fetch Logged Clinical Tasks (Excluding internal bot connection tasks)
    const fetchTasks = async () => {
        if (!user?.id) return;
        setLoadingTasks(true);
        try {
            const { data, error } = await supabase
                .from('amexzone_note_tasks')
                .select('*')
                .eq('user_id', user.id)
                .neq('note_text', '[CONNECT]')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            console.error("Error fetching tasks:", err);
            toast.error(language === 'es' ? "Error al obtener historial del bot" : "Error fetching bot logs");
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user?.id]);

    // Suscribirse en tiempo real a los cambios de las tareas
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('amexzone_note_tasks_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'amexzone_note_tasks',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchTasks();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Polling for MFA status updates when awaiting verification
    useEffect(() => {
        if (mfaStatus !== 'awaiting_2fa' && mfaStatus !== 'processing') return;

        let cancelled = false;
        let nextPoll: ReturnType<typeof setTimeout> | undefined;

        const pollMfaStatus = async () => {
            if (!user?.id || cancelled) return;

            try {
                const { data, error } = await supabase
                    .from('provider_integrations')
                    .select('mfa_status')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!error && data && data.mfa_status !== mfaStatus) {
                    setMfaStatus(data.mfa_status);
                    if (data.mfa_status === 'connected') {
                        toast.success(language === 'es' ? "¡Conexión establecida con éxito!" : "Amexzone connected successfully!");
                        setMfaCode('');
                        fetchTasks(); // Refresh tasks list
                    } else if (data.mfa_status === 'awaiting_2fa') {
                        setMfaCode('');
                    } else if (data.mfa_status === 'expired' || data.mfa_status === 'not_connected') {
                        setMfaCode('');
                        toast.error(language === 'es' ? "Fallo en la conexión o código expirado. Intenta de nuevo." : "Connection failed or code expired. Please try again.");
                    }
                }
            } finally {
                if (!cancelled) {
                    nextPoll = setTimeout(pollMfaStatus, 3000);
                }
            }
        };

        nextPoll = setTimeout(pollMfaStatus, 3000);

        return () => {
            cancelled = true;
            if (nextPoll) clearTimeout(nextPoll);
        };
    }, [mfaStatus, user?.id, language]);

    // OTP Input Refs and Handlers
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleOtpChange = (index: number, val: string) => {
        const numericVal = val.replace(/\D/g, '');
        
        // Handle Paste of multiple digits
        if (numericVal.length > 1) {
            const pasted = numericVal.slice(0, 6);
            setMfaCode(pasted);
            const focusIdx = Math.min(pasted.length, 5);
            otpRefs.current[focusIdx]?.focus();
            if (pasted.length === 6) {
                handleSubmitMfaCode(pasted);
            }
            return;
        }

        const chars = mfaCode.padEnd(6, ' ').split('').slice(0, 6);
        chars[index] = numericVal || '';
        const nextCode = chars.join('').trim();
        setMfaCode(nextCode);

        // Auto-advance to next slot
        if (numericVal && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are typed
        if (nextCode.length === 6 && !nextCode.includes(' ')) {
            handleSubmitMfaCode(nextCode);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!mfaCode[index] && index > 0) {
                otpRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            otpRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    // Disconnect / Reset Integration
    const confirmDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            const { error } = await supabase
                .from('provider_integrations')
                .update({
                    mfa_status: 'not_connected',
                    mfa_code: null,
                    session_cookies: null
                })
                .eq('user_id', user?.id);

            if (error) throw error;

            setMfaStatus('not_connected');
            setMfaCode('');
            setIsDisconnectModalOpen(false);
            toast.info(language === 'es' ? "Conexión desvinculada exitosamente." : "Connection reset successfully.");
        } catch (err: any) {
            console.error("Error resetting integration:", err);
            toast.error(err.message || "Failed to reset connection");
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Save Credentials & Trigger Connection Bot
    const handleConnect = async () => {
        if (!email || !password) {
            toast.error(language === 'es' ? "Por favor completa el email y la contraseña" : "Please fill in email and password");
            return;
        }

        setSaving(true);
        setMfaCode('');
        try {
            const passwordToSend = password === '••••••••••••' ? savedPassword : password;
            // Upsert credentials
            const { error } = await supabase
                .from('provider_integrations')
                .upsert({
                    user_id: user?.id,
                    amexzone_email: email,
                    amexzone_password: passwordToSend,
                    amexzone_pin: pin,
                    mfa_status: 'processing',
                    mfa_code: null,
                    mfa_channel: mfaChannel,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            // Trigger connection task for the server bot to authenticate
            const { error: taskError } = await supabase
                .from('amexzone_note_tasks')
                .insert({
                    user_id: user?.id,
                    patient_name: 'Connection Setup Verification',
                    note_text: '[CONNECT]',
                    status: 'pending'
                });

            if (taskError) {
                console.error("Error creating connection task:", taskError);
            }

            setMfaStatus('processing');
            toast.info(
                language === 'es' 
                    ? "Iniciando conexión. Verificando si requiere código 2FA." 
                    : "Connecting. Checking if 2FA verification code is required."
            );
            setTimeout(() => fetchTasks(), 1500); // Reload tasks list to show pending
        } catch (err: any) {
            console.error("Error saving integration:", err);
            toast.error(err.message || "Failed to update integration details");
        } finally {
            setSaving(false);
        }
    };

    // Submit MFA Code to Bot
    const handleSubmitMfaCode = async (codeOverride?: string) => {
        const code = (typeof codeOverride === 'string' ? codeOverride : mfaCode).trim();
        if (!code || code.length < 4) {
            toast.error(language === 'es' ? "Ingresa un código de verificación válido" : "Please enter a valid verification code");
            return;
        }

        setSubmittingMfa(true);
        try {
            const { error } = await supabase
                .from('provider_integrations')
                .update({
                    mfa_code: code,
                    mfa_status: 'processing',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user?.id);

            if (error) throw error;

            // Ensure an active [CONNECT] task exists for the worker to process
            const { data: existingTasks } = await supabase
                .from('amexzone_note_tasks')
                .select('id, status')
                .eq('user_id', user?.id)
                .eq('note_text', '[CONNECT]')
                .in('status', ['pending', 'processing'])
                .limit(1);

            if (!existingTasks || existingTasks.length === 0) {
                await supabase
                    .from('amexzone_note_tasks')
                    .insert({
                        user_id: user?.id,
                        patient_name: 'Connection Setup Verification',
                        note_text: '[CONNECT]',
                        status: 'pending'
                    });
            }

            setMfaStatus('processing');
            toast.success(language === 'es' ? "Código enviado. Verificando con Amexzone..." : "Code submitted. Verifying with Amexzone...");
            setTimeout(() => fetchTasks(), 1500);
        } catch (err: any) {
            console.error("Error submitting MFA code:", err);
            toast.error(err.message || "Failed to submit code");
        } finally {
            setSubmittingMfa(false);
        }
    };

    // Retry / Reprocess a single task
    const handleRetryTask = async (taskId: string) => {
        setRetryingTaskId(taskId);
        try {
            const { error } = await supabase
                .from('amexzone_note_tasks')
                .update({
                    status: 'pending',
                    error_message: null
                })
                .eq('id', taskId);

            if (error) throw error;

            toast.success(language === 'es' ? "Tarea reenviada a la cola" : "Task requeued successfully");
            fetchTasks();
        } catch (err: any) {
            console.error("Error retrying task:", err);
            toast.error(err.message || "Failed to retry task");
        } finally {
            setRetryingTaskId(null);
        }
    };

    // Filtered tasks based on search & tab selection
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = (task.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (task.note_text || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        if (statusFilter === 'all') return matchesSearch;
        return task.status === statusFilter && matchesSearch;
    });

    const getTaskActionType = (task: any) => {
        if (task.note_text && task.note_text.startsWith('[CONNECT]')) {
            return {
                icon: <Key size={14} className="text-amber-500 dark:text-amber-400" />,
                badgeClasses: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
                color: "bg-amber-500/10 dark:bg-amber-500/20",
                name: language === 'es' ? "Prueba de Conexión" : "Connection Test"
            };
        }
        if (task.note_text && task.note_text.startsWith('[IMPORT_PATIENT]')) {
            return {
                icon: <UserPlus size={14} className="text-sky-500 dark:text-sky-400" />,
                badgeClasses: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
                color: "bg-sky-500/10 dark:bg-sky-500/20",
                name: language === 'es' ? "Importar Paciente" : "Patient Import"
            };
        }
        return {
            icon: <FileText size={14} className="text-primary" />,
            badgeClasses: "bg-primary/10 text-primary border-primary/20",
            color: "bg-primary/10 dark:bg-primary/20",
            name: language === 'es' ? "Sincronizar Nota" : "Note Sync"
        };
    };

    if (loadingIntegration) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[420px]">
                <div className="flex flex-col items-center gap-3 p-8 rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-soft">
                    <RefreshCw size={26} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {language === 'es' ? "Cargando portal..." : "Loading portal..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-2 sm:px-4 pt-2 lg:pt-8 pb-16 space-y-6 lg:space-y-8">

            {/* Unified Two-Column Organic Glassmorphic Card */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)] rounded-3xl xl:rounded-[2.25rem] overflow-hidden transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/60 dark:divide-slate-800/80">
                    
                    {/* Left Column: Credentials & Form */}
                    <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                        <div className="space-y-5">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/70">
                                <div className="flex items-center gap-3.5">
                                    <div className="size-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                                        <Key size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                            {language === 'es' ? "Credenciales Amexzone" : "Amexzone Credentials"}
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {language === 'es' ? "Acceso directo al portal EMR" : "Direct EMR portal authentication"}
                                        </p>
                                    </div>
                                </div>
                                <ConnectionStatusPill status={mfaStatus} language={language} compact />
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-12 gap-4">
                                {/* Email */}
                                <div className="col-span-12 sm:col-span-6">
                                    <InputField
                                        label={language === 'es' ? "Correo Amexzone" : "Amexzone Email"}
                                        value={email}
                                        onChange={setEmail}
                                        placeholder="doctor@arcmentalhealth.com"
                                        icon={User}
                                        disabled={mfaStatus !== 'not_connected'}
                                    />
                                </div>

                                {/* Password */}
                                <div className="col-span-12 sm:col-span-6">
                                    <InputField
                                        label={language === 'es' ? "Contraseña" : "Password"}
                                        value={password}
                                        onChange={setPassword}
                                        placeholder="••••••••••••"
                                        icon={Lock}
                                        type="password"
                                        disabled={mfaStatus !== 'not_connected'}
                                    />
                                </div>

                                {/* Access PIN */}
                                <div className="col-span-5 sm:col-span-5">
                                    <InputField
                                        label={language === 'es' ? "PIN de Acceso" : "Access PIN"}
                                        value={pin}
                                        onChange={setPin}
                                        placeholder="1206"
                                        icon={Key}
                                        type="password"
                                        disabled={mfaStatus !== 'not_connected'}
                                    />
                                </div>

                                {/* MFA Channel Selector - Organic Pill Switcher Aligned with Access PIN */}
                                <div className="col-span-7 sm:col-span-7 space-y-1.5">
                                    <div className="flex items-center gap-2 ml-1">
                                        <div className="size-5 rounded-md flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30">
                                            <Shield size={11} />
                                        </div>
                                        <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider leading-none truncate">
                                            {language === 'es' ? "Canal 2FA" : "2FA Channel"}
                                        </label>
                                    </div>
                                    <div className="h-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 p-1 grid grid-cols-2 gap-1 shadow-2xs">
                                        <button
                                            type="button"
                                            onClick={() => setMfaChannel('sms')}
                                            disabled={mfaStatus !== 'not_connected'}
                                            className={`flex items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                                mfaChannel === 'sms'
                                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-indigo-100 dark:border-indigo-900/40"
                                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            }`}
                                        >
                                            <Phone size={12} />
                                            <span>SMS</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMfaChannel('email')}
                                            disabled={mfaStatus !== 'not_connected'}
                                            className={`flex items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                                mfaChannel === 'email'
                                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-indigo-100 dark:border-indigo-900/40"
                                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            }`}
                                        >
                                            <Mail size={12} />
                                            <span>{language === 'es' ? "Correo" : "Email"}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Status & Action Button */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                                <Info size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                                <span className="truncate font-medium">
                                    {mfaStatus === 'connected' && (language === 'es'
                                        ? "Sesión activa. Notas firmadas se sincronizan al instante."
                                        : "Active session. Signed notes sync automatically.")}
                                    {mfaStatus === 'expired' && (language === 'es'
                                        ? "Sesión caducada. Reconecta tu cuenta."
                                        : "Session expired. Please reconnect your account.")}
                                    {mfaStatus === 'awaiting_2fa' && (language === 'es'
                                        ? "Ingresa el código de 6 dígitos a la derecha."
                                        : "Enter the 6-digit code on the right panel.")}
                                    {mfaStatus === 'processing' && (language === 'es'
                                        ? "Validando credenciales con Amexzone..."
                                        : "Verifying credentials with Amexzone...")}
                                    {mfaStatus === 'not_connected' && (language === 'es'
                                        ? "Autorización válida por 90 días al conectar."
                                        : "90-day session authorization upon connection.")}
                                </span>
                            </div>

                            <div className="shrink-0">
                                {mfaStatus !== 'connected' && mfaStatus !== 'processing' && mfaStatus !== 'awaiting_2fa' ? (
                                    <button
                                        onClick={handleConnect}
                                        disabled={saving}
                                        className="w-full sm:w-auto px-6 h-10 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer select-none"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw size={14} className="animate-spin text-white" />
                                                <span>{language === 'es' ? "Conectando..." : "Connecting..."}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={13} className="text-white fill-white" />
                                                <span>{language === 'es' ? "Conectar Cuenta" : "Connect Account"}</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsDisconnectModalOpen(true)}
                                        className="w-full sm:w-auto px-5 h-10 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                                    >
                                        <Trash2 size={13} />
                                        <span>{language === 'es' ? "Desconectar" : "Disconnect"}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: 2FA Verification / Progress / Status */}
                    <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-950/30 p-6 sm:p-8 flex flex-col justify-center">
                        {mfaStatus === 'awaiting_2fa' ? (
                            <div className="flex flex-col justify-between h-full space-y-5 animate-in fade-in duration-200">
                                <div className="text-center space-y-2.5">
                                    <div className="mx-auto size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                                        <ShieldCheck size={22} />
                                    </div>

                                    <div>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                            {language === 'es' ? "Paso 2 de 3 • Código 2FA" : "Step 2 of 3 • 2FA Code"}
                                        </span>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                                            {language === 'es'
                                                ? (mfaChannel === 'email' ? "Código enviado a tu correo" : "Código enviado por SMS")
                                                : (mfaChannel === 'email' ? "Enter Email Security Code" : "Enter SMS Security Code")}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {language === 'es'
                                                ? "Ingresa los 6 dígitos recibidos de Amexzone."
                                                : "Enter the 6-digit code sent by Amexzone."}
                                        </p>
                                    </div>

                                    {/* 6-Box Segmented OTP Inputs */}
                                    <div className="pt-1">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {[0, 1, 2, 3, 4, 5].map((idx) => {
                                                const digit = mfaCode[idx] || '';
                                                return (
                                                    <Fragment key={idx}>
                                                        {idx === 3 && (
                                                            <span className="text-slate-300 dark:text-slate-600 font-bold text-sm px-0.5 select-none">-</span>
                                                        )}
                                                        <input
                                                            ref={(el) => { otpRefs.current[idx] = el; }}
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            maxLength={idx === 0 ? 6 : 1}
                                                            value={digit}
                                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                                            disabled={submittingMfa}
                                                            autoFocus={idx === 0}
                                                            className={`w-9 h-11 sm:w-10 sm:h-11 rounded-2xl text-center text-base sm:text-lg font-bold font-mono transition-all bg-white dark:bg-slate-900 border focus:outline-none select-none ${
                                                                digit
                                                                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-500/15"
                                                                    : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                                                            }`}
                                                        />
                                                    </Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <button
                                        onClick={() => handleSubmitMfaCode()}
                                        disabled={submittingMfa || mfaCode.length < 6}
                                        className={`w-full h-10 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none ${
                                            mfaCode.length === 6 && !submittingMfa
                                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-500/20 cursor-pointer"
                                                : "bg-slate-200/80 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                        }`}
                                    >
                                        {submittingMfa ? (
                                            <>
                                                <RefreshCw size={14} className="animate-spin" />
                                                <span>{language === 'es' ? "Verificando..." : "Verifying..."}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={14} />
                                                <span>{language === 'es' ? "Verificar y Conectar" : "Verify & Connect"}</span>
                                            </>
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={handleConnect}
                                            disabled={saving || submittingMfa}
                                            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            {language === 'es' ? "Solicitar nuevo código" : "Request a new code"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : mfaStatus === 'processing' ? (
                            <div className="flex flex-col justify-between h-full space-y-4 animate-in fade-in duration-200">
                                <div className="text-center space-y-2.5">
                                    <div className="mx-auto size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <RefreshCw size={20} className="animate-spin" />
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            {mfaCode
                                                ? (language === 'es' ? "Confirmando código 2FA..." : "Confirming 2FA code...")
                                                : (language === 'es' ? "Conectando con Amexzone..." : "Connecting to Amexzone...")}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {language === 'es'
                                                ? "Esto toma unos segundos."
                                                : "This takes a few seconds."}
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-left text-xs shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {language === 'es' ? "Credenciales enviadas" : "Credentials sent"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {mfaCode ? (
                                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                            ) : (
                                                <RefreshCw size={14} className="text-indigo-500 animate-spin shrink-0" />
                                            )}
                                            <span className={mfaCode ? "text-slate-700 dark:text-slate-300 font-medium" : "text-indigo-600 dark:text-indigo-400 font-semibold"}>
                                                {language === 'es'
                                                    ? `Solicitando código (${mfaChannel.toUpperCase()})`
                                                    : `Requesting code (${mfaChannel.toUpperCase()})`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {mfaCode ? (
                                                <RefreshCw size={14} className="text-indigo-500 animate-spin shrink-0" />
                                            ) : (
                                                <Clock size={14} className="text-slate-400 shrink-0" />
                                            )}
                                            <span className={mfaCode ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-400 dark:text-slate-500"}>
                                                {language === 'es' ? "Guardando sesión (90 días)" : "Saving session (90 days)"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={confirmDisconnect}
                                        className="text-[11px] text-slate-500 hover:text-rose-500 font-medium transition-colors cursor-pointer"
                                    >
                                        {language === 'es' ? "Cancelar conexión" : "Cancel connection"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full space-y-3.5 py-2">
                                <div className={`size-14 rounded-2xl flex items-center justify-center border transition-all shadow-2xs ${
                                    mfaStatus === 'connected'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                }`}>
                                    {mfaStatus === 'connected' ? <ShieldCheck size={26} /> : <Shield size={26} />}
                                </div>
                                
                                <div className="space-y-1 max-w-[270px]">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {mfaStatus === 'connected' 
                                            ? (language === 'es' ? "Puente EMR Activo" : "EMR Bridge Active")
                                            : (language === 'es' ? "Sincronización Automática" : "Automated EMR Sync")}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {mfaStatus === 'connected'
                                            ? (language === 'es' 
                                                ? "Tus notas firmadas e importaciones se procesan automáticamente en segundo plano."
                                                : "Your signed notes and patient imports are automatically processed in the background.")
                                            : (language === 'es'
                                                ? "Conecta tu cuenta para enviar notas firmadas e importar pacientes desde Amexzone."
                                                : "Connect your account to dispatch signed notes and import patients from Amexzone.")}
                                    </p>
                                </div>

                                {mfaStatus === 'connected' ? (
                                    <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-[10.5px] uppercase tracking-wider bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                                        <Sparkles size={12} className="text-emerald-500 shrink-0" />
                                        <span>{language === 'es' ? "Listo para sincronizar" : "Ready to dispatch"}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                        <span className="px-3 py-1 rounded-full text-[10.5px] font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                            {language === 'es' ? "Envío de Notas" : "Note Dispatch"}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-[10.5px] font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                            {language === 'es' ? "Importar Pacientes" : "Patient Import"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Bottom Section: Synced Notes History */}
            <div className="space-y-3.5">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {language === 'es' ? "Historial de Sincronización" : "Sync Activity History"}
                        </h3>
                        {tasks.length > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {tasks.length}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={fetchTasks}
                        disabled={loadingTasks}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loadingTasks ? "animate-spin" : ""} />
                        <span>{language === 'es' ? "Actualizar" : "Refresh"}</span>
                    </button>
                </div>

                {loadingTasks ? (
                    <div className="py-14 flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl shadow-xs">
                        <RefreshCw size={22} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {language === 'es' ? "Cargando historial..." : "Loading sync history..."}
                        </p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="py-14 text-center bg-white/95 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl px-6 space-y-2.5 shadow-xs">
                        <div className="size-12 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                            <ClipboardList size={20} />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {language === 'es' ? "Sin actividad de sincronización" : "No synced notes yet"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                            {language === 'es' 
                                ? "Las notas firmadas e importaciones de pacientes aparecerán aquí automáticamente." 
                                : "Signed progress notes and patient imports will appear here automatically."}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-xs">
                        {/* Solid Minimalist Table Header (Desktop) */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                            <div className="col-span-4">{language === 'es' ? "Paciente" : "Patient"}</div>
                            <div className="col-span-4">{language === 'es' ? "Acción / Servicio" : "Action / Service"}</div>
                            <div className="col-span-2">{language === 'es' ? "Fecha" : "Date"}</div>
                            <div className="col-span-2 text-right">{language === 'es' ? "Estado" : "Status"}</div>
                        </div>

                        {/* Continuous Task Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {(() => {
                                const totalTaskPages = Math.ceil(filteredTasks.length / tasksPageSize);
                                const paginatedTasks = filteredTasks.slice((tasksCurrentPage - 1) * tasksPageSize, tasksCurrentPage * tasksPageSize);

                                return (
                                    <>
                                        {paginatedTasks.map((task) => {
                                            const details = getTaskActionType(task);
                                            const taskDate = new Date(task.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });
                                            const hasSummary = (task.status === 'completed' && task.result_summary) || (task.status === 'failed' && task.error_message);

                                            return (
                                                <Fragment key={task.id}>
                                                    {/* Desktop View (lg+) */}
                                                    <div
                                                        onClick={() => { if (hasSummary) setSelectedTask(task); }}
                                                        className={`hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors duration-150 group ${
                                                            hasSummary ? 'cursor-pointer' : ''
                                                        }`}
                                                    >
                                                        {/* Patient Column */}
                                                        <div className="lg:col-span-4 flex items-center gap-3 w-full min-w-0">
                                                            <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {task.patient_name ? task.patient_name.charAt(0).toUpperCase() : <User size={13} />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                                                                    {task.patient_name || (language === 'es' ? 'Paciente sin nombre' : 'Unnamed Patient')}
                                                                </p>
                                                                {task.patient_dob && (
                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">DOB: {task.patient_dob}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Clinical Note / Service Column */}
                                                        <div className="lg:col-span-4 flex items-center gap-2.5 w-full min-w-0">
                                                            <span className={`size-8 rounded-xl flex items-center justify-center text-xs ${details.color} shrink-0 border border-slate-200/80 dark:border-slate-800`}>
                                                                {details.icon}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate">
                                                                    {details.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block truncate">
                                                                    ID: {task.id.substring(0, 8)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Date Column */}
                                                        <div className="lg:col-span-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                                            <Clock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                            <span className="truncate">{taskDate}</span>
                                                        </div>

                                                        {/* Status Column */}
                                                        <div className="lg:col-span-2 w-full flex items-center justify-end gap-2 shrink-0">
                                                            {task.status === 'failed' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRetryTask(task.id); }}
                                                                    disabled={retryingTaskId === task.id}
                                                                    className="h-7 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer disabled:opacity-50 shrink-0"
                                                                    title={language === 'es' ? "Reintentar sincronización" : "Retry sync"}
                                                                >
                                                                    <RotateCcw size={11} className={retryingTaskId === task.id ? "animate-spin" : ""} />
                                                                    <span>{language === 'es' ? "Reintentar" : "Retry"}</span>
                                                                </button>
                                                            )}
                                                            <TaskStatusBadge status={task.status} language={language} />
                                                        </div>
                                                    </div>

                                                    {/* Mobile View (< lg) */}
                                                    <div
                                                        onClick={() => { if (hasSummary) setSelectedTask(task); }}
                                                        className={`block lg:hidden p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-150 ${
                                                            hasSummary ? 'cursor-pointer active:bg-slate-100 dark:active:bg-slate-800/50' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-xs font-bold shrink-0">
                                                                    {task.patient_name ? task.patient_name.charAt(0).toUpperCase() : <User size={13} />}
                                                                </div>
                                                                <div className="min-w-0 flex items-center gap-1.5 flex-1">
                                                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[130px] sm:max-w-[200px]">
                                                                        {task.patient_name || (language === 'es' ? 'Paciente sin nombre' : 'Unnamed Patient')}
                                                                    </p>
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${details.badgeClasses} shrink-0 border`}>
                                                                        <span className="scale-75 origin-center -mr-0.5">{details.icon}</span>
                                                                        <span className="truncate max-w-[90px] sm:max-w-[120px]">{details.name}</span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {task.status === 'failed' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleRetryTask(task.id); }}
                                                                        disabled={retryingTaskId === task.id}
                                                                        className="h-6 px-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                                                        title={language === 'es' ? "Reintentar sincronización" : "Retry sync"}
                                                                    >
                                                                        <RotateCcw size={10} className={retryingTaskId === task.id ? "animate-spin" : ""} />
                                                                        <span>{language === 'es' ? "Reintentar" : "Retry"}</span>
                                                                    </button>
                                                                )}
                                                                <TaskStatusBadge status={task.status} language={language} />
                                                                {hasSummary && (
                                                                    <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="pl-10 mt-1 flex items-center gap-2 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium tracking-tight truncate">
                                                            {task.patient_dob && (
                                                                <>
                                                                    <span className="font-mono text-slate-500 dark:text-slate-400">DOB: {task.patient_dob}</span>
                                                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                                                </>
                                                            )}
                                                            <span className="flex items-center gap-1 truncate font-mono">
                                                                <Clock size={10} className="shrink-0 text-slate-400 dark:text-slate-500" />
                                                                {taskDate}
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                                            <span className="font-mono text-slate-400/80">#{task.id.substring(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                </Fragment>
                                            );
                                        })}

                                        {/* Pagination Footer */}
                                        {totalTaskPages > 1 && (
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    {language === 'es'
                                                        ? `Mostrando ${((tasksCurrentPage - 1) * tasksPageSize) + 1} - ${Math.min(tasksCurrentPage * tasksPageSize, filteredTasks.length)} de ${filteredTasks.length.toLocaleString()}`
                                                        : `Showing ${((tasksCurrentPage - 1) * tasksPageSize) + 1} - ${Math.min(tasksCurrentPage * tasksPageSize, filteredTasks.length)} of ${filteredTasks.length.toLocaleString()}`}
                                                </span>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => setTasksCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={tasksCurrentPage === 1}
                                                        className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 transition-all cursor-pointer"
                                                        title={language === 'es' ? "Página anterior" : "Previous page"}
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    
                                                    {Array.from({ length: Math.min(5, totalTaskPages) }).map((_, idx) => {
                                                        let pageNum = idx + 1;
                                                        if (tasksCurrentPage > 3) {
                                                            pageNum = tasksCurrentPage - 3 + idx;
                                                        }
                                                        if (pageNum > totalTaskPages) return null;

                                                        const isCurrent = tasksCurrentPage === pageNum;
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setTasksCurrentPage(pageNum)}
                                                                className={`size-8 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                                                                    isCurrent
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                                                }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    })}

                                                    {totalTaskPages > 5 && tasksCurrentPage < totalTaskPages - 2 && (
                                                        <>
                                                            <span className="text-slate-400 px-1 font-semibold text-xs">...</span>
                                                            <button
                                                                onClick={() => setTasksCurrentPage(totalTaskPages)}
                                                                className="size-8 text-xs font-bold rounded-full border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                                                            >
                                                                {totalTaskPages}
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => setTasksCurrentPage(prev => Math.min(prev + 1, totalTaskPages))}
                                                        disabled={tasksCurrentPage === totalTaskPages}
                                                        className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 transition-all cursor-pointer"
                                                        title={language === 'es' ? "Página siguiente" : "Next page"}
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Inspection Modal (View Result Summary) */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3.5">
                                <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <ClipboardList size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                                        {language === 'es' ? "Resumen de Sincronización" : "Sync Execution Summary"}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                        {selectedTask.patient_name || 'Amexzone Task'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            
                            {/* Summary Status Box */}
                            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                                selectedTask.status === 'completed' 
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300' 
                                    : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-300'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    {selectedTask.status === 'completed' ? (
                                        <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    ) : (
                                        <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                    )}
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {selectedTask.status === 'completed' 
                                            ? (language === 'es' ? "Sincronización Completada" : "Execution Successful")
                                            : (language === 'es' ? "Error de Sincronización" : "Execution Error")}
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono font-bold opacity-80">
                                    ID: {selectedTask.id.substring(0, 8)}
                                </span>
                            </div>

                            {/* Failure Details */}
                            {selectedTask.status === 'failed' && (() => {
                                const formatted = formatSyncError(selectedTask.error_message);
                                return (
                                    <div className="space-y-3.5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                                {language === 'es' ? "Motivo del Fallo" : "Failure Reason"}
                                            </h4>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                {formatted.categoryLabel}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
                                            <div className="font-bold text-sm text-rose-800 dark:text-rose-200 mb-1">
                                                {formatted.title}
                                            </div>
                                            <p className="opacity-90">
                                                {formatted.description}
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-2.5">
                                            <Info size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="block mb-0.5 text-indigo-950 dark:text-indigo-100">
                                                    {language === 'es' ? "Acción recomendada:" : "Recommended action:"}
                                                </strong>
                                                <p className="text-indigo-800/90 dark:text-indigo-300">
                                                    {formatted.actionHint}
                                                </p>
                                            </div>
                                        </div>

                                        {formatted.rawError && (
                                            <div className="pt-1">
                                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                                                    {language === 'es' ? "Detalle técnico:" : "Technical log:"}
                                                </span>
                                                <pre className="p-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-x-auto max-h-24 whitespace-pre-wrap">
                                                    {formatted.rawError}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Scraped Demographic Data Summary */}
                            {selectedTask.status === 'completed' && selectedTask.result_summary && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        {language === 'es' ? "Datos Extraídos" : "Extracted Demographics"}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                                        <DetailRow label="EMR ID / Case #" value={selectedTask.result_summary.emr_id || 'N/A'} />
                                        <DetailRow label="SSN" value={selectedTask.result_summary.ssn || 'N/A'} />
                                        <DetailRow label="Phone" value={selectedTask.result_summary.phone || 'N/A'} />
                                        <DetailRow label="Gender" value={selectedTask.result_summary.gender || 'N/A'} />
                                        <DetailRow label="PCP" value={selectedTask.result_summary.pcp_name || 'N/A'} />
                                        <DetailRow label="Psychiatrist" value={selectedTask.result_summary.psych_name || 'N/A'} />
                                        <DetailRow label="Marital Status" value={selectedTask.result_summary.marital_status || 'N/A'} />
                                        <DetailRow label="Emergency Contact" value={selectedTask.result_summary.emergency_contact_name || 'N/A'} />
                                        <div className="sm:col-span-2 border-t border-slate-200/70 dark:border-slate-800 pt-2.5 mt-0.5">
                                            <DetailRow label="Address" value={selectedTask.result_summary.address || 'N/A'} />
                                        </div>
                                    </div>

                                    {selectedTask.result_summary.diagnoses && (
                                        <div className="space-y-1.5">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                {language === 'es' ? "Diagnósticos (ICD-10)" : "Clinical Diagnoses (ICD-10)"}
                                            </h4>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-medium text-slate-800 dark:text-slate-200">
                                                {selectedTask.result_summary.diagnoses}
                                            </div>
                                        </div>
                                    )}

                                    {selectedTask.result_summary.psych_medications && (
                                        <div className="space-y-1.5">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                {language === 'es' ? "Medicamentos Psiquiátricos" : "Psychiatric Medications"}
                                            </h4>
                                            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 text-xs leading-relaxed whitespace-pre-wrap font-medium text-slate-800 dark:text-slate-200">
                                                {selectedTask.result_summary.psych_medications}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            {selectedTask.status === 'failed' ? (
                                <button
                                    onClick={() => {
                                        const id = selectedTask.id;
                                        setSelectedTask(null);
                                        handleRetryTask(id);
                                    }}
                                    className="px-5 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <RotateCcw size={13} />
                                    <span>{language === 'es' ? "Reintentar" : "Retry Task"}</span>
                                </button>
                            ) : <div />}

                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-5 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                            >
                                {language === 'es' ? "Cerrar" : "Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disconnect Confirmation Modal */}
            {isDisconnectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl w-full max-w-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-2.5">
                            <div className="size-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                                <AlertTriangle size={22} />
                            </div>
                            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                {language === 'es' ? "¿Desconectar Amexzone?" : "Disconnect Amexzone?"}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {language === 'es'
                                    ? "Se cerrará la sesión activa del bot. Podrás editar tus credenciales y reconectar cuando quieras."
                                    : "This will clear the active bot session. You can edit your credentials and reconnect anytime."}
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDisconnectModalOpen(false)}
                                disabled={isDisconnecting}
                                className="flex-1 h-10 rounded-full bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
                            >
                                {language === 'es' ? "Cancelar" : "Cancel"}
                            </button>
                            <button
                                type="button"
                                onClick={confirmDisconnect}
                                disabled={isDisconnecting}
                                className="flex-1 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isDisconnecting ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        <span>{language === 'es' ? "Saliendo..." : "Disconnecting..."}</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={13} />
                                        <span>{language === 'es' ? "Desconectar" : "Disconnect"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Connection Status Pill with clean Light & Dark Mode support
function ConnectionStatusPill({ 
    status, 
    language,
    compact = false 
}: { 
    status: 'not_connected' | 'awaiting_2fa' | 'connected' | 'expired' | 'processing';
    language: string;
    compact?: boolean;
}) {
    const sizeClasses = compact ? 'px-3 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs';

    if (status === 'connected') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 ${sizeClasses}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>{language === 'es' ? "Conectado" : "Connected"}</span>
            </span>
        );
    }

    if (status === 'awaiting_2fa') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 ${sizeClasses}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>{language === 'es' ? "Esperando 2FA" : "Awaiting 2FA"}</span>
            </span>
        );
    }

    if (status === 'processing') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 ${sizeClasses}`}>
                <RefreshCw size={10} className="animate-spin text-indigo-500" />
                <span>{language === 'es' ? "Verificando" : "Verifying"}</span>
            </span>
        );
    }

    if (status === 'expired') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 ${sizeClasses}`}>
                <AlertTriangle size={10} className="text-rose-500" />
                <span>{language === 'es' ? "Expirado" : "Expired"}</span>
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200/90 dark:border-slate-700/80 ${sizeClasses}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
            <span>{language === 'es' ? "Desconectado" : "Disconnected"}</span>
        </span>
    );
}

// Task Status Badges for Pending, Processing, Completed, Failed
function TaskStatusBadge({ status, language }: { status: string; language: string }) {
    if (status === 'completed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>{language === 'es' ? "Completado" : "Completed"}</span>
            </span>
        );
    }

    if (status === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider animate-pulse">
                <RefreshCw size={10} className="animate-spin text-blue-500" />
                <span>{language === 'es' ? "Procesando" : "Processing"}</span>
            </span>
        );
    }

    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                <AlertCircle size={11} className="text-rose-500" />
                <span>{language === 'es' ? "Fallido" : "Failed"}</span>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
            <Clock size={11} className="text-amber-500" />
            <span>{language === 'es' ? "Pendiente" : "Pending"}</span>
        </span>
    );
}

// Inline input field helper matching PremiumGlassField
function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text", disabled = false, className = "" }: any) {
    const [showPasswordText, setShowPasswordText] = useState(false);
    const isPasswordField = type === "password";
    const currentInputType = isPasswordField ? (showPasswordText ? "text" : "password") : type;

    return (
        <div className={`group space-y-1.5 ${className}`}>
            <div className="flex items-center gap-2 ml-1">
                {Icon && (
                    <div className="size-5 rounded-md flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 shrink-0">
                        <Icon size={11} />
                    </div>
                )}
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider leading-none truncate">
                    {label}
                </label>
            </div>
            <div className="relative flex items-center">
                <input
                    type={currentInputType}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full h-10 px-4 ${isPasswordField ? 'pr-10' : ''} rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500/60 transition-all shadow-2xs disabled:opacity-55 disabled:cursor-not-allowed`}
                    placeholder={placeholder}
                />
                {isPasswordField && (
                    <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        tabIndex={-1}
                        className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={showPasswordText ? "Hide" : "Show"}
                    >
                        {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
}

// Helper row inside report modal
function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">{value}</p>
        </div>
    );
}
