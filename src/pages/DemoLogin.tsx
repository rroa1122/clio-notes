import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export const DEMO_CREDENTIALS = {
    email: 'demo@clinicflow.dev',
    password: 'DemoVoice2026!'
};

export const DemoLogin: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<string>('Iniciando entorno Demo interactivo...');
    const [error, setError] = useState<string | null>(null);

    const handleAutoLogin = async () => {
        setError(null);
        setStatus('Preparando sesión demo segura...');

        try {
            // Set MFA trust bypass for seamless visitor experience
            const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem('mfa_trusted_until', future);
            sessionStorage.setItem('clio_mfa_verified', 'true');
            localStorage.setItem('bypass_mfa', 'true');

            // Check if active session already matches demo account
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email?.toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase()) {
                setStatus('Sesión activa detectada. Ingresando al panel...');
                navigate('/notes/new', { replace: true });
                return;
            }

            // If a different user is logged in, sign them out first
            if (session) {
                setStatus('Restableciendo sesión para la Demo...');
                await supabase.auth.signOut();
            }

            setStatus('Autenticando credenciales de la Demo...');
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: DEMO_CREDENTIALS.email,
                password: DEMO_CREDENTIALS.password,
            });

            if (signInError) {
                console.error('[DemoLogin] Error al iniciar sesión:', signInError);
                throw signInError;
            }

            if (data?.session) {
                setStatus('¡Acceso concedido! Redirigiendo a Clio Notes...');
                setTimeout(() => {
                    navigate('/notes/new', { replace: true });
                }, 400);
            }
        } catch (err: any) {
            console.error('[DemoLogin] Fallo de inicio automático:', err);
            setError(err.message || 'No se pudo iniciar la sesión automática de la Demo.');
            setStatus('');
        }
    };

    useEffect(() => {
        handleAutoLogin();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Ambient glows */}
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-3xl pointer-events-none" />

            <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 text-center">
                {/* Logo / Badge */}
                <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-5 border border-indigo-500/20 shadow-inner">
                    <Sparkles className="size-7 animate-pulse" />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                    Clio Notes Live Demo
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Explora la generación de notas clínicas estructuradas, agenda médica y sincronización EHR.
                </p>

                {error ? (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-left flex items-start gap-3">
                            <AlertCircle className="size-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Error de conexión Demo</p>
                                <p className="mt-0.5 opacity-90">{error}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleAutoLogin}
                                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            >
                                Reintentar Acceso
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Ir a Login
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                            <Loader2 className="size-4 animate-spin shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <span>{status}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            Accediendo como <span className="font-bold text-slate-700 dark:text-slate-300">Dr. Alex Demo</span> (Modo Interactivo)
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoLogin;
