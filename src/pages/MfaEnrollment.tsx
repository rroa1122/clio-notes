import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../notes-module/context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { OtpInput } from '../components/ui/OtpInput';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

let activeEnrollmentPromise: Promise<{ id: string; secret: string; qrCode: string; qrUri: string }> | null = null;

const startEnrollment = async (userEmail: string) => {
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
    const { theme, toggleTheme } = useTheme();
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
                setError(err.message || (isEs ? "Error al generar código QR." : "Failed to generate QR code."));
                activeEnrollmentPromise = null;
            }
        };
        enrollMfa();
    }, [user?.email, isEs]);

    const handleVerify = async (codeToVerify?: string) => {
        const targetCode = codeToVerify || code;
        if (targetCode.length !== 6) {
            setError(isEs ? "Ingresa el código de 6 dígitos." : "Enter the 6-digit code.");
            return;
        }
        if (!mfaFactorId) {
            setError(isEs ? "Error al inicializar 2FA." : "2FA not initialized.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: mfaFactorId
            });
            if (challengeError) throw challengeError;

            sessionStorage.setItem('clio_mfa_verified', 'true');
            const trustedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem('mfa_trusted_until', trustedUntil);

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challengeData.id,
                code: targetCode
            });
            if (verifyError) {
                sessionStorage.removeItem('clio_mfa_verified');
                throw verifyError;
            }

            activeEnrollmentPromise = null;
            setMfaEnrollmentRequired(false);
            toast.success(isEs ? "2FA activado" : "2FA activated");
        } catch (err: any) {
            console.error("MFA verification error:", err);
            setError(err.message || (isEs ? "Código inválido." : "Invalid code."));
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Premium Canvas Overlay */}
            <div className="absolute inset-0 bg-[#0B1020]/[0.025] dark:bg-[#0B1020]/[0.4] pointer-events-none" />

            {/* Floating Theme Toggle */}
            <button
                type="button"
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-md backdrop-blur-md hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>

            <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-10 shadow-2xl shadow-black/[0.03] dark:shadow-black/[0.3] relative overflow-hidden group transition-all duration-300">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6366f1]/20 rounded-full blur-[100px] group-hover:bg-[#6366f1]/30 transition-all duration-700" />

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-6 text-center">
                        <h1 className="text-2xl font-black tracking-[0.08em] bg-gradient-to-r from-[#3b82f6] via-[#4f46e5] to-[#6366f1] bg-clip-text text-transparent uppercase select-none">
                            {isEs ? "Activar 2FA" : "Setup 2FA"}
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-medium">
                            {isEs ? "Escanea el QR con tu app y escribe el código" : "Scan the QR code with your authenticator app"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-center">
                            <div className="p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                {mfaQrCode ? (
                                    <img src={mfaQrCode} alt="2FA QR Code" className="size-36 object-contain" />
                                ) : mfaQrUri ? (
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrUri)}`}
                                        alt="2FA QR Code"
                                        className="size-36 object-contain"
                                    />
                                ) : (
                                    <div className="size-36 flex items-center justify-center text-xs text-slate-400 font-bold animate-pulse">
                                        {isEs ? "Cargando QR..." : "Loading QR..."}
                                    </div>
                                )}
                            </div>
                        </div>

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

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-2.5 px-4 rounded-xl font-bold text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm cursor-pointer"
                            >
                                {loading
                                    ? (isEs ? "Verificando..." : "Verifying...")
                                    : (isEs ? "Activar y Entrar" : "Verify & Activate")}
                            </button>

                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                            >
                                <ArrowLeft className="size-3" />
                                {isEs ? "Volver al Inicio de Sesión" : "Return to Authentication"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
