
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
    login: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

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
                    // Critical: mapSupabaseUser must not crash, or loading will hang
                    await mapSupabaseUser(session.user).catch(e => {
                        console.error('[Auth] User mapping failed caught:', e);
                    });
                } else {
                    console.log('[Auth] No active session found.');
                    setUser(null);
                    setSession(null);
                }

                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[Auth] Auth state change: ${event}`);
            if (mounted) {
                if (event === 'SIGNED_OUT') {
                    clearCaches();
                    setUser(null);
                    setSession(null);
                    setLoading(false);
                } else if (session?.user) {
                    setSession(session);
                    mapSupabaseUser(session.user).finally(() => setLoading(false));
                } else {
                    setSession(null);
                    setUser(null);
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
                description: 'Inició sesión en el sistema',
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

    const signOut = async () => {
        // Registrar cierre de sesión antes de limpiar
        try {
            const { auditService } = await import('../services/auditService');
            await auditService.logAction({
                action: 'LOGOUT',
                description: 'Cerró sesión voluntariamente',
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
    };

    const logout = signOut;

    const refreshUser = async () => {
        if (session?.user) {
            console.log('[Auth] Refreshing user data...');
            await mapSupabaseUser(session.user);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, login, signOut, logout, signup, refreshUser }}>
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
