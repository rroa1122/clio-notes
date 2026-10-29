import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../notes-module/context/ThemeContext';
import { OtpInput } from '../components/ui/OtpInput';
import { ArrowLeft, ShieldCheck, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

export const MfaChallenge: React.FC = () => {
    const { verifyMfaCode, signOut } = useAuth();
    const { language } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trustDevice, setTrustDevice] = useState(true);

    const isEs = language === 'es';

    const handleVerify = async (codeToVerify?: string) => {
        const targetCode = codeToVerify || code;
        if (targetCode.length !== 6) {
            setError(isEs ? "Ingresa el código de 6 dígitos." : "Enter the 6-digit code.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await verifyMfaCode(targetCode, trustDevice);
            toast.success(isEs ? "Sesión verificada" : "Session verified");
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
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-4 overflow-hidden">
                            <svg
                                viewBox="0 0 24 24"
                                className="size-10"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient id="mfa-g4" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="50%" stopColor="#4f46e5" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                                <g transform="rotate(0 12 12)">
                                    <path fill="url(#mfa-g4)" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                </g>
                                <g transform="rotate(180 12 12)">
                                    <path fill="url(#mfa-g4)" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                </g>
                            </svg>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.08em] bg-gradient-to-r from-[#3b82f6] via-[#4f46e5] to-[#6366f1] bg-clip-text text-transparent uppercase select-none">
                            {isEs ? "Código 2FA" : "2FA Code"}
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1.5 font-medium">
                            {isEs ? "Ingresa el código de 6 dígitos de tu app" : "Enter the 6-digit code from your authenticator"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
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
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-2.5 px-4 rounded-xl font-bold text-center">
                                {error}
                            </div>
                        )}

                        {/* Clean Trust Device Toggle */}
                        <div
                            onClick={() => setTrustDevice(!trustDevice)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer select-none ${
                                trustDevice
                                    ? 'bg-[#6366f1]/5 dark:bg-[#6366f1]/10 border-[#6366f1]/40 text-slate-800 dark:text-slate-100'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className={`size-4 shrink-0 ${trustDevice ? 'text-[#6366f1]' : 'text-slate-400'}`} />
                                <span className="text-xs font-bold">
                                    {isEs ? "Recordar este dispositivo (90 días)" : "Remember this device (90 days)"}
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={trustDevice}
                                onChange={(e) => setTrustDevice(e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="size-4 rounded border-slate-300 dark:border-slate-700 text-[#6366f1] focus:ring-[#6366f1] cursor-pointer accent-[#6366f1]"
                            />
                        </div>

                        <div className="space-y-3 pt-1">
                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm cursor-pointer"
                            >
                                {loading
                                    ? (isEs ? "Verificando..." : "Verifying...")
                                    : (isEs ? "Continuar al Panel" : "Verify & Continue")}
                            </button>

                            <button
                                type="button"
                                onClick={() => signOut('voluntary')}
                                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                            >
                                <ArrowLeft className="size-3" />
                                {isEs ? "Volver al Inicio de Sesión" : "Return to Authentication"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                        Protected by Clio Security Infrastructure
                    </div>
                </div>
            </div>
        </div>
    );
};
