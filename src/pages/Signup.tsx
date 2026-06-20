import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin + '/login'
                }
            });

            if (signUpError) {
                throw signUpError;
            }

            if (data.user && !data.session) {
                // Email verification required
                setSuccess("Account successfully created! Please check your email to confirm your account before logging in.");
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                return;
            }

            if (data.session || data.user) {
                // Success - redirect to setup
                // The AuthContext will handle the session state update
                navigate('/setup');
            }
        } catch (err: any) {
            setError(err.message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Premium Canvas Overlay */}
            <div className="absolute inset-0 bg-[#0B1020]/[0.025] pointer-events-none" />

            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-border/40 rounded-[2.5rem] p-10 shadow-2xl shadow-black/[0.03] relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6366f1]/20 rounded-full blur-[100px] group-hover:bg-[#6366f1]/30 transition-all duration-700" />

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-[#6366f1] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6366f1]/20 mb-4 rotate-3">
                            <span className="text-white text-3xl font-black">C+</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">
                            Create Account
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 font-medium">
                            Join Clio Clinical Suite today
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full bg-slate-100/10 border border-border/60 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
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
                                className="w-full bg-slate-100/10 border border-border/60 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition-all font-medium"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-3 px-4 rounded-xl font-bold flex items-start gap-3">
                                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 text-xs py-3 px-4 rounded-xl font-bold flex items-start gap-3">
                                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                                <span>{success}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#6366f1] hover:bg-[#6366f1]/90 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6366f1]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-sm"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>

                        <div className="pt-4 text-center">
                            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#6366f1] transition-colors flex items-center justify-center gap-2">
                                <ArrowLeft className="size-3" />
                                Back to Sign In
                            </Link>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Protected by Clio Security Infrastructure
                    </div>
                </div>
            </div>
        </div>
    );
};
