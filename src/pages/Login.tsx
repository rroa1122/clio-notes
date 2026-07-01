import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [view, setView] = useState<'login' | 'forgot'>('login');

    useEffect(() => {
        if (searchParams.get('activated')) {
            setStatusMessage("Account activated successfully! You can now sign in with your new password.");
        } else if (searchParams.get('reset')) {
            setStatusMessage("Password updated successfully. Please sign in to verify your identity.");
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStatusMessage(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            }
        } catch (err: any) {
            console.error("Login exception:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStatusMessage(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth/reset',
        });

        if (error) {
            setError(error.message);
        } else {
            setStatusMessage("Verification link sent. If an account exists for this email, you will receive reset instructions shortly.");
            // Don't switch view yet, let them read success message
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Premium Canvas Overlay */}
            <div className="absolute inset-0 bg-[#0B1020]/[0.025] pointer-events-none" />

            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-border/40 rounded-[2.5rem] p-10 shadow-2xl shadow-black/[0.03] relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6366f1]/20 rounded-full blur-[100px] group-hover:bg-[#6366f1]/30 transition-all duration-700" />

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-10">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-4 group/logo cursor-pointer overflow-hidden transition-all duration-300">
                            <svg 
                                viewBox="0 0 24 24" 
                                className="size-10"
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient id="login-g4" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#00f2fe" />
                                        <stop offset="50%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                                <style>{`
                                    @keyframes login-spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                    @keyframes login-breathe {
                                        0%, 100% { transform: translateY(0); }
                                        50% { transform: translateY(-1.5px); }
                                    }
                                    .login-grp {
                                        transform-origin: 12px 12px;
                                        animation: login-spin 40s linear infinite;
                                    }
                                    .login-fnl {
                                        animation: login-breathe 3s ease-in-out infinite;
                                        transform-origin: 12px 12px;
                                        fill: url(#login-g4);
                                    }
                                `}</style>
                                <g className="login-grp">
                                    <g transform="rotate(0 12 12)">
                                        <path className="login-fnl" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                    </g>
                                    <g transform="rotate(180 12 12)">
                                        <path className="login-fnl" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                    </g>
                                </g>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black tracking-[0.1em] bg-gradient-to-r from-[#00f2fe] via-[#3b82f6] to-[#6366f1] bg-clip-text text-transparent uppercase select-none">
                            {view === 'login' ? 'Clio Notes' : 'Identity Recovery'}
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium">
                            {view === 'login' ? 'Log in to your Clio account' : 'Security verification for password reset'}
                        </p>
                    </div>

                    {statusMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 text-xs py-3 px-4 rounded-xl font-bold mb-6 flex items-start gap-3">
                            <ShieldCheck className="size-4 mt-0.5 shrink-0" />
                            <span>{statusMessage}</span>
                        </div>
                    )}

                    {view === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-100/10 border border-border/60 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
                                    placeholder="doctor@clioflow.dev"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot')}
                                        className="text-[9px] font-black uppercase tracking-widest text-[#6366f1] hover:text-[#6366f1]/80 transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-100/10 border border-border/60 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-3 px-4 rounded-xl font-bold">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm"
                            >
                                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Recovery Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-100/10 border border-border/60 rounded-xl pl-12 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
                                        placeholder="doctor@clioflow.dev"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-3 px-4 rounded-xl font-bold">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm"
                                >
                                    {loading ? 'Sending Instructions...' : 'Request Reset Link'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('login')}
                                    className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors py-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <ArrowLeft className="size-3" />
                                    Return to Authentication
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Protected by Clio Security Infrastructure
                    </div>
                </div>
            </div>
        </div>
    );
};
