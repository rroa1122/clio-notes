
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export const Invite: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validatingToken, setValidatingToken] = useState(true);

    useEffect(() => {
        const handleToken = async () => {
            // Supabase sends tokens in the hash #access_token=...
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
                // If we don't have tokens, check if we are already logged in (maybe session persisted)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError("Invitation link is missing security tokens.");
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
            setError("Security requirement: Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Per product requirement: SIGN OUT and redirect to /login
            await supabase.auth.signOut();
            navigate('/login?activated=1', { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6366f1]/20 rounded-full blur-[100px] group-hover:bg-[#6366f1]/30 transition-all duration-700" />

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-[#6366f1] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6366f1]/20 mb-4 rotate-3">
                            <span className="text-white text-3xl font-black">C+</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">
                            {error ? 'Activation Failed' : 'Accept Invitation'}
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium text-center">
                            {error ? 'There was a problem with your invitation link.' : 'Create your secure clinical password to activate your account.'}
                        </p>
                    </div>

                    {validatingToken ? (
                        <div className="flex flex-col items-center py-10 space-y-4">
                            <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Validating Infrastructure...</p>
                        </div>
                    ) : error ? (
                        <div className="space-y-6">
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-3 px-4 rounded-xl font-bold">
                                {error}
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl transition-all uppercase tracking-tighter text-sm"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1] transition-all font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1] transition-all font-medium"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm"
                            >
                                {loading ? 'Updating Credentials...' : 'Activate Account'}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Secure Credential Infrastructure
                    </div>
                </div>
            </div>
        </div>
    );
};
