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
    Search,
    Eye,
    EyeOff,
    X,
    Info,
    Trash2,
    Check,
    UserPlus,
    FileText,
    Shield,
    Activity,
    ClipboardList,
    Phone,
    Mail,
    RotateCcw,
    Sparkles,
    Calendar,
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
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'pending' | 'processing'>('all');
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
            <div className="flex-1 flex items-center justify-center min-h-[460px]">
                <div className="flex flex-col items-center gap-4 p-8 rounded-3xl backdrop-blur-xl bg-card/60 border border-border/60 shadow-soft">
                    <RefreshCw size={36} className="animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest animate-pulse">
                        {language === 'es' ? "Cargando Portal de Sincronización..." : "Loading Sync Portal..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-2 lg:px-4 pt-2 lg:pt-8 pb-16 space-y-4 md:space-y-6 lg:space-y-8">

            {/* Main Frosted Glass Connection Card */}
            <div className="backdrop-blur-2xl bg-card/95 border border-border/60 shadow-elevated rounded-2xl sm:rounded-3xl p-4 sm:p-8 relative overflow-hidden transition-all duration-300">
                {/* Subtle Ambient Radial Glow */}
                <div 
                    className={`pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10 transition-colors duration-700 ${
                        mfaStatus === 'connected' 
                            ? 'bg-emerald-500' 
                            : mfaStatus === 'processing' 
                            ? 'bg-indigo-500' 
                            : mfaStatus === 'expired' 
                            ? 'bg-rose-500' 
                            : 'bg-indigo-500'
                    }`} 
                />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
                    
                    {/* Left Column: Connection credentials & configuration */}
                    <div className="lg:col-span-7 bg-muted/30 dark:bg-slate-900/40 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/60 flex flex-col justify-between space-y-4 sm:space-y-6">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <Key size={15} className="text-primary" />
                                    <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                        {language === 'es' ? "Credenciales de Acceso Amexzone" : "Amexzone Portal Credentials"}
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField
                                    label="Amexzone Email"
                                    value={email}
                                    onChange={setEmail}
                                    placeholder="doctor@arcmentalhealth.com"
                                    icon={User}
                                    disabled={mfaStatus !== 'not_connected'}
                                />

                                <InputField
                                    label={language === 'es' ? "Contraseña de Amexzone" : "Amexzone Password"}
                                    value={password}
                                    onChange={setPassword}
                                    placeholder="••••••••••••"
                                    icon={Lock}
                                    type="password"
                                    disabled={mfaStatus !== 'not_connected'}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                <InputField
                                    label={language === 'es' ? "PIN de Acceso" : "Access PIN"}
                                    value={pin}
                                    onChange={setPin}
                                    placeholder="1206"
                                    icon={Key}
                                    type="password"
                                    disabled={mfaStatus !== 'not_connected'}
                                />

                                {/* MFA Channel Selection */}
                                <div className="flex flex-col space-y-2">
                                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider pl-1">
                                        {language === 'es' ? "Canal 2FA" : "2FA Channel"}
                                    </label>
                                    <div className="h-11 rounded-xl border border-slate-200 dark:border-border/80 bg-slate-100 dark:bg-slate-950/60 flex p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setMfaChannel('sms')}
                                            disabled={mfaStatus !== 'not_connected'}
                                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                                                mfaChannel === 'sms'
                                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700/80 font-bold"
                                                    : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-foreground"
                                            }`}
                                        >
                                            <Phone size={13} />
                                            SMS
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMfaChannel('email')}
                                            disabled={mfaStatus !== 'not_connected'}
                                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                                                mfaChannel === 'email'
                                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700/80 font-bold"
                                                    : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-foreground"
                                            }`}
                                        >
                                            <Mail size={13} />
                                            {language === 'es' ? "Correo" : "Email"}
                                        </button>
                                    </div>
                                </div>

                                {/* Status Summary Tile */}
                                <div className="flex flex-col space-y-2">
                                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                                        {language === 'es' ? "Estado" : "State"}
                                    </label>
                                    <div className="h-11 rounded-xl px-3 border border-border/80 bg-background/80 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            {language === 'es' ? "Sesión:" : "Session:"}
                                        </span>
                                        <ConnectionStatusPill status={mfaStatus} language={language} compact />
                                    </div>
                                </div>
                            </div>

                            {/* Session status banner message */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 flex items-start gap-2.5">
                                <Info size={15} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                    {mfaStatus === 'connected' && (language === 'es' 
                                        ? "La sesión está activa y verificada. Las notas se sincronizarán automáticamente con Amexzone al ser firmadas." 
                                        : "Session is verified and active. Signed notes are automatically dispatched and synced to Amexzone.")}
                                    {mfaStatus === 'expired' && (language === 'es' 
                                        ? "La sesión de Amexzone ha caducado. Haz clic en desconectar y vuelve a iniciar sesión." 
                                        : "Amexzone session has expired. Please disconnect and reconnect to re-authenticate.")}
                                    {mfaStatus === 'awaiting_2fa' && (
                                        mfaChannel === 'email' ? (
                                            language === 'es'
                                                ? "Código 2FA solicitado vía correo electrónico. Introdúcelo en el panel lateral para completar el enlace."
                                                : "2FA code requested via Email. Enter it in the side verification card to finish connecting."
                                        ) : (
                                            language === 'es'
                                                ? "Código 2FA solicitado vía SMS. Introdúcelo en el panel lateral para completar el enlace."
                                                : "2FA code requested via SMS. Enter it in the side verification card to finish connecting."
                                        )
                                    )}
                                    {mfaStatus === 'processing' && (language === 'es'
                                        ? "El bot automatizado está validando las credenciales y conectando con el portal seguro..."
                                        : "Automated bot is verifying credentials and linking with the secure portal...")}
                                    {mfaStatus === 'not_connected' && (language === 'es' 
                                        ? "Ingresa tus credenciales clínicas de Amexzone y presiona 'Conectar' para habilitar el puente de sincronización." 
                                        : "Enter your Amexzone clinical credentials and click 'Connect' to enable the synchronization bridge.")}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-4 border-t border-border/50">
                            {mfaStatus !== 'connected' && mfaStatus !== 'processing' && mfaStatus !== 'awaiting_2fa' && (
                                <button
                                    onClick={handleConnect}
                                    disabled={saving}
                                    className="w-full h-13 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md shadow-indigo-950/50 border border-indigo-500 active:translate-y-[1px] disabled:opacity-40 cursor-pointer select-none"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin text-white" />
                                            <span>{language === 'es' ? "Estableciendo conexión..." : "Initiating connection..."}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} className="text-white fill-white" />
                                            <span>{language === 'es' ? "Conectar e Iniciar Login" : "Connect & Verify Account"}</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {(mfaStatus === 'connected' || mfaStatus === 'awaiting_2fa' || mfaStatus === 'processing' || mfaStatus === 'expired') && (
                                <button
                                    onClick={() => setIsDisconnectModalOpen(true)}
                                    className="w-full h-13 py-3.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-200 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:translate-y-[1px] cursor-pointer select-none"
                                >
                                    <Trash2 size={15} />
                                    <span>{language === 'es' ? "Desconectar y Modificar Credenciales" : "Disconnect & Edit Credentials"}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: 2FA Input Card or Active Status Showcase */}
                    <div className="lg:col-span-5 flex flex-col">
                        {mfaStatus === 'awaiting_2fa' ? (
                            <div className="bg-slate-900/90 dark:bg-slate-900/95 p-6 sm:p-7 rounded-2xl border border-indigo-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-between h-full space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="text-center space-y-3">
                                    {/* Centered Shield Badge with Ambient Glow */}
                                    <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                                        <ShieldCheck size={24} />
                                    </div>

                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 mb-1.5 uppercase tracking-wider">
                                            <span>{language === 'es' ? "Paso 2 de 3 • Verificación 2FA" : "Step 2 of 3 • 2FA Verification"}</span>
                                        </div>
                                        <h4 className="text-base font-bold text-white tracking-tight">
                                            {language === 'es' 
                                                ? (mfaChannel === 'email' ? "Introduce el Código de tu Correo" : "Introduce el Código SMS") 
                                                : (mfaChannel === 'email' ? "Enter Email Security Code" : "Enter SMS Security Code")}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-normal leading-relaxed mt-1 max-w-xs mx-auto">
                                            {language === 'es'
                                                ? `Amexzone envió un código de 6 dígitos a tu ${mfaChannel === 'email' ? 'correo' : 'teléfono'}.`
                                                : `Amexzone sent a 6-digit security code to your ${mfaChannel === 'email' ? 'email' : 'phone'}.`}
                                        </p>
                                    </div>

                                    {/* 6-Box Segmented OTP Inputs */}
                                    <div className="pt-2 pb-1">
                                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                            {[0, 1, 2, 3, 4, 5].map((idx) => {
                                                const digit = mfaCode[idx] || '';
                                                return (
                                                    <Fragment key={idx}>
                                                        {idx === 3 && (
                                                            <span className="text-slate-600 font-bold text-sm px-0.5 select-none">-</span>
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
                                                            className={`w-9 h-12 sm:w-11 sm:h-13 rounded-xl text-center text-xl sm:text-2xl font-black font-mono transition-all duration-200 bg-slate-950/90 border focus:outline-none select-none ${
                                                                digit
                                                                    ? "border-indigo-500 text-white bg-indigo-950/30 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                                                                    : "border-slate-800 text-slate-200 hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                            }`}
                                                        />
                                                    </Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleSubmitMfaCode()}
                                        disabled={submittingMfa || mfaCode.length < 6}
                                        className={`w-full h-12 sm:h-13 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 select-none ${
                                            mfaCode.length === 6 && !submittingMfa
                                                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/50 border border-indigo-500 active:translate-y-[1px] cursor-pointer"
                                                : "bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none"
                                        }`}
                                    >
                                        {submittingMfa ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin text-white" />
                                                <span>{language === 'es' ? "Verificando código..." : "Verifying code..."}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={16} className={mfaCode.length === 6 ? "text-white stroke-[3]" : "text-slate-500"} />
                                                <span>{language === 'es' ? "Verificar y Vincular (90 días)" : "Verify & Link Account (90 Days)"}</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Resend / Request New Code Action */}
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={handleConnect}
                                            disabled={saving || submittingMfa}
                                            className="text-[11px] text-slate-400 hover:text-indigo-300 font-semibold underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            {language === 'es' ? "¿No recibiste el código? Solicitar uno nuevo" : "Didn't receive the code? Request a new one"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : mfaStatus === 'processing' ? (
                            <div className="bg-slate-900/90 dark:bg-slate-900/95 p-6 sm:p-7 rounded-2xl border border-indigo-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-between h-full space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="text-center space-y-3">
                                    {/* Pulse Radar Loader */}
                                    <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                        <RefreshCw size={22} className="animate-spin text-indigo-400" />
                                    </div>

                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 mb-1.5 uppercase tracking-wider">
                                            <span>{language === 'es' ? (mfaCode ? "Paso 3 de 3 • Guardando Sesión" : "Paso 1 de 3 • Estableciendo Conexión") : (mfaCode ? "Step 3 of 3 • Saving Session" : "Step 1 of 3 • Connecting")}</span>
                                        </div>
                                        <h4 className="text-base font-bold text-white tracking-tight">
                                            {mfaCode 
                                                ? (language === 'es' ? "Validando Código y Guardando Sesión..." : "Validating Code & Saving Session...") 
                                                : (language === 'es' ? "Conectando con Amexzone..." : "Connecting to Amexzone...")}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-normal leading-relaxed mt-1 max-w-xs mx-auto">
                                            {mfaCode 
                                                ? (language === 'es' 
                                                    ? "El bot está confirmando el código en Amexzone para autorizar este dispositivo por 90 días." 
                                                    : "The bot is confirming the code with Amexzone to trust this device for 90 days.") 
                                                : (language === 'es' 
                                                    ? `Iniciando sesión segura y solicitando código por ${mfaChannel === 'email' ? 'correo' : 'SMS'}...`
                                                    : `Initiating secure login and requesting code via ${mfaChannel === 'email' ? 'email' : 'SMS'}...`)}
                                        </p>
                                    </div>

                                    {/* 3-Step Visual Progress Timeline */}
                                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-left text-xs">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            <span className="text-slate-300 font-medium">
                                                {language === 'es' ? "Credenciales verificadas" : "Credentials verified"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            {mfaCode ? (
                                                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            ) : (
                                                <RefreshCw size={14} className="text-indigo-400 animate-spin shrink-0" />
                                            )}
                                            <span className={mfaCode ? "text-slate-300 font-medium" : "text-indigo-300 font-bold"}>
                                                {language === 'es' 
                                                    ? (mfaChannel === 'email' ? "Solicitando código por Correo..." : "Solicitando código por SMS...") 
                                                    : (mfaChannel === 'email' ? "Requesting code via Email..." : "Requesting code via SMS...")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            {mfaCode ? (
                                                <RefreshCw size={14} className="text-indigo-400 animate-spin shrink-0" />
                                            ) : (
                                                <Clock size={14} className="text-slate-600 shrink-0" />
                                            )}
                                            <span className={mfaCode ? "text-indigo-300 font-bold" : "text-slate-500 font-medium"}>
                                                {language === 'es' ? "Autorizando dispositivo (90 días)..." : "Trusting device (90 days)..."}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel / Abort Action */}
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={confirmDisconnect}
                                        className="text-[11px] text-slate-500 hover:text-rose-400 font-medium transition-colors cursor-pointer"
                                    >
                                        {language === 'es' ? "Cancelar proceso de conexión" : "Cancel connection process"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-7 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center h-full space-y-3 sm:space-y-5">
                                <div className={`size-12 sm:size-16 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                                    mfaStatus === 'connected'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                }`}>
                                    {mfaStatus === 'connected' ? <ShieldCheck className="size-6 sm:size-8" /> : <Shield className="size-6 sm:size-8" />}
                                </div>
                                
                                <div className="space-y-1 sm:space-y-1.5 max-w-xs">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {mfaStatus === 'connected' 
                                            ? (language === 'es' ? "Conexión EMR Segura Activa" : "Secure EMR Link Active")
                                            : (language === 'es' ? "Integración Amexzone" : "Amexzone Bot Integration")}
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                                        {mfaStatus === 'connected'
                                            ? (language === 'es' 
                                                ? "El bot local está completamente sincronizado y autorizado por 90 días para procesar tus notas clínicas."
                                                : "The automated local bot is authenticated and trusted for 90 days to sync clinical notes.")
                                            : (language === 'es'
                                                ? "Ingresa tus credenciales en el panel izquierdo y haz clic en Conectar para sincronizar con Amexzone."
                                                : "Provide your portal credentials on the left and click Connect to link your clinic database.")}
                                    </p>
                                </div>

                                {mfaStatus === 'connected' && (
                                    <div className="inline-flex items-center gap-1.5 sm:gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-emerald-500/20 shadow-sm">
                                        <Sparkles size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                                        <span>{language === 'es' ? "PUENTE LISTO PARA SINCRONIZAR" : "READY FOR NOTE DISPATCH"}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Bottom Section: Bot logs and execution history */}
            <div className="space-y-4">
                {/* Tasks Table - Unified Minimalist Container */}
                {loadingTasks ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#0b111e]/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
                        <RefreshCw size={24} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
                            {language === 'es' ? "Cargando historial de sincronización..." : "Loading clinical sync records..."}
                        </p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:bg-[#0b111e]/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 space-y-2 shadow-sm">
                        <ClipboardList size={32} className="mx-auto text-slate-400 dark:text-slate-600" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {language === 'es' ? "No hay notas sincronizadas aún" : "No synced notes yet"}
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {language === 'es' 
                                ? "Cuando firmes una nota de progreso o importes un paciente, el bot la registrará y sincronizará automáticamente aquí." 
                                : "When you sign a progress note or import a patient, the bot will automatically process and log it here."}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#0b111e]/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                        {/* Solid Minimalist Table Header (Desktop) */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-[#131d31]">
                            <div className="col-span-4">{language === 'es' ? "Paciente" : "Patient"}</div>
                            <div className="col-span-4">{language === 'es' ? "Nota Clínica / Servicio" : "Clinical Note / Service"}</div>
                            <div className="col-span-2">{language === 'es' ? "Fecha" : "Date"}</div>
                            <div className="col-span-2 text-right">{language === 'es' ? "Estado Amexzone" : "Amexzone Status"}</div>
                        </div>

                        {/* Continuous Task Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {(() => {
                                const totalTaskPages = Math.ceil(tasks.length / tasksPageSize);
                                const paginatedTasks = tasks.slice((tasksCurrentPage - 1) * tasksPageSize, tasksCurrentPage * tasksPageSize);

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
                                                        className={`hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-150 group ${
                                                            hasSummary ? 'cursor-pointer' : ''
                                                        }`}
                                                    >
                                                        {/* Patient Column */}
                                                        <div className="lg:col-span-4 flex items-center gap-3 w-full min-w-0">
                                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {task.patient_name ? task.patient_name.charAt(0).toUpperCase() : <User size={13} />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate">
                                                                    {task.patient_name || (language === 'es' ? 'Paciente sin nombre' : 'Unnamed Patient')}
                                                                </p>
                                                                {task.patient_dob && (
                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">DOB: {task.patient_dob}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Clinical Note / Service Column */}
                                                        <div className="lg:col-span-4 flex items-center gap-2.5 w-full min-w-0">
                                                            <span className={`size-7 rounded-lg flex items-center justify-center text-xs ${details.color} shrink-0 border border-slate-200 dark:border-slate-800`}>
                                                                {details.icon}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-medium text-slate-800 dark:text-slate-200 text-xs block truncate">
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

                                                        {/* Amexzone Status Column */}
                                                        <div className="lg:col-span-2 w-full flex items-center justify-end gap-2 shrink-0">
                                                            {task.status === 'failed' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRetryTask(task.id); }}
                                                                    disabled={retryingTaskId === task.id}
                                                                    className="h-7 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 text-[11px] font-medium cursor-pointer disabled:opacity-50 shrink-0"
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
                                                        className={`block lg:hidden p-3 sm:p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-150 ${
                                                            hasSummary ? 'cursor-pointer active:bg-slate-100 dark:active:bg-slate-800/50' : ''
                                                        }`}
                                                    >
                                                        {/* Row 1: Left (Avatar + Name + Service Badge) & Right (Status Badge + Retry) */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-xs font-bold shrink-0">
                                                                    {task.patient_name ? task.patient_name.charAt(0).toUpperCase() : <User size={13} />}
                                                                </div>
                                                                <div className="min-w-0 flex items-center gap-1.5 flex-1">
                                                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[130px] sm:max-w-[200px]">
                                                                        {task.patient_name || (language === 'es' ? 'Paciente sin nombre' : 'Unnamed Patient')}
                                                                    </p>
                                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${details.badgeClasses} shrink-0 border`}>
                                                                        <span className="scale-75 origin-center -mr-0.5">{details.icon}</span>
                                                                        <span className="truncate max-w-[90px] sm:max-w-[120px]">{details.name}</span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Status + Retry Actions */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {task.status === 'failed' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleRetryTask(task.id); }}
                                                                        disabled={retryingTaskId === task.id}
                                                                        className="h-6 px-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 text-[10px] font-medium cursor-pointer disabled:opacity-50"
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

                                                        {/* Row 2: Secondary info line (DOB • Timestamp • Task ID) */}
                                                        <div className="pl-10.5 mt-1 flex items-center gap-2 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium tracking-tight truncate">
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
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 sm:px-6 py-3 sm:py-4 border-t border-slate-200/80 dark:border-slate-850 bg-slate-50/50 dark:bg-[#131d31]/40">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    {language === 'es'
                                                        ? `Mostrando ${((tasksCurrentPage - 1) * tasksPageSize) + 1} - ${Math.min(tasksCurrentPage * tasksPageSize, tasks.length)} de ${tasks.length.toLocaleString()} notas sincronizadas`
                                                        : `Showing ${((tasksCurrentPage - 1) * tasksPageSize) + 1} - ${Math.min(tasksCurrentPage * tasksPageSize, tasks.length)} of ${tasks.length.toLocaleString()} synced notes`}
                                                </span>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => setTasksCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={tasksCurrentPage === 1}
                                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-all cursor-pointer shadow-2xs"
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
                                                                className={`size-8 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                                                    isCurrent
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs'
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
                                                                className="size-8 text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
                                                            >
                                                                {totalTaskPages}
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => setTasksCurrentPage(prev => Math.min(prev + 1, totalTaskPages))}
                                                        disabled={tasksCurrentPage === totalTaskPages}
                                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-all cursor-pointer shadow-2xs"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card border border-border/80 shadow-2xl rounded-3xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/60 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                    <ClipboardList size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                                        {language === 'es' ? "Resumen de Ejecución del Bot" : "Bot Execution Result Summary"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        {selectedTask.patient_name || 'Amexzone Task'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Summary Status Box */}
                            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
                                selectedTask.status === 'completed' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    {selectedTask.status === 'completed' ? (
                                        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    ) : (
                                        <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                    )}
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {selectedTask.status === 'completed' 
                                            ? (language === 'es' ? "OPERACIÓN COMPLETADA CON ÉXITO" : "EXECUTION SUCCESSFUL")
                                            : (language === 'es' ? "FALLO DE EJECUCIÓN DETECTADO" : "EXECUTION ENCOUNTERED ERROR")}
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
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                                {language === 'es' ? "Motivo del Fallo" : "Failure Reason"}
                                            </h4>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                {formatted.categoryLabel}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300 text-xs font-semibold leading-relaxed">
                                            <div className="font-bold text-sm text-rose-800 dark:text-rose-200 mb-1">
                                                {formatted.title}
                                            </div>
                                            <p className="font-normal opacity-90">
                                                {formatted.description}
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed font-medium flex items-start gap-3">
                                            <Info size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="block mb-0.5 text-indigo-950 dark:text-indigo-100">
                                                    {language === 'es' ? "¿Qué acción tomar?" : "Action to take:"}
                                                </strong>
                                                <p className="text-indigo-800/90 dark:text-indigo-300 font-normal">
                                                    {formatted.actionHint}
                                                </p>
                                            </div>
                                        </div>

                                        {formatted.rawError && (
                                            <div className="pt-1">
                                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                                                    Reporte técnico original:
                                                </span>
                                                <pre className="p-3 text-[10px] font-mono text-muted-foreground bg-muted/30 rounded-xl border border-border/60 overflow-x-auto max-h-24 whitespace-pre-wrap">
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
                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                        {language === 'es' ? "Datos Demográficos Extraídos" : "Extracted Demographics"}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-4 rounded-2xl border border-border/60">
                                        <DetailRow label="EMR ID / Case #" value={selectedTask.result_summary.emr_id || 'N/A'} />
                                        <DetailRow label="SSN / Seguro Social" value={selectedTask.result_summary.ssn || 'N/A'} />
                                        <DetailRow label="Phone / Teléfono" value={selectedTask.result_summary.phone || 'N/A'} />
                                        <DetailRow label="Gender / Género" value={selectedTask.result_summary.gender || 'N/A'} />
                                        <DetailRow label="PCP / Médico Cabecera" value={selectedTask.result_summary.pcp_name || 'N/A'} />
                                        <DetailRow label="Psychiatrist / Psiquiatra" value={selectedTask.result_summary.psych_name || 'N/A'} />
                                        <DetailRow label="Marital Status / Estado Civil" value={selectedTask.result_summary.marital_status || 'N/A'} />
                                        <DetailRow label="Emergency Contact / Contacto" value={selectedTask.result_summary.emergency_contact_name || 'N/A'} />
                                        <div className="sm:col-span-2 border-t border-border/40 pt-3 mt-1">
                                            <DetailRow label="Address / Dirección" value={selectedTask.result_summary.address || 'N/A'} />
                                        </div>
                                    </div>

                                    {/* Clinical Diagnoses */}
                                    {selectedTask.result_summary.diagnoses && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                {language === 'es' ? "Diagnósticos Clínicos (ICD-10)" : "Clinical Diagnoses (ICD-10)"}
                                            </h4>
                                            <div className="p-4 bg-muted/30 rounded-2xl border border-border/60 text-xs leading-relaxed whitespace-pre-wrap font-medium text-foreground">
                                                {selectedTask.result_summary.diagnoses}
                                            </div>
                                        </div>
                                    )}

                                    {/* Psychiatric Medications */}
                                    {selectedTask.result_summary.psych_medications && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                {language === 'es' ? "Medicamentos Psiquiátricos y Análisis Clínico" : "Psychiatric Medications & Clinical History"}
                                            </h4>
                                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-xs leading-relaxed whitespace-pre-wrap font-medium text-foreground">
                                                {selectedTask.result_summary.psych_medications}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between p-4 px-6 border-t border-border/60 bg-muted/20">
                            {selectedTask.status === 'failed' ? (
                                <button
                                    onClick={() => {
                                        const id = selectedTask.id;
                                        setSelectedTask(null);
                                        handleRetryTask(id);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <RotateCcw size={13} />
                                    <span>{language === 'es' ? "Reintentar Tarea" : "Retry Task"}</span>
                                </button>
                            ) : <div />}

                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all cursor-pointer"
                            >
                                {language === 'es' ? "Cerrar" : "Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disconnect Confirmation Modal */}
            {isDisconnectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-3xl border border-border/80 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="size-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shadow-inner">
                                <AlertTriangle size={28} className="text-destructive animate-pulse" />
                            </div>
                            <h3 className="text-lg font-bold tracking-tight text-foreground">
                                {language === 'es' ? "¿Desconectar cuenta de Amexzone?" : "Disconnect Amexzone Account?"}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs font-medium">
                                {language === 'es'
                                    ? "Se borrará la sesión de 90 días autorizada y las credenciales activas del bot. Deberás volver a autenticarte con 2FA para reconectar."
                                    : "This will clear your 90-day authorization session and reset bot credentials. You will need to re-authenticate with 2FA to reconnect."}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                            <button
                                type="button"
                                onClick={() => setIsDisconnectModalOpen(false)}
                                disabled={isDisconnecting}
                                className="flex-1 h-11 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-all active:scale-[0.98] border border-border/80 cursor-pointer"
                            >
                                {language === 'es' ? "Cancelar" : "Cancel"}
                            </button>
                            <button
                                type="button"
                                onClick={confirmDisconnect}
                                disabled={isDisconnecting}
                                className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs transition-all active:scale-[0.98] shadow-md shadow-destructive/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isDisconnecting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        {language === 'es' ? "Desconectando..." : "Disconnecting..."}
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        {language === 'es' ? "Desconectar Cuenta" : "Disconnect Account"}
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

// Connection Status Pill with glowing indicator
function ConnectionStatusPill({ 
    status, 
    language,
    compact = false 
}: { 
    status: 'not_connected' | 'awaiting_2fa' | 'connected' | 'expired' | 'processing';
    language: string;
    compact?: boolean;
}) {
    if (status === 'connected') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>{language === 'es' ? "Conectado" : "Connected"}</span>
            </span>
        );
    }

    if (status === 'awaiting_2fa') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                <span>{language === 'es' ? "Esperando 2FA" : "Awaiting 2FA"}</span>
            </span>
        );
    }

    if (status === 'processing') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <RefreshCw size={11} className="animate-spin text-indigo-400" />
                <span>{language === 'es' ? "Verificando..." : "Verifying..."}</span>
            </span>
        );
    }

    if (status === 'expired') {
        return (
            <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <AlertTriangle size={11} className="text-rose-400" />
                <span>{language === 'es' ? "Sesión Expirada" : "Expired"}</span>
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/80 ${
            compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
        }`}>
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
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

// Inline input field helper
function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text", disabled = false }: any) {
    const [showPasswordText, setShowPasswordText] = useState(false);
    const isPasswordField = type === "password";
    const currentInputType = isPasswordField ? (showPasswordText ? "text" : "password") : type;

    return (
        <div className="group space-y-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 group-focus-within:text-primary transition-colors">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-muted-foreground group-focus-within:text-primary transition-colors" />}
                    {label}
                </span>
            </label>
            <div className="relative flex items-center">
                <input
                    type={currentInputType}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full h-11 px-4 ${isPasswordField ? 'pr-10' : ''} rounded-xl border border-border/80 bg-background/80 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder={placeholder}
                />
                {isPasswordField && (
                    <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        tabIndex={-1}
                        className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={showPasswordText ? "Hide" : "Show"}
                    >
                        {showPasswordText ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                )}
            </div>
        </div>
    );
}

// Helper row inside report modal
function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
            <p className="text-xs font-semibold text-foreground break-words">{value}</p>
        </div>
    );
}

// Friendly error translation function for user reports
function getFriendlyErrorMessage(errorMsg: string | null, lang: string) {
    if (!errorMsg) return lang === 'es' ? "Detalles del error no especificados." : "Error details not specified.";
    
    const msg = errorMsg.toLowerCase();
    
    if (msg.includes("err_proxy_connection_failed") || msg.includes("proxy authentication required") || msg.includes("proxy")) {
        return lang === 'es' 
            ? "Fallo de conexión de red o del servidor de seguridad (Proxy). Por favor, contacta a soporte técnico." 
            : "Network connection or security server (Proxy) failure. Please contact technical support.";
    }
    
    if (msg.includes("timeout") && (msg.includes("nombre") || msg.includes("name") || msg.includes("buscador"))) {
        return lang === 'es'
            ? "Tiempo de espera agotado al buscar el campo de búsqueda de pacientes. Amexzone podría estar lento o la sesión ha expirado."
            : "Timeout exceeded waiting for the patient search field. Amexzone might be slow or your session has expired.";
    }

    if (msg.includes("tiempo de espera agotado") || (msg.includes("timeout") && msg.includes("sms"))) {
        return lang === 'es'
            ? "El código de verificación no se ingresó a tiempo (límite de tiempo excedido)."
            : "The verification code was not entered in time (time limit exceeded).";
    }

    if (msg.includes("conexión cancelada por el usuario") || msg.includes("canceled by the user")) {
        return lang === 'es'
            ? "Conexión cancelada manualmente por el usuario."
            : "Connection manually cancelled by the user.";
    }

    if (msg.includes("no se encontró ningún paciente") || msg.includes("no patient") || msg.includes("not found")) {
        return lang === 'es'
            ? "No se encontró ningún paciente con el nombre indicado en Amexzone. Por favor, verifica el nombre completo."
            : "No patient was found with the specified name in Amexzone. Please check the full name.";
    }

    if (msg.includes("credenciales") || msg.includes("password") || msg.includes("login") || msg.includes("contraseña")) {
        return lang === 'es'
            ? "Credenciales incorrectas o inválidas en Amexzone. Por favor, edita tus credenciales y vuelve a conectar."
            : "Incorrect or invalid credentials in Amexzone. Please edit your credentials and try again.";
    }

    return errorMsg; // Fallback to raw error if not mapped
}
