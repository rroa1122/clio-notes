import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import { OtpInput } from '../components/ui/OtpInput';
import { 
    ShieldCheck, 
    LogOut, 
    ShieldAlert, 
    QrCode, 
    Smartphone, 
    ArrowRight,
    Lock
} from 'lucide-react';
import { toast } from 'sonner';

// Module-level cache to prevent StrictMode double-mount race conditions
let activeEnrollmentPromise: Promise<{ id: string; secret: string; qrCode: string; qrUri: string }> | null = null;

const startEnrollment = async (userEmail: string) => {
    // List factors first to check if there are any stale unverified/verified factors we must clean up
    const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors();
    if (!listErr && factorsData && factorsData.all.length > 0) {
        for (const factor of factorsData.all) {
            try {
                await supabase.auth.mfa.unenroll({ factorId: factor.id });
            } catch (unenrollErr) {
                console.warn("Could not clean up old factor:", factor.id, unenrollErr);
            }
        }
    }

    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Clio Notes',
        friendlyName: userEmail
    });
    if (enrollErr) throw enrollErr;

    return {
        id: data.id,
        secret: data.totp.secret,
        qrCode: data.totp.qr_code,
        qrUri: data.totp.uri
    };
};

export const MfaEnrollment: React.FC = () => {
    const { user, setMfaEnrollmentRequired, signOut } = useAuth();
    const { language } = useLanguage();
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [mfaQrUri, setMfaQrUri] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEs = language === 'es';

    useEffect(() => {
        if (!user?.email) return;

        const enrollMfa = async () => {
            try {
                setError(null);
                if (!activeEnrollmentPromise) {
                    activeEnrollmentPromise = startEnrollment(user.email);
                }
                const data = await activeEnrollmentPromise;
                setMfaFactorId(data.id);
                setMfaQrCode(data.qrCode);
                setMfaQrUri(data.qrUri);
            } catch (err: any) {
                console.error("Failed to start MFA enrollment:", err);
                setError(err.message || (isEs ? "No se pudo iniciar la inscripción 2FA. Reintente." : "Failed to start 2FA enrollment. Please try again."));
                activeEnrollmentPromise = null;
            }
        };
        enrollMfa();
    }, [user?.email, isEs]);

    const handleVerify = async (codeToVerify?: string) => {
        const targetCode = codeToVerify || code;
        if (targetCode.length !== 6) {
            setError(isEs ? "Por favor ingrese un código de 6 dígitos." : "Please enter a 6-digit code.");
            return;
        }
        if (!mfaFactorId) {
            setError(isEs ? "Error al inicializar 2FA." : "MFA enrollment was not initialized correctly.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: mfaFactorId
            });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challengeData.id,
                code: targetCode
            });
            if (verifyError) throw verifyError;

            activeEnrollmentPromise = null;
            setMfaEnrollmentRequired(false);
            toast.success(isEs ? "¡Autenticación de 2 Factores activada con éxito!" : "Two-Factor Authentication activated successfully!");
        } catch (err: any) {
            console.error("MFA verification error:", err);
            setError(err.message || (isEs ? "Código inválido. Por favor intente de nuevo." : "Invalid code. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleVerify();
    };

    const handleSignOut = () => {
        activeEnrollmentPromise = null;
        signOut('voluntary');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
            {/* Background glowing gradient Orbs */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/15 to-violet-600/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-lg w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 rounded-[2.5rem] p-6 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group z-10 animate-in fade-in zoom-in-95 duration-300">
                {/* Decorative border highlight */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-70" />

                <div className="flex flex-col items-center text-center">
                    {/* Header Icon */}
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.2)] mb-5">
                        <ShieldCheck size={32} className="stroke-[2.2] animate-pulse" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                        {isEs ? "Configurar Autenticación 2FA" : "Setup 2-Factor Auth"}
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-sm mb-6 leading-relaxed">
                        {isEs 
                            ? "Proteja su cuenta y cumpla con el estándar de seguridad HIPAA escaneando el código QR con su aplicación autenticadora."
                            : "Protect your account according to HIPAA guidelines. Scan the QR code using your preferred authenticator app."}
                    </p>

                    {/* Step-by-Step Container */}
                    <div className="w-full space-y-6">
                        
                        {/* STEP 1 */}
                        <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 space-y-4 text-left">
                            <div className="flex items-center gap-2">
                                <span className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-black text-xs border border-indigo-500/30">1</span>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                    <QrCode size={14} className="text-indigo-400" />
                                    {isEs ? "Escanear Código QR" : "Scan QR Code"}
                                </h3>
                            </div>

                            {/* QR Code Container */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
                                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-lg shrink-0 transition-transform hover:scale-105">
                                    {mfaQrCode ? (
                                        <img src={mfaQrCode} alt="2FA QR Code" className="size-36 sm:size-40 object-contain" />
                                    ) : mfaQrUri ? (
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrUri)}`} 
                                            alt="2FA QR Code" 
                                            className="size-36 sm:size-40 object-contain" 
                                        />
                                    ) : (
                                        <div className="size-36 sm:size-40 flex items-center justify-center text-xs text-slate-400 font-bold animate-pulse">
                                            {isEs ? "Cargando QR..." : "Loading QR..."}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 text-left">
                                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                                        {isEs 
                                            ? "Abra su app de autenticación (Google Authenticator, Authy, 1Password, Microsoft Authenticator) y escanee la imagen."
                                            : "Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan the image."}
                                    </p>
                                    
                                    {/* App Badges */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {['Google Auth', 'Authy', '1Password', 'Microsoft'].map((app) => (
                                            <span key={app} className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-bold text-slate-400 border border-slate-700/60">
                                                {app}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2 */}
                        <form onSubmit={handleSubmit} className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                            <div className="flex items-center gap-2 text-left">
                                <span className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-black text-xs border border-indigo-500/30">2</span>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                    <Smartphone size={14} className="text-indigo-400" />
                                    {isEs ? "Ingresar Código de 6 Dígitos" : "Enter 6-Digit Verification Code"}
                                </h3>
                            </div>

                            {/* OTP 6-Digit Input */}
                            <div className="py-2">
                                <OtpInput
                                    length={6}
                                    value={code}
                                    onChange={(val) => {
                                        setCode(val);
                                        if (error) setError(null);
                                    }}
                                    disabled={loading}
                                    hasError={Boolean(error)}
                                    autoFocus={true}
                                    onComplete={(completedCode) => handleVerify(completedCode)}
                                />
                            </div>

                            {error && (
                                <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 animate-bounce">
                                    <ShieldAlert size={14} className="shrink-0" /> {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-98 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {isEs ? "Verificando..." : "Verifying..."}
                                    </>
                                ) : (
                                    <>
                                        <Lock size={14} />
                                        {isEs ? "Verificar y Activar 2FA" : "Verify & Activate 2FA"}
                                        <ArrowRight size={14} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer Actions */}
                        <div className="pt-2 flex justify-center">
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider py-1 px-3 rounded-lg hover:bg-slate-800/50"
                            >
                                <LogOut size={14} />
                                {isEs ? "Cancelar y Cerrar Sesión" : "Cancel & Sign Out"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
