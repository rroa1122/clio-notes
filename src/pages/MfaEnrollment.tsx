import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';
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
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
    const [mfaSecret, setMfaSecret] = useState<string | null>(null);
    const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
    const [mfaQrUri, setMfaQrUri] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                setMfaSecret(data.secret);
                setMfaQrCode(data.qrCode);
                setMfaQrUri(data.qrUri);
            } catch (err: any) {
                console.error("Failed to start MFA enrollment:", err);
                setError(err.message || "Failed to start 2FA enrollment. Please try again.");
                activeEnrollmentPromise = null; // Clear cache on failure to allow retry
            }
        };
        enrollMfa();
    }, [user?.email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError("Please enter a 6-digit code.");
            return;
        }
        if (!mfaFactorId) {
            setError("MFA enrollment was not initialized correctly.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Challenge the factor
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: mfaFactorId
            });
            if (challengeError) throw challengeError;

            // Verify the challenge
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: mfaFactorId,
                challengeId: challengeData.id,
                code: code
            });
            if (verifyError) throw verifyError;

            // Successfully enrolled!
            activeEnrollmentPromise = null; // Clear cache
            setMfaEnrollmentRequired(false);
            toast.success("Two-Factor Authentication activated successfully!");
        } catch (err: any) {
            console.error("MFA verification error:", err);
            setError(err.message || "Invalid code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        activeEnrollmentPromise = null; // Clear cache
        signOut('voluntary');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Premium background radial gradient */}
            <div className="absolute inset-0 bg-[#0B1020]/[0.025] pointer-events-none" />

            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[100px]" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-lg mb-4 text-rose-600">
                        <Lock size={32} className="animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-2">Setup 2-Factor Auth</h1>
                    <p className="text-xs font-semibold text-slate-500 text-center max-w-xs mb-6 leading-relaxed">
                        Secure your account. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
                    </p>

                    <div className="w-full space-y-6">
                        <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 max-w-[220px] mx-auto">
                            {mfaQrCode ? (
                                <img src={mfaQrCode} alt="2FA QR Code" className="size-44" />
                            ) : mfaQrUri ? (
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrUri)}`} 
                                    alt="2FA QR Code" 
                                    className="size-44" 
                                />
                            ) : (
                                <div className="size-44 flex items-center justify-center text-xs text-slate-400 font-bold">Loading QR Code...</div>
                            )}
                        </div>

                        {mfaSecret && (
                            <div className="space-y-1 text-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Manual Secret Key</span>
                                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-150 text-xs font-mono font-bold select-all tracking-wider text-slate-600 max-w-xs mx-auto truncate">
                                    {mfaSecret}
                                </div>
                            </div>
                        )}

                        <div className="h-px bg-slate-100" />

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2 text-center">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Enter 6-Digit Code
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center h-14 rounded-2xl border border-slate-200 bg-slate-50 text-xl font-bold tracking-[0.5em] focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500/50 transition-all text-slate-800"
                                    placeholder="000000"
                                    required
                                />
                                {error && (
                                    <p className="text-xs font-bold text-red-500 pt-1 flex items-center justify-center gap-1.5 leading-relaxed text-center animate-shake">
                                        <ShieldAlert size={12} className="shrink-0" /> {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-rose-500/10 active:scale-95 animate-in fade-in"
                            >
                                {loading ? "Verifying..." : "Verify & Activate"}
                            </button>
                        </form>

                        <div className="h-px w-full bg-slate-100" />

                        <div className="flex justify-center">
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                            >
                                <LogOut size={14} />
                                Cancel & Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
