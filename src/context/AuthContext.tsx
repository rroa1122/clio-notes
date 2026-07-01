
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { calendarService } from '../services/calendarService';


export interface User {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    npi?: string;
    professional_title?: string;
    license_id?: string;
    email: string;
    avatar?: string;
    clinic_id?: string;
    signature_url?: string;
    setup_complete?: boolean;
    subscription_tier?: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    mfaRequired: boolean;
    mfaEnrollmentRequired: boolean;
    setMfaEnrollmentRequired: (val: boolean) => void;
    login: (email: string, password: string) => Promise<void>;
    signOut: (reason?: 'inactivity' | 'voluntary') => Promise<void>;
    logout: (reason?: 'inactivity' | 'voluntary') => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    refreshUser: () => Promise<void>;
    verifyMfaCode: (code: string, trustDevice?: boolean) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState(false);

    const mapSupabaseUser = async (sbUser: SupabaseUser) => {
        try {
            // Use the centralized bootstrap function to ensure data integrity
            const { ensureUserBootstrap } = await import('../notes-module/lib/userBootstrap');
            const { profile } = await ensureUserBootstrap(sbUser.id, sbUser.email || '');

            const newUser: User = {
                id: sbUser.id,
                email: sbUser.email || '',
                name: profile?.full_name || sbUser.email?.split('@')[0] || 'Doctor',
                first_name: profile?.first_name,
                last_name: profile?.last_name,
                npi: profile?.npi,
                professional_title: profile?.professional_title,
                license_id: profile?.license_id,
                role: profile?.role || 'doctor',
                clinic_id: profile?.clinic_id,
                signature_url: profile?.signature_url,
                setup_complete: profile?.setup_complete,
                subscription_tier: profile?.subscription_tier || 'free'
            };
            setUser(newUser);

            // If setup is needed, we could potentially set a flag or redirect here,
            // but the Router will handle the redirect based on the DB field via a new hook/component.
        } catch (error) {
            console.error('Error bootstrapping user:', error);
            // Fallback for safety, though ideally we want to block or show error if bootstrap fails
            setUser({
                id: sbUser.id,
                email: sbUser.email || '',
                name: sbUser.email?.split('@')[0] || 'Doctor',
                role: 'doctor',
                setup_complete: false, // Default to false on error to be safe
                subscription_tier: 'free'
            });
        }
    };

    const clearCaches = () => {
        const keysToClear = [
            'clio_settings',
            'clio_templates',
            'clio_active_template_id',
            'lastNoteId'
        ];
        keysToClear.forEach(key => localStorage.removeItem(key));
        calendarService.clearCache();
    };

    const INITIAL_CHECK_TIMEOUT = 3000; // 3 seconds fail-safe

