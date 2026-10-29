import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useTheme } from '../../notes-module/context/ThemeContext';
import { ArrowLeft, Eye, EyeOff, Sun, Moon } from 'lucide-react';

export const Invite: React.FC = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validatingToken, setValidatingToken] = useState(true);

    useEffect(() => {
        const handleToken = async () => {
            const hash = window.location.hash;
            const searchParams = new URLSearchParams(window.location.search);

            let accessToken = searchParams.get('access_token');
            let refreshToken = searchParams.get('refresh_token');

            if (hash) {
                const hashParams = new URLSearchParams(hash.substring(1));
                accessToken = accessToken || hashParams.get('access_token');
                refreshToken = refreshToken || hashParams.get('refresh_token');
            }

            if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (error) {
                    setError("This invitation link has expired or is invalid.");
                }
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError("Invalid or expired invitation link.");
                }
            }
            setValidatingToken(false);
        };

        handleToken();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            await supabase.auth.signOut();
            navigate('/login?activated=1', { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            <div className="absolute inset-0 bg-[#0B1020]/[0.025] dark:bg-[#0B1020]/[0.4] pointer-events-none" />

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
                            <svg viewBox="0 0 24 24" className="size-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="invite-g4" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="50%" stopColor="#4f46e5" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                                <g transform="rotate(0 12 12)">
                                    <path fill="url(#invite-g4)" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                </g>
                                <g transform="rotate(180 12 12)">
                                    <path fill="url(#invite-g4)" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                </g>
                            </svg>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.08em] bg-gradient-to-r from-[#3b82f6] via-[#4f46e5] to-[#6366f1] bg-clip-text text-transparent uppercase select-none">
                            {error ? 'Invite Expired' : 'Activate Account'}
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1.5 font-medium">
                            {error ? 'Contact your administrator for a new invite' : 'Create a password to activate your account'}
                        </p>
                    </div>

                    {validatingToken ? (
                        <div className="flex flex-col items-center py-8 space-y-3">
                            <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verifying...</p>
                        </div>
                    ) : error && !password ? (
                        <div className="space-y-4">
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-3 px-4 rounded-xl font-bold text-center">
                                {error}
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all uppercase tracking-tighter text-sm cursor-pointer"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-12 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Confirm Password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-2.5 px-4 rounded-xl font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm cursor-pointer"
                                >
                                    {loading ? 'Activating...' : 'Activate Account'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                >
                                    <ArrowLeft className="size-3" />
                                    Return to Authentication
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                        Protected by Clio Security Infrastructure
                    </div>
                </div>
            </div>
        </div>
    );
};
