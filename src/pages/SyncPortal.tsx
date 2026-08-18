import { useState, useEffect } from 'react';
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
    Calendar
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
                    setMfaChannel(data.mfa_channel || 'sms');
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
    const handleSubmitMfaCode = async () => {
        if (!mfaCode || mfaCode.length < 4) {
            toast.error(language === 'es' ? "Ingresa un código de verificación válido" : "Please enter a valid verification code");
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
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-3 sm:px-6 pt-1 pb-16 space-y-8">

            {/* Main Frosted Glass Connection Card */}
            <div className="backdrop-blur-2xl bg-card/95 border border-border/60 shadow-elevated rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all duration-300">
                {/* Subtle Ambient Radial Glow */}
                <div 
                    className={`pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-15 transition-colors duration-700 ${
                        mfaStatus === 'connected' 
                            ? 'bg-emerald-500' 
                            : mfaStatus === 'awaiting_2fa' 
                            ? 'bg-amber-500' 
                            : mfaStatus === 'processing' 
                            ? 'bg-blue-500' 
                            : mfaStatus === 'expired' 
                            ? 'bg-rose-500' 
                            : 'bg-primary'
                    }`} 
                />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    
                    {/* Left Column: Connection credentials & configuration */}
                    <div className="lg:col-span-7 bg-muted/30 dark:bg-slate-900/40 p-6 rounded-2xl border border-border/60 flex flex-col justify-between space-y-6">
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
                                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                                        {language === 'es' ? "Canal 2FA" : "2FA Channel"}
                                    </label>
                                    <div className="h-11 rounded-xl border border-border/80 bg-background/80 flex p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setMfaChannel('sms')}
                                            disabled={mfaStatus !== 'not_connected'}
                                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                                                mfaChannel === 'sms'
                                                    ? "bg-card text-primary shadow-sm border border-border/60"
                                                    : "text-muted-foreground hover:text-foreground"
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
                                                    ? "bg-card text-primary shadow-sm border border-border/60"
                                                    : "text-muted-foreground hover:text-foreground"
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
                            <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex items-start gap-2.5">
                                <Info size={15} className="text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
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
                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            {language === 'es' ? "Estableciendo conexión..." : "Initiating connection..."}
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} />
                                            {language === 'es' ? "Conectar e Iniciar Login" : "Connect & Verify Account"}
                                        </>
                                    )}
                                </button>
                            )}

                            {(mfaStatus === 'connected' || mfaStatus === 'awaiting_2fa' || mfaStatus === 'processing' || mfaStatus === 'expired') && (
                                <button
                                    onClick={handleDisconnect}
                                    className="w-full h-12 bg-muted/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border border-border/80 text-foreground rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm active:scale-[0.99] cursor-pointer"
                                >
                                    <Trash2 size={15} />
                                    {language === 'es' ? "Desconectar y Modificar Credenciales" : "Disconnect & Edit Credentials"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: 2FA Input Card or Active Status Showcase */}
                    <div className="lg:col-span-5 flex flex-col">
                        {mfaStatus === 'awaiting_2fa' ? (
                            <div className="bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-950/10 dark:to-transparent p-6 sm:p-7 rounded-2xl border border-amber-500/30 shadow-soft flex flex-col justify-between h-full space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={22} />
                                        </div>
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-1">
                                                <span>PASO 2 DE 3</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 tracking-tight">
                                                {language === 'es' ? "SMS Enviado a tu Teléfono" : "SMS Sent to Your Phone"}
                                            </h4>
                                            <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">
                                                {mfaChannel === 'email' ? (
                                                    language === 'es'
                                                        ? "Ingresa el código enviado a tu correo electrónico para autorizar la sesión del bot."
                                                        : "Enter the code sent to your email to authenticate the synchronization bot."
                                                ) : (
                                                    language === 'es'
                                                        ? "Amexzone acaba de enviar el código por SMS. Ingrésalo a continuación para autorizar el dispositivo por 90 días."
                                                        : "Amexzone just dispatched the SMS code. Enter it below to trust this device for 90 days."
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider text-center">
                                            {language === 'es' ? "Código de Seguridad (6 dígitos)" : "Security Code (6 digits)"}
                                        </label>
                                        <input
                                            type="text"
                                            value={mfaCode}
                                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                            className="w-full h-14 px-4 rounded-2xl border-2 border-amber-500/40 bg-background/90 focus:outline-none focus:ring-4 focus:ring-amber-500/20 text-center tracking-[0.3em] font-mono text-2xl font-bold text-foreground transition-all shadow-inner"
                                            placeholder="123456"
                                            disabled={submittingMfa}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmitMfaCode}
                                    disabled={submittingMfa || mfaCode.length < 4}
                                    className="w-full h-12 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50 shadow-md shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {submittingMfa ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            {language === 'es' ? "Verificando código..." : "Verifying code..."}
                                        </>
                                    ) : (
                                        <>
                                            <Check size={15} />
                                            {language === 'es' ? "Verificar y Enlazar Cuenta (90 Días)" : "Verify & Link Account (90 Days)"}
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : mfaStatus === 'processing' ? (
                            <div className="bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-950/30 dark:via-blue-950/10 dark:to-transparent p-6 sm:p-7 rounded-2xl border border-blue-500/30 shadow-soft flex flex-col justify-between h-full space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <RefreshCw size={22} className="animate-spin" />
                                        </div>
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-1">
                                                <span>{mfaCode ? "PASO 3 DE 3" : "PASO 1 DE 3"}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 tracking-tight">
                                                {mfaCode 
                                                    ? (language === 'es' ? "Validando Código 2FA y Guardando Sesión..." : "Validating 2FA Code & Saving Session...") 
                                                    : (language === 'es' ? "Conectando con Amexzone..." : "Connecting to Amexzone...")}
                                            </h4>
                                            <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">
                                                {mfaCode 
                                                    ? (language === 'es' 
                                                        ? "El bot está validando tu código en Amexzone y autorizando este dispositivo por 90 días." 
                                                        : "The bot is verifying your code with Amexzone and trusting this device for 90 days.") 
                                                    : (language === 'es' 
                                                        ? "Iniciando sesión de forma segura y solicitando el código de verificación por SMS..." 
                                                        : "Securely logging in and requesting the 2FA SMS verification code...")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-3">
                                        <div className="size-2.5 rounded-full bg-blue-500 animate-ping" />
                                        <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                                            {mfaCode 
                                                ? (language === 'es' ? "Estableciendo sesión de 90 días..." : "Establishing 90-day session...")
                                                : (language === 'es' ? "Esperando que Amexzone despache el SMS..." : "Waiting for Amexzone SMS dispatch...")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-muted/30 dark:bg-slate-900/40 p-6 sm:p-7 rounded-2xl border border-border/60 flex flex-col items-center justify-center text-center h-full space-y-5">
                                <div className={`size-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                                    mfaStatus === 'connected'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                        : 'bg-primary/10 text-primary border-primary/20'
                                }`}>
                                    {mfaStatus === 'connected' ? <ShieldCheck size={32} /> : <Shield size={32} />}
                                </div>
                                
                                <div className="space-y-1.5 max-w-xs">
                                    <h4 className="text-sm font-bold text-foreground">
                                        {mfaStatus === 'connected' 
                                            ? (language === 'es' ? "Conexión EMR Segura Activa" : "Secure EMR Link Active")
                                            : (language === 'es' ? "Integración Amexzone" : "Amexzone Bot Integration")}
                                    </h4>
                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
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
                                    <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 shadow-sm">
                                        <Sparkles size={13} className="text-emerald-500" />
                                        <span>{language === 'es' ? "PUENTE LISTO PARA SINCRONIZAR" : "READY FOR NOTE DISPATCH"}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Bottom Section: Bot logs and execution history */}
            <div className="space-y-6">
                
                {/* Section Title & Controls Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
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
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                                    }`}
                                >
                                    <span>{label}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isActive 
                                            ? 'bg-primary-foreground/20 text-primary-foreground' 
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Refresh Bar */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        {/* Search Input */}
                        <div className="flex items-center border border-border/80 bg-card rounded-full pl-3.5 pr-3 h-10 shadow-sm relative group focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all w-full sm:w-64">
                            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-full w-full bg-transparent border-0 p-0 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                                placeholder={language === 'es' ? "Buscar paciente o nota..." : "Search patient or note..."}
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')} 
                                    className="p-1 text-muted-foreground hover:text-foreground rounded-full"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Refresh Button */}
                        <button 
                            onClick={fetchTasks}
                            disabled={loadingTasks}
                            className="size-10 bg-card hover:bg-muted rounded-full border border-border/80 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                            title={language === 'es' ? "Actualizar registros" : "Refresh logs"}
                        >
                            <RefreshCw size={14} className={loadingTasks ? "animate-spin text-primary" : ""} />
                        </button>
                    </div>
                </div>

                {/* Tasks Table / Card List */}
                {loadingTasks ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-card/40 border border-border/50 rounded-3xl">
                        <RefreshCw size={28} className="animate-spin text-primary" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {language === 'es' ? "Cargando historial de sincronización..." : "Loading task records..."}
                        </p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="py-20 text-center backdrop-blur-sm bg-card/40 border border-border/50 rounded-3xl p-8 space-y-2">
                        <ClipboardList size={32} className="mx-auto text-muted-foreground/50" />
                        <p className="text-sm font-semibold text-foreground">
                            {language === 'es' ? "No se encontraron tareas" : "No task logs found"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {language === 'es' ? "No hay registros que coincidan con los filtros seleccionados." : "There are no records matching your current filter criteria."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Table Header (Desktop) */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                            <div className="col-span-3">{language === 'es' ? "Tipo / Acción" : "Action Type"}</div>
                            <div className="col-span-3">{language === 'es' ? "Paciente / Detalle" : "Patient Detail"}</div>
                            <div className="col-span-1">{language === 'es' ? "Visita" : "Visit"}</div>
                            <div className="col-span-2">{language === 'es' ? "Fecha Creación" : "Created At"}</div>
                            <div className="col-span-1 text-center">{language === 'es' ? "Estado" : "Status"}</div>
                            <div className="col-span-2 text-right">{language === 'es' ? "Acciones" : "Actions"}</div>
                        </div>

                        {/* Task Rows */}
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
                                    className="backdrop-blur-sm bg-card/70 hover:bg-card border border-border/50 hover:border-primary/40 hover:shadow-md transition-all duration-200 rounded-2xl px-5 py-3.5 flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 items-start lg:items-center group"
                                >
                                    {/* Action Type */}
                                    <div className="lg:col-span-3 flex items-center gap-3 w-full min-w-0">
                                        <span className={`size-9 rounded-xl flex items-center justify-center text-sm ${details.color} shrink-0 shadow-sm border border-border/40`}>
                                            {details.icon}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <span className="font-bold text-foreground text-xs block truncate">
                                                {details.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono block truncate">
                                                ID: {task.id.substring(0, 8)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Patient Detail */}
                                    <div className="lg:col-span-3 w-full min-w-0">
                                        <div className="space-y-0.5">
                                            <p className="font-semibold text-foreground text-xs truncate">{task.patient_name || 'N/A'}</p>
                                            {task.patient_dob && (
                                                <p className="text-[10px] text-muted-foreground font-medium">DOB: {task.patient_dob}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visit Date */}
                                    <div className="lg:col-span-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                                        <Calendar size={13} className="text-muted-foreground/70 shrink-0" />
                                        <span className="truncate">{task.visit_date || '—'}</span>
                                    </div>

                                    {/* Created At */}
                                    <div className="lg:col-span-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                                        <Clock size={13} className="text-muted-foreground/70 shrink-0" />
                                        <span className="truncate">{taskDate}</span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="lg:col-span-1 flex items-center lg:justify-center shrink-0">
                                        <TaskStatusBadge status={task.status} language={language} />
                                    </div>

                                    {/* Actions */}
                                    <div className="lg:col-span-2 w-full flex items-center justify-end gap-1.5 shrink-0">
                                        {/* Retry Button if failed */}
                                        {task.status === 'failed' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRetryTask(task.id); }}
                                                disabled={retryingTaskId === task.id}
                                                className="h-8 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1 text-[11px] font-semibold shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                                                title={language === 'es' ? "Reintentar tarea" : "Retry task"}
                                            >
                                                <RotateCcw size={12} className={retryingTaskId === task.id ? "animate-spin" : ""} />
                                                <span>{language === 'es' ? "Reintentar" : "Retry"}</span>
                                            </button>
                                        )}

                                        {/* View Result Summary Button */}
                                        {((task.status === 'completed' && task.result_summary) || (task.status === 'failed' && task.error_message)) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                                className="h-8 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-sm cursor-pointer shrink-0"
                                            >
                                                <Eye size={13} />
                                                <span>{language === 'es' ? "Resumen" : "Summary"}</span>
                                            </button>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
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
            <span className={`inline-flex items-center gap-2 font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)] ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </span>
                <span>{language === 'es' ? "Conectado" : "Connected"}</span>
            </span>
        );
    }

    if (status === 'awaiting_2fa') {
        return (
            <span className={`inline-flex items-center gap-2 font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)] animate-pulse ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span>{language === 'es' ? "Esperando 2FA" : "Awaiting 2FA"}</span>
            </span>
        );
    }

    if (status === 'processing') {
        return (
            <span className={`inline-flex items-center gap-2 font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)] ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <RefreshCw size={11} className="animate-spin text-blue-500" />
                <span>{language === 'es' ? "Verificando..." : "Verifying..."}</span>
            </span>
        );
    }

    if (status === 'expired') {
        return (
            <span className={`inline-flex items-center gap-2 font-bold uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 ${
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            }`}>
                <AlertTriangle size={11} className="text-rose-500" />
                <span>{language === 'es' ? "Sesión Expirada" : "Expired"}</span>
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-2 font-bold uppercase tracking-wider rounded-full bg-muted text-muted-foreground border border-border/80 ${
            compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
        }`}>
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60"></span>
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
    return (
        <div className="group space-y-2">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-1 group-focus-within:text-primary transition-colors">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-muted-foreground group-focus-within:text-primary transition-colors" />}
                    {label}
                </span>
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full h-11 px-4 rounded-xl border border-border/80 bg-background/80 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={placeholder}
            />
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
