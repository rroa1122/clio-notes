import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { 
    RefreshCw, 
    Cpu, 
    CheckCircle2, 
    AlertCircle, 
    Key, 
    Clock, 
    User, 
    Calendar, 
    Lock, 
    ShieldCheck, 
    Play, 
    AlertTriangle,
    Search,
    Eye,
    X,
    Info,
    Trash2,
    Check,
    UserPlus,
    FileText,
    Shield,
    Activity,
    ClipboardList
} from 'lucide-react';

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
    
    // UI States
    const [loadingIntegration, setLoadingIntegration] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submittingMfa, setSubmittingMfa] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(true);
    
    // Filter & Search states
    const [tasks, setTasks] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'pending' | 'processing'>('all');
    const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
    
    // Selected task for detailed report view
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Fetch Integration credentials and status
    useEffect(() => {
        const fetchIntegration = async () => {
            if (!user?.id) return;
            try {
                const { data, error } = await supabase
                    .from('provider_integrations')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setEmail(data.amexzone_email || '');
                    const storedPassword = data.amexzone_password || '';
                    if (storedPassword.startsWith('ENCRYPTED:')) {
                        setPassword('••••••••••••');
                        setSavedPassword(storedPassword);
                    } else {
                        setPassword(storedPassword);
                        setSavedPassword(storedPassword);
                    }
                    setPin(data.amexzone_pin || '1206');
                    setMfaStatus(data.mfa_status || 'not_connected');
                }
            } catch (err) {
                console.error("Error fetching integration:", err);
            } finally {
                setLoadingIntegration(false);
            }
        };

        fetchIntegration();
    }, [user?.id]);

    // Fetch Logged Tasks
    const fetchTasks = async () => {
        if (!user?.id) return;
        setLoadingTasks(true);
        try {
            const { data, error } = await supabase
                .from('amexzone_note_tasks')
                .select('*')
                .eq('user_id', user.id)
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
                    } else if (data.mfa_status === 'expired' || data.mfa_status === 'not_connected') {
                        toast.error(language === 'es' ? "Fallo en la conexión. Revisa las credenciales e intenta de nuevo." : "Connection failed. Please check credentials and try again.");
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

    // Disconnect / Reset Integration
    const handleDisconnect = async () => {
        if (window.confirm(language === 'es' ? "¿Estás seguro de cancelar la conexión actual?" : "Are you sure you want to cancel the current connection?")) {
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
                toast.info(language === 'es' ? "Conexión desvinculada." : "Connection reset.");
            } catch (err: any) {
                console.error("Error resetting integration:", err);
                toast.error(err.message || "Failed to reset connection");
            }
        }
    };

    // Save Credentials & Trigger Connection Bot
    const handleConnect = async () => {
        if (!email || !password) {
            toast.error(language === 'es' ? "Por favor completa el email y la contraseña" : "Please fill in email and password");
            return;
        }

        setSaving(true);
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
                    ? "Iniciando conexión. Verificando si requiere código SMS." 
                    : "Connecting. Checking if SMS verification code is required."
            );
            setTimeout(() => fetchTasks(), 1500); // Reload tasks list to show pending
        } catch (err: any) {
            console.error("Error saving integration:", err);
            toast.error(err.message || "Failed to update integration details");
        } finally {
            setSaving(false);
        }
    };

    // Submit MFA SMS Code to Bot
    const handleSubmitMfaCode = async () => {
        if (!mfaCode || mfaCode.length < 4) {
            toast.error(language === 'es' ? "Ingresa un código SMS válido" : "Please enter a valid SMS code");
            return;
        }

        setSubmittingMfa(true);
        try {
            const { error } = await supabase
                .from('provider_integrations')
                .update({
                    mfa_code: mfaCode,
                    mfa_status: 'processing'
                })
                .eq('user_id', user?.id);

            if (error) throw error;

            setMfaStatus('processing');
            toast.success(language === 'es' ? "Código enviado. Verificando..." : "Code submitted. Verifying...");
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
        if (task.note_text === '[CONNECT]') {
            return {
                icon: <Key size={14} className="text-amber-500" />,
                color: "bg-amber-500/10",
                name: language === 'es' ? "Prueba de Conexión" : "Connection Test"
            };
        }
        if (task.note_text === '[IMPORT_PATIENT]') {
            return {
                icon: <UserPlus size={14} className="text-sky-500" />,
                color: "bg-sky-500/10",
                name: language === 'es' ? "Importar Paciente" : "Patient Import"
            };
        }
        return {
            icon: <FileText size={14} className="text-indigo-500" />,
            color: "bg-indigo-500/10",
            name: language === 'es' ? "Sincronizar Nota" : "Note Sync"
        };
    };

    if (loadingIntegration) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw size={32} className="animate-spin text-[#6366f1]" />
                    <p className="text-xs font-black uppercase text-slate-500 tracking-widest animate-pulse">
                        {language === 'es' ? "Cargando Portal de Sincronización..." : "Loading Sync Portal..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-4 pt-4 lg:pt-8 h-auto mb-16">
            <div className="flex flex-col bg-transparent md:bg-surface md:dark:bg-slate-900 rounded-[2rem] shadow-none md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border-0 md:border border-border/60 overflow-hidden relative h-auto">

                {/* Content body wrapper - expands naturally, no inner scroll */}
                <div className="p-8 space-y-8">
                    
                    {/* Top Row: Credentials & Authentication Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* Connection credentials block (Left Card) */}
                        <div className="lg:col-span-7 bg-gradient-to-b from-slate-50/60 to-slate-100/20 dark:from-slate-900/40 dark:to-slate-950/20 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.015)] flex flex-col justify-between space-y-6">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest pl-1">
                                        {language === 'es' ? "Credenciales del Portal" : "Portal Credentials"}
                                    </h2>
                                    
                                    {/* Live Badge */}
                                    {mfaStatus === 'connected' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 uppercase tracking-wider">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                            {language === 'es' ? "En Línea" : "Active Session"}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            {language === 'es' ? "Desconectado" : "Offline"}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label={language === 'es' ? "PIN de Acceso Amexzone" : "Amexzone Access PIN"}
                                        value={pin}
                                        onChange={setPin}
                                        placeholder="1206"
                                        icon={Key}
                                        type="password"
                                        disabled={mfaStatus !== 'not_connected'}
                                    />

                                    {/* Status Pill Inside Container */}
                                    <div className="flex flex-col justify-end">
                                        <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 mb-2">
                                            {language === 'es' ? "Estado de Conexión" : "Connection Status"}
                                        </label>
                                        <div className="h-11 rounded-xl px-4 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                                {language === 'es' ? "Resultado:" : "Status:"}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {mfaStatus === 'connected' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                                        <CheckCircle2 size={10} /> {language === 'es' ? "Conectado" : "Connected"}
                                                    </span>
                                                ) : mfaStatus === 'awaiting_2fa' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 uppercase tracking-wider animate-pulse">
                                                        <Clock size={10} /> {language === 'es' ? "Esperando SMS" : "Awaiting SMS"}
                                                    </span>
                                                ) : mfaStatus === 'processing' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                                        <RefreshCw size={10} className="animate-spin" /> {language === 'es' ? "Verificando..." : "Verifying..."}
                                                    </span>
                                                ) : mfaStatus === 'expired' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 uppercase tracking-wider">
                                                        <AlertTriangle size={10} /> {language === 'es' ? "Expirada" : "Expired"}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                                        <AlertCircle size={10} /> {language === 'es' ? "No Conectado" : "Not Linked"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Session health description */}
                                        <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-2 font-semibold leading-normal pl-1">
                                            {mfaStatus === 'connected' && (language === 'es' 
                                                ? "✓ La sesión está activa. Las credenciales y el navegador seguro están funcionando correctamente." 
                                                : "✓ Session is active. Credentials and persistent browser state are healthy.")}
                                            {mfaStatus === 'expired' && (language === 'es' 
                                                ? "⚠️ La sesión ha caducado en Amexzone. Por favor, haz clic en desconectar y vuelve a conectar para iniciar sesión." 
                                                : "⚠️ Session has expired in Amexzone. Please disconnect and reconnect to re-authenticate.")}
                                            {mfaStatus === 'awaiting_2fa' && (language === 'es' 
                                                ? "⏳ El bot ha enviado un código de acceso a tu teléfono. Escríbelo en el campo de arriba." 
                                                : "⏳ The bot has sent an access code to your phone. Enter it in the input field above.")}
                                            {mfaStatus === 'not_connected' && (language === 'es' 
                                                ? "ℹ️ Ingresa tus credenciales para conectar Amexzone con Clio Notes." 
                                                : "ℹ️ Enter your credentials to link Amexzone with Clio Notes.")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-6">
                                {mfaStatus !== 'connected' && mfaStatus !== 'processing' && mfaStatus !== 'awaiting_2fa' && (
                                    <button
                                        onClick={handleConnect}
                                        disabled={saving}
                                        className="w-full h-12 bg-[#6366f1] text-white rounded-2xl font-bold hover:bg-indigo-750 transition-all flex items-center justify-center gap-2 text-sm shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                    >
                                        <Play size={16} />
                                        {saving 
                                            ? (language === 'es' ? "Estableciendo conexión..." : "Initiating connection...") 
                                            : (language === 'es' ? "Conectar e Iniciar Login" : "Connect & Verify Account")}
                                    </button>
                                )}

                                {(mfaStatus === 'connected' || mfaStatus === 'awaiting_2fa' || mfaStatus === 'processing' || mfaStatus === 'expired') && (
                                    <button
                                        onClick={handleDisconnect}
                                        className="w-full h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98] cursor-pointer"
                                    >
                                        <Trash2 size={15} />
                                        {language === 'es' ? "Desconectar y Modificar Credenciales" : "Disconnect & Edit Credentials"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status and 2FA SMS Code Entry Card (Right Card) */}
                        <div className="lg:col-span-5 flex flex-col">
                            {((mfaStatus === 'awaiting_2fa') || (mfaStatus === 'processing' && mfaCode)) ? (
                                <div className="bg-gradient-to-b from-amber-500/10 to-amber-600/5 dark:from-amber-950/20 dark:to-amber-950/5 p-6 rounded-2xl border border-amber-500/25 dark:border-amber-900/30 shadow-[inset_0_1.5px_3px_rgba(245,158,11,0.015)] space-y-4 animate-in slide-in-from-top duration-300 flex flex-col justify-center h-full">
                                    <div className="flex gap-3">
                                        <ShieldCheck className="text-amber-500 shrink-0 mt-1" size={20} />
                                        <div>
                                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                                                {language === 'es' ? "Doble Factor (2FA) Requerido" : "Two-Factor Authentication"}
                                            </h4>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mt-2.5 font-semibold">
                                                {language === 'es' 
                                                    ? "Amexzone ha solicitado un código de verificación SMS enviado a tu teléfono. Por favor, introdúcelo abajo." 
                                                    : "Amexzone has requested an SMS verification code sent to your phone. Enter it below."}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 pt-3">
                                        <input
                                            type="text"
                                            value={mfaCode}
                                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                            className="w-full h-12 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-amber-500/10 text-center tracking-[0.25em] text-lg font-bold focus:border-amber-500/50 text-slate-900 dark:text-slate-100"
                                            placeholder="123456"
                                            disabled={submittingMfa || mfaStatus === 'processing'}
                                        />
                                        <button
                                            onClick={handleSubmitMfaCode}
                                            disabled={submittingMfa || mfaStatus === 'processing' || mfaCode.length < 4}
                                            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
                                        >
                                            {submittingMfa ? (language === 'es' ? "Enviando..." : "Submitting...") : (language === 'es' ? "Enviar Código" : "Submit Code")}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-b from-slate-50/60 to-slate-100/20 dark:from-slate-900/40 dark:to-slate-950/20 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.015)] flex flex-col items-center justify-center text-center h-full space-y-4">
                                    <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-[#6366f1] flex items-center justify-center border border-indigo-100/30 dark:border-indigo-900/30">
                                        <Shield size={24} className="text-[#6366f1]" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest pl-0.5">
                                        {mfaStatus === 'connected' 
                                            ? (language === 'es' ? "Conexión Activa" : "Connection Secured")
                                            : (language === 'es' ? "Enlace del Bot" : "Bot Integration")}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-bold uppercase tracking-wide">
                                        {mfaStatus === 'connected'
                                            ? (language === 'es' 
                                                ? "El bot local está completamente autenticado y sincronizará tus notas en tiempo real cada vez que las firmes."
                                                : "The local bot is fully authenticated and will sync your notes in real-time as soon as they are signed.")
                                            : (language === 'es'
                                                ? "Ingresa tus credenciales del portal Amexzone y haz clic en Conectar para sincronizar la base de datos de tu clínica."
                                                : "Enter your portal credentials on the left and click Connect to link your clinic database.")}
                                    </p>
                                    
                                    {mfaStatus === 'connected' && (
                                        <div className="inline-flex items-center gap-1.5 text-emerald-500 font-bold text-[9px] uppercase tracking-widest bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10">
                                            <Check size={11} /> {language === 'es' ? "LISTO PARA COPIAR" : "READY FOR SYNC"}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Bottom Section: Bot logs and reports table */}
                    <div className="space-y-8 mt-2">
                        
                        {/* Table search, filter tabs & refresh button combined in a single row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Filter tabs */}
                            <div className="flex flex-wrap gap-2.5">
                                {(['all', 'completed', 'failed', 'processing', 'pending'] as const).map((tab) => {
                                    const count = tasks.filter(t => tab === 'all' || t.status === tab).length;
                                    const label = tab === 'all' ? (language === 'es' ? 'Todos' : 'All') :
                                                  tab === 'completed' ? (language === 'es' ? 'Completados' : 'Completed') :
                                                  tab === 'failed' ? (language === 'es' ? 'Fallidos' : 'Failed') :
                                                  tab === 'processing' ? (language === 'es' ? 'Procesando' : 'Processing') :
                                                  (language === 'es' ? 'Pendientes' : 'Pending');
                                                  
                                    const isActive = statusFilter === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setStatusFilter(tab)}
                                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${isActive
                                                ? 'bg-slate-100 dark:bg-slate-800/85 text-indigo-650 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/30'
                                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span>{label}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-455' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search bar & Refresh button aligned on the right */}
                            <div className="flex items-center gap-3 shrink-0">
                                {/* Search Input */}
                                <div className="flex items-center border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-full pl-3.5 pr-4 h-9 shadow-sm relative group hover:border-slate-350 dark:hover:border-slate-700 focus-within:border-indigo-500/40 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all w-52">
                                    <div className="text-slate-400 mr-2 pointer-events-none flex-shrink-0">
                                        <Search className="w-3.5 h-3.5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-full w-full bg-transparent border-0 p-0 !outline-none !ring-0 focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                                        placeholder={language === 'es' ? "Buscar paciente..." : "Search patient..."}
                                    />
                                </div>

                                {/* Refresh Button */}
                                <button 
                                    onClick={fetchTasks}
                                    className="size-9 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/80 rounded-full border border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                                    title="Actualizar log"
                                >
                                    <RefreshCw size={13} className={loadingTasks ? "animate-spin text-[#6366f1]" : ""} />
                                </button>
                            </div>
                        </div>

                        {/* Custom Table Pill-shaped List matching layout of patient list */}
                        {loadingTasks ? (
                            <div className="py-16 flex items-center justify-center">
                                <RefreshCw size={24} className="animate-spin text-slate-400" />
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs italic font-bold">
                                {language === 'es' ? "No hay registros disponibles." : "No records found matching filters."}
                            </div>
                        ) : (
                            <div className="space-y-3.5 pb-8">
                                {/* Header Row */}
                                <div className="grid grid-cols-12 gap-4 px-6 pb-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 mb-4">
                                    <div className="col-span-2">{language === 'es' ? "Tipo / Acción" : "Action Type"}</div>
                                    <div className="col-span-3">{language === 'es' ? "Paciente / Detalle" : "Patient Detail"}</div>
                                    <div className="col-span-1">{language === 'es' ? "F. Visita" : "Visit Date"}</div>
                                    <div className="col-span-2">{language === 'es' ? "Fecha Creación" : "Created At"}</div>
                                    <div className="col-span-2 text-center">{language === 'es' ? "Estado" : "Status"}</div>
                                    <div className="col-span-2 text-left pl-3">{language === 'es' ? "Acciones" : "Actions"}</div>
                                </div>

                                {/* Body Rows */}
                                {filteredTasks.map((task) => {
                                    const details = getTaskActionType(task);
                                    const taskDate = new Date(task.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });

                                    return (
                                        <div
                                            key={task.id}
                                            className="grid grid-cols-12 gap-4 items-center border border-slate-100 dark:border-slate-800/80 bg-surface dark:bg-slate-900/60 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/5 hover:border-indigo-300/60 dark:hover:border-indigo-800/60 rounded-full px-6 py-2 transition-all duration-300 cursor-default group hover:-translate-y-0.5"
                                        >
                                            {/* Action Type */}
                                            <div className="col-span-2 flex items-center gap-2.5 min-w-0">
                                                <span className={`size-10 rounded-full flex items-center justify-center text-base ${details.color} shrink-0 transition-all duration-300 group-hover:scale-105 shadow-sm`}>
                                                    {details.icon}
                                                </span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-350 text-xs truncate">
                                                    {details.name}
                                                </span>
                                            </div>

                                            {/* Patient Detail */}
                                            <div className="col-span-3 truncate">
                                                <div className="space-y-0.5 truncate">
                                                    <p className="font-bold text-slate-850 dark:text-slate-200 text-xs truncate">{task.patient_name}</p>
                                                    {task.patient_dob && (
                                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">DOB: {task.patient_dob}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Visit Date */}
                                            <div className="col-span-1 text-slate-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-wide">
                                                {task.visit_date || 'N/A'}
                                            </div>

                                            {/* Created At */}
                                            <div className="col-span-2 text-slate-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-wide truncate">
                                                {taskDate}
                                            </div>

                                            {/* Status Badge */}
                                            <div className="col-span-2 text-center whitespace-nowrap">
                                                {task.status === 'completed' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                                        {language === 'es' ? "Completado" : "Completed"}
                                                    </span>
                                                ) : task.status === 'processing' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 uppercase tracking-wider animate-pulse">
                                                        {language === 'es' ? "Procesando" : "Processing"}
                                                    </span>
                                                ) : task.status === 'failed' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 uppercase tracking-wider">
                                                        {language === 'es' ? "Fallido" : "Failed"}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                        {language === 'es' ? "Pendiente" : "Pending"}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-2">
                                                <div className="flex items-center justify-start gap-2">
                                                    {/* View Report Button */}
                                                    {(task.status === 'completed' && task.result_summary) || (task.status === 'failed' && task.error_message) ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                                            className="h-7 px-3 rounded-full bg-indigo-50 border border-indigo-100/50 dark:bg-indigo-950/25 dark:border-indigo-900/30 text-[#6366f1] hover:bg-[#6366f1] hover:text-white dark:hover:bg-[#6366f1] dark:hover:text-white transition-all flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm cursor-pointer"
                                                        >
                                                            <Eye size={11} />
                                                            <span>{language === 'es' ? "Reporte" : "Report"}</span>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div> {/* End scrollable content body */}
            </div> {/* End Inner card container */}

        {/* Detailed Report Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-surface dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100/30 dark:border-indigo-900/30 shrink-0 text-[#6366f1]">
                                    <ClipboardList size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest pl-0.5">
                                        {language === 'es' ? "Reporte Detallado del Bot" : "Detailed Bot Log Report"}
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
                                        {selectedTask.patient_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Summary Status Box */}
                            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                                selectedTask.status === 'completed' 
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-850 dark:text-emerald-400' 
                                    : 'bg-red-500/5 border-red-500/20 text-red-850 dark:text-red-400'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    {selectedTask.status === 'completed' ? (
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                    )}
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {selectedTask.status === 'completed' 
                                            ? (language === 'es' ? "OPERACIÓN EXITOSA" : "OPERATION SUCCESSFUL")
                                            : (language === 'es' ? "FALLO DE EJECUCIÓN" : "EXECUTION FAILED")}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    ID: {selectedTask.id.substring(0, 8)}
                                </span>
                            </div>

                            {/* Failure details */}
                            {selectedTask.status === 'failed' && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-semibold text-red-550 dark:text-red-450 uppercase tracking-widest pl-1">
                                        {language === 'es' ? "Detalles del Error" : "Error Description"}
                                    </h4>
                                    <div className="p-4 rounded-xl border border-red-200/60 dark:border-red-950/40 bg-red-500/5 text-red-650 dark:text-red-400 text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">
                                        {getFriendlyErrorMessage(selectedTask.error_message, language)}
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-wider flex items-center gap-3">
                                        <Info size={14} className="text-[#6366f1] shrink-0" />
                                        <span>
                                            {language === 'es' 
                                                ? "Asegúrate de que tus credenciales son correctas y haz clic en reintentar para reenviar la tarea." 
                                                : "Ensure your login credentials are correct and click retry to execute again."}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Scraped Demographic Data Summary */}
                            {selectedTask.status === 'completed' && selectedTask.result_summary && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">
                                        {language === 'es' ? "Datos Demográficos Importados" : "Imported Demographics Summary"}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                                        <DetailRow label="EMR ID / Case #" value={selectedTask.result_summary.emr_id || 'N/A'} />
                                        <DetailRow label="SSN / Seguro Social" value={selectedTask.result_summary.ssn || 'N/A'} />
                                        <DetailRow label="Phone / Teléfono" value={selectedTask.result_summary.phone || 'N/A'} />
                                        <DetailRow label="Gender / Género" value={selectedTask.result_summary.gender || 'N/A'} />
                                        <DetailRow label="PCP / Médico Cabecera" value={selectedTask.result_summary.pcp_name || 'N/A'} />
                                        <DetailRow label="Psychiatrist / Psiquiatra" value={selectedTask.result_summary.psych_name || 'N/A'} />
                                        <DetailRow label="Marital Status / Estado Civil" value={selectedTask.result_summary.marital_status || 'N/A'} />
                                        <DetailRow label="Emergency Contact / Contacto" value={selectedTask.result_summary.emergency_contact_name || 'N/A'} />
                                        <div className="sm:col-span-2 border-t border-slate-100 dark:border-slate-800/40 pt-3 mt-1">
                                            <DetailRow label="Address / Dirección" value={selectedTask.result_summary.address || 'N/A'} />
                                        </div>
                                    </div>

                                    {/* Clinical Diagnoses */}
                                    {selectedTask.result_summary.diagnoses && (
                                        <div className="space-y-2.5">
                                            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">
                                                {language === 'es' ? "Diagnósticos Clínicos Detectados (ICD-10)" : "Clinical Diagnoses Found (ICD-10)"}
                                            </h4>
                                            <div className="p-4 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-bold text-slate-850 dark:text-slate-300">
                                                {selectedTask.result_summary.diagnoses}
                                            </div>
                                        </div>
                                    )}

                                    {/* Psychiatric Medications Scraped */}
                                    {selectedTask.result_summary.psych_medications && (
                                        <div className="space-y-2.5">
                                            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">
                                                {language === 'es' ? "Historial de Medicamentos y Análisis Clínico" : "Scraped Psychiatric Medications & Analysis"}
                                            </h4>
                                            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-150 dark:border-indigo-900/30 text-xs leading-relaxed whitespace-pre-wrap font-semibold text-slate-800 dark:text-slate-300">
                                                {selectedTask.result_summary.psych_medications}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-300 text-xs font-bold transition-all"
                            >
                                {language === 'es' ? "Cerrar" : "Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline input field helper to keep this file self-contained
function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text", disabled = false }: any) {
    return (
        <div className="group space-y-2">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 group-focus-within:text-[#6366f1] transition-colors">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-slate-400 group-focus-within:text-[#6366f1] transition-colors" />}
                    {label}
                </span>
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full h-11 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#6366f1]/60 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={placeholder}
            />
        </div>
    );
}

// Helper row inside report modal
function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
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

    if (msg.includes("tiempo de espera agotado") || msg.includes("timeout") && msg.includes("sms")) {
        return lang === 'es'
            ? "El código SMS de verificación no se ingresó a tiempo (límite de 5 minutos excedido)."
            : "The SMS verification code was not entered in time (5-minute limit exceeded).";
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
