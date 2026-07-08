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
    AlertTriangle 
} from 'lucide-react';

export function AmexzoneSyncTab() {
    const { user } = useAuth();
    const { language } = useLanguage();
    
    // Credentials and Integration States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('1206');
    const [mfaStatus, setMfaStatus] = useState<'not_connected' | 'awaiting_2fa' | 'connected' | 'expired' | 'processing'>('not_connected');
    const [mfaCode, setMfaCode] = useState('');
    
    // UI Loading States
    const [loadingIntegration, setLoadingIntegration] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submittingMfa, setSubmittingMfa] = useState(false);
    
    // Sync Tasks States
    const [tasks, setTasks] = useState<any[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);

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
                    setPassword(data.amexzone_password || '');
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

    // Fetch Recent Tasks
    const fetchTasks = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('amexzone_note_tasks')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            console.error("Error fetching note tasks:", err);
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user?.id]);

    // Polling for MFA status updates when awaiting verification
    useEffect(() => {
        if (mfaStatus !== 'awaiting_2fa' && mfaStatus !== 'processing') return;

        const interval = setInterval(async () => {
            if (!user?.id) return;
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
                        clearInterval(interval);
                    } else if (data.mfa_status === 'expired' || data.mfa_status === 'not_connected') {
                        toast.error(language === 'es' ? "Fallo en la conexión. Revisa las credenciales e intenta de nuevo." : "Connection failed. Please check credentials and try again.");
                        clearInterval(interval);
                    }
                }
            } catch (e) {
                console.error("Error polling MFA status:", e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [mfaStatus, user?.id, language]);

    // Disconnect / Reset Integration
    const handleDisconnect = async () => {
        if (window.confirm(language === 'es' ? "¿Estás seguro de cancelar la conexión actual?" : "Are you sure you want to cancel the current connection?")) {
            try {
                const { error } = await supabase
                    .from('provider_integrations')
                    .update({
                        mfa_status: 'not_connected',
                        mfa_code: null
                    })
                    .eq('user_id', user?.id);

                if (error) throw error;

                setMfaStatus('not_connected');
                toast.info(language === 'es' ? "Conexión reiniciada. Las credenciales se mantuvieron para que puedas editarlas." : "Connection reset. Credentials kept so you can edit them.");
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
            // Upsert credentials
            const { error } = await supabase
                .from('provider_integrations')
                .upsert({
                    user_id: user?.id,
                    amexzone_email: email,
                    amexzone_password: password,
                    amexzone_pin: pin,
                    mfa_status: 'awaiting_2fa', // Put into awaiting_2fa status to notify server bot
                    mfa_code: null, // Clear any stale codes
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            setMfaStatus('awaiting_2fa');
            toast.info(
                language === 'es' 
                    ? "Iniciando conexión. Revisa tu celular por el código SMS." 
                    : "Connecting. Check your phone for the SMS verification code."
            );
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
                    mfa_status: 'processing' // Bot reads this and tries to submit the code
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

    // Retry / Reprocess a single note task
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

    if (loadingIntegration) {
        return (
            <div className="p-8 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="flex items-center gap-5">
                    <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-slate-900 flex items-center justify-center border border-indigo-100/50 dark:border-slate-800">
                        <Cpu size={28} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {language === 'es' ? "Sincronización Amexzone" : "Amexzone Sync Integration"}
                        </h2>
                        <p className="text-sm font-medium text-slate-500">
                            {language === 'es' 
                                ? "Conecta tu portal de Amexzone para postear automáticamente tus notas clínicas firmadas." 
                                : "Connect your Amexzone portal to automatically post signed clinical notes."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Integration Credentials Section */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-50/30 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                            {language === 'es' ? "Credenciales del Portal" : "Portal Credentials"}
                        </h3>

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

                        <InputField
                            label={language === 'es' ? "PIN de Acceso Amexzone" : "Amexzone Access PIN"}
                            value={pin}
                            onChange={setPin}
                            placeholder="1206"
                            icon={Key}
                            type="password"
                            disabled={mfaStatus !== 'not_connected'}
                        />

                        {/* Status Display */}
                        <div className="p-4 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                            <span className="text-xs font-bold text-slate-500">
                                {language === 'es' ? "Estado de Conexión:" : "Connection Status:"}
                            </span>
                            <div className="flex items-center gap-2">
                                {mfaStatus === 'connected' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 size={12} />
                                        {language === 'es' ? "Conectado" : "Connected"}
                                    </span>
                                ) : mfaStatus === 'awaiting_2fa' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 animate-pulse">
                                        <Clock size={12} />
                                        {language === 'es' ? "Esperando SMS" : "Awaiting SMS"}
                                    </span>
                                ) : mfaStatus === 'processing' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">
                                        <RefreshCw size={12} className="animate-spin" />
                                        {language === 'es' ? "Procesando..." : "Verifying..."}
                                    </span>
                                ) : mfaStatus === 'expired' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400">
                                        <AlertTriangle size={12} />
                                        {language === 'es' ? "Sesión Expirada" : "Session Expired"}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        <AlertCircle size={12} />
                                        {language === 'es' ? "No Conectado" : "Not Connected"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Connection Button */}
                        {mfaStatus !== 'connected' && mfaStatus !== 'processing' && mfaStatus !== 'awaiting_2fa' && (
                            <button
                                onClick={handleConnect}
                                disabled={saving}
                                className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                            >
                                <Play size={16} />
                                {saving 
                                    ? (language === 'es' ? "Estableciendo conexión..." : "Initiating connection...") 
                                    : (language === 'es' ? "Conectar e Iniciar Login" : "Connect & Login")}
                            </button>
                        )}

                        {(mfaStatus === 'connected' || mfaStatus === 'awaiting_2fa' || mfaStatus === 'processing' || mfaStatus === 'expired') && (
                            <button
                                onClick={handleDisconnect}
                                className="w-full h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {language === 'es' ? "Desconectar y Modificar Credenciales" : "Disconnect & Edit Credentials"}
                            </button>
                        )}
                    </div>

                    {/* 2FA Input Verification Form */}
                    {(mfaStatus === 'awaiting_2fa' || mfaStatus === 'processing') && (
                        <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/20 space-y-4 animate-in slide-in-from-top duration-300">
                            <div className="flex gap-3">
                                <ShieldCheck className="text-amber-500 shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">
                                        {language === 'es' ? "Doble Factor (2FA) Requerido" : "Two-Factor Verification"}
                                    </h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        {language === 'es' 
                                            ? "Amexzone ha solicitado un código SMS de verificación. Por favor ingrésalo abajo una vez lo recibas." 
                                            : "Amexzone sent a verification code to your phone. Enter the code below."}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                    className="flex-1 h-12 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-amber-500/10 text-center tracking-[0.25em] text-lg font-black focus:border-amber-500/50"
                                    placeholder="123456"
                                    disabled={submittingMfa || mfaStatus === 'processing'}
                                />
                                <button
                                    onClick={handleSubmitMfaCode}
                                    disabled={submittingMfa || mfaStatus === 'processing' || mfaCode.length < 4}
                                    className="h-12 px-6 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                                >
                                    {submittingMfa ? (language === 'es' ? "Enviando..." : "Sending...") : (language === 'es' ? "Enviar" : "Submit")}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sincronización History / Queue Section */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-card border border-border/60 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                {language === 'es' ? "Cola de Sincronización Reciente" : "Recent Sync Queue"}
                            </h3>
                            <button 
                                onClick={fetchTasks}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Actualizar cola"
                            >
                                <RefreshCw size={14} className={loadingTasks ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {loadingTasks ? (
                            <div className="py-12 flex items-center justify-center">
                                <RefreshCw size={20} className="animate-spin text-slate-400" />
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs italic">
                                {language === 'es' ? "No hay notas sincronizadas recientemente." : "No recently synced notes found."}
                            </div>
                        ) : (
                            <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950/30">
                                <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {tasks.map((task) => (
                                        <div key={task.id} className="p-4 flex items-center justify-between gap-4 text-xs font-bold">
                                            <div className="space-y-1 truncate">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate">{task.patient_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{task.patient_dob}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                                                    <Calendar size={10} />
                                                    <span>{task.visit_date}</span>
                                                </div>
                                                {task.error_message && (
                                                    <p className="text-[10px] font-bold text-red-500 max-w-sm truncate" title={task.error_message}>
                                                        ⚠️ {task.error_message}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {/* Status Badge */}
                                                {task.status === 'completed' ? (
                                                    <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">
                                                        {language === 'es' ? "Completado" : "Completed"}
                                                    </span>
                                                ) : task.status === 'processing' ? (
                                                    <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                                                        {language === 'es' ? "Procesando" : "Processing"}
                                                    </span>
                                                ) : task.status === 'failed' ? (
                                                    <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">
                                                        {language === 'es' ? "Fallido" : "Failed"}
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">
                                                        {language === 'es' ? "Pendiente" : "Pending"}
                                                    </span>
                                                )}

                                                {/* Action Retry */}
                                                {task.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleRetryTask(task.id)}
                                                        disabled={retryingTaskId === task.id}
                                                        className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-sm"
                                                        title={language === 'es' ? "Reintentar sincronización" : "Retry sync"}
                                                    >
                                                        <RefreshCw size={11} className={retryingTaskId === task.id ? "animate-spin" : ""} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Inline input field helper to keep this tab completely modular
function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text", disabled = false }: any) {
    return (
        <div className="group space-y-2">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 group-focus-within:text-[#6366f1] transition-colors">
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
                className="w-full h-11 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#6366f1]/60 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={placeholder}
            />
        </div>
    );
}