    useEffect(() => {
        let mounted = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        console.log('[Auth] Initializing AuthContext...');

        // Fail-safe: If Supabase takes too long, stop loading so app can render (likely redirecting to login)
        timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Initial session check timed out after 3000ms. Forcing load completion.');
                setLoading(false);
            }
        }, INITIAL_CHECK_TIMEOUT);

        const checkMfaStatusSync = (sbUser: SupabaseUser, onComplete: (isMfaActive: boolean) => void) => {
            const trustExpiry = localStorage.getItem('mfa_trusted_until');
            const isDeviceTrusted = trustExpiry && new Date(trustExpiry) > new Date();

            supabase.auth.mfa.listFactors().then(({ data: factorsData, error: factorsErr }) => {
                if (factorsErr) {
                    console.error("Error listing factors:", factorsErr);
                    setMfaEnrollmentRequired(false);
                    setMfaRequired(false);
                    onComplete(false);
                    return;
                }
                const hasVerifiedFactor = factorsData.all?.some(f => f.status === 'verified') || false;
                if (!hasVerifiedFactor) {
                    setMfaEnrollmentRequired(true);
                    setMfaRequired(false);
                    onComplete(true);
                } else {
                    setMfaEnrollmentRequired(false);
                    if (isDeviceTrusted) {
                        setMfaRequired(false);
                        onComplete(false);
                    } else {
                        supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data: aalData, error: aalErr }) => {
                            if (!aalErr && aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
                                setMfaRequired(true);
                                onComplete(true);
                            } else {
                                setMfaRequired(false);
                                onComplete(false);
                            }
                        }).catch(err => {
                            console.error("Error checking AAL:", err);
                            setMfaRequired(false);
                            onComplete(false);
                        });
                    }
                }
            }).catch(err => {
                console.error("Error listing factors promise:", err);
                setMfaEnrollmentRequired(false);
                setMfaRequired(false);
                onComplete(false);
            });
        };

        const initAuth = async () => {
            console.log('[Auth] Checking session...');
            const { data: { session }, error } = await supabase.auth.getSession();
 
            if (error) {
                console.error('[Auth] Error getting session:', error);
            }
 
            if (mounted) {
                clearTimeout(timeoutId); // Clear fail-safe if successful
 
                if (session?.user) {
                    console.log('[Auth] Session found for:', session.user.email);
                    setSession(session);
                    // Check MFA status
                    checkMfaStatusSync(session.user, (isMfaActive) => {
                        if (!isMfaActive) {
                            if (mounted) setLoading(true);
                            mapSupabaseUser(session.user).finally(() => {
                                if (mounted) setLoading(false);
                            });
                        } else {
                            setUser({
                                id: session.user.id,
                                email: session.user.email || '',
                                name: session.user.email?.split('@')[0] || 'User',
                                role: 'provider'
                            });
                            setLoading(false);
                        }
                    });
                } else {
                    console.log('[Auth] No active session found.');
                    setUser(null);
                    setSession(null);
                    setMfaRequired(false);
                    setMfaEnrollmentRequired(false);
                    setLoading(false);
                }
            }
        };
 
        initAuth();
 
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[Auth] Auth state change: ${event}`);
            if (mounted) {
                try {
                    if (event === 'SIGNED_OUT') {
                        clearCaches();
                        setUser(null);
                        setSession(null);
                        setMfaRequired(false);
                        setMfaEnrollmentRequired(false);
                        setLoading(false);
                    } else if (session?.user) {
                        setSession(session);
                        checkMfaStatusSync(session.user, (isMfaActive) => {
                            if (!isMfaActive) {
                                if (mounted) setLoading(true);
                                mapSupabaseUser(session.user).finally(() => {
                                    if (mounted) setLoading(false);
                                });
                            } else {
                                setUser({
                                    id: session.user.id,
                                    email: session.user.email || '',
                                    name: session.user.email?.split('@')[0] || 'User',
                                    role: 'provider'
                                });
                                setLoading(false);
                            }
                        });
                    } else {
                        setSession(null);
                        setUser(null);
                        setMfaRequired(false);
                        setMfaEnrollmentRequired(false);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("[Auth] Exception in onAuthStateChange callback:", err);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Registrar inicio de sesión
        import('../services/auditService').then(({ auditService }) => {
            auditService.logAction({
                action: 'LOGIN',
                description: 'Logged into the system',
                targetType: 'auth'
            });
        }).catch(err => console.error('Error logging login:', err));
    };

    const signup = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin + '/login'
            }
        });
        if (error) throw error;
    };

    const signOut = async (reason?: 'inactivity' | 'voluntary') => {
        const signoutReason = reason || 'voluntary';
        // Registrar cierre de sesión antes de limpiar
        try {
            const { auditService } = await import('../services/auditService');
            await auditService.logAction({
                action: 'LOGOUT',
                description: signoutReason === 'inactivity'
                    ? 'Session closed automatically due to inactivity (15 minutes)'
                    : 'Logged out voluntarily',
                targetType: 'auth'
            });
            auditService.clearCache();
        } catch (e) {
            console.error('Error logging logout:', e);
        }
        clearCaches();
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setMfaRequired(false);
        setMfaEnrollmentRequired(false);
    };

    const logout = signOut;

    const refreshUser = async () => {
        if (session?.user) {
            console.log('[Auth] Refreshing user data...');
            await mapSupabaseUser(session.user);
        }
    };

    // HIPAA Inactivity Timeout (15 minutes)
    useEffect(() => {
        if (!session?.user) return;

        const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
        let timeoutId: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT);
        };

        const handleInactivityTimeout = async () => {
            console.log('[Auth] Inactivity timeout reached. Logging out...');
            try {
                const { toast } = await import('sonner');
                toast.warning("Sesión cerrada automáticamente por 15 minutos de inactividad para cumplir con regulaciones HIPAA.");
            } catch (err) {
                console.error("Failed to show inactivity toast:", err);
            }
            await signOut('inactivity');
        };

        // Events to listen for to detect user activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Register event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [session]);

    const verifyMfaCode = async (code: string, trustDevice?: boolean) => {
        const { data: mfaData, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) throw listError;

        const verifiedFactors = mfaData.all.filter(factor => factor.status === 'verified');
        if (verifiedFactors.length === 0) {
            throw new Error("No verified MFA factor found.");
        }

        const factorId = verifiedFactors[0].id;

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId
        });
        if (challengeError) throw challengeError;

        const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code
        });
        if (verifyError) throw verifyError;

        if (trustDevice) {
            const trustedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem('mfa_trusted_until', trustedUntil);
        }

        setMfaRequired(false);
        return verifyData;
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, mfaRequired, mfaEnrollmentRequired, setMfaEnrollmentRequired, login, signOut, logout, signup, refreshUser, verifyMfaCode }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
