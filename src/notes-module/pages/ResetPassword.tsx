import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, ArrowRight, Loader2, Stethoscope, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a session (magic link from email establishes one)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, they shouldn't be here unless they are resetting via email link
                // Supabase handles the hash fragment automatically to create the session
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setIsSuccess(true);
            toast.success('Password set successfully!');

            // Redirect to login after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            console.error('Reset Password Error:', err);
            setError(err.message || 'Failed to update password.');
            toast.error('Update failed', { description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden animate-in fade-in duration-1000">
                <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0" />

                <div className="w-full max-w-[460px] relative z-10 text-center">
                    <div className="size-24 rounded-[2.5rem] bg-teal-500 flex items-center justify-center text-white mb-10 shadow-2xl shadow-teal-500/30 mx-auto animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display mb-4">Account <span className="text-primary">Ready</span></h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                        Credential update verified. Redirecting to clinical workspace...
                    </p>
                    <div className="mt-12 flex justify-center">
                        <div className="size-2 bg-primary rounded-full animate-ping opacity-75"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden animate-in fade-in duration-1000">
            {/* Professional Background Accents */}
            <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none z-0" />

            <div className="w-full max-w-[460px] relative z-10">
                {/* Unified Branding */}
                <div className="flex flex-col items-center mb-12 text-center">
                    <div className="size-20 rounded-[2rem] bg-primary flex items-center justify-center text-white mb-8 shadow-2xl shadow-teal-500/30">
                        <Stethoscope size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase font-display leading-none">
                        Clio<span className="text-primary">Flow</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="h-px w-4 bg-slate-200 dark:bg-slate-800"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Credential Management</p>
                        <span className="h-px w-4 bg-slate-200 dark:bg-slate-800"></span>
                    </div>
                </div>

                {/* Glassmorphic Setup Card */}
                <div className="card glass-effect border-white/50 dark:border-white/5 !p-0 overflow-hidden shadow-float">
                    <div className="px-10 py-8 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex items-center gap-5">
                        <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                            <KeyRound size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Identity <span className="text-primary">Provisioning</span>
                        </h3>
                    </div>

                    <div className="p-10">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary block ml-1">New access key</label>
                                <div className="relative group">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 transition-colors group-focus-within:text-primary" size={20} />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-slate-100 dark:border-white/10 focus:border-primary py-4 pl-10 text-lg font-bold dark:text-white outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary block ml-1">Confirm identification</label>
                                <div className="relative group">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 transition-colors group-focus-within:text-primary" size={20} />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-slate-100 dark:border-white/10 focus:border-primary py-4 pl-10 text-lg font-bold dark:text-white outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 text-red-500 border-2 border-red-500/10 text-[11px] font-black uppercase tracking-widest flex items-center gap-4 animate-in shake duration-500">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <span>Validation Error: {error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-16 mt-4 rounded-[2rem] bg-primary text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={22} />
                                        <span>Securing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Authenticate Access</span>
                                        <ArrowRight size={22} className="opacity-60" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="flex flex-col items-center mt-12 gap-1 text-[10px] uppercase font-black tracking-[0.3em] text-slate-400 opacity-40">
                    <p>Verified Clinical Deployment</p>
                    <p>ClinicFlow Enterprise Security</p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
