import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AlertTriangle, X } from 'lucide-react';

export function MainLayout() {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!user?.id) return;

        const checkStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('provider_integrations')
                    .select('mfa_status, session_cookies')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!error && data) {
                    const hasCookies = data.session_cookies && Array.isArray(data.session_cookies) && data.session_cookies.length > 0;
                    setIsSessionExpired(data.mfa_status === 'expired' && hasCookies);
                    if (data.mfa_status !== 'expired') {
                        setDismissed(false); // Restablecer estado si ya se conectó
                    }
                }
            } catch (err) {
                console.error("Error checking Amexzone status:", err);
            }
        };

        checkStatus();

        // Suscribirse a cambios en tiempo real en la tabla de integraciones
        const subscription = supabase
            .channel('main-layout-provider-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'provider_integrations',
                filter: `user_id=eq.${user.id}`
            }, (payload: any) => {
                if (payload.new) {
                    const hasCookies = payload.new.session_cookies && Array.isArray(payload.new.session_cookies) && payload.new.session_cookies.length > 0;
                    const expired = payload.new.mfa_status === 'expired' && hasCookies;
                    setIsSessionExpired(expired);
                    if (!expired) {
                        setDismissed(false); // Restablecer si se conecta exitosamente
                    }
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id]);

    return (
        <div className="flex flex-col min-h-screen bg-background font-sans text-foreground">
            <Header />
            
            {isSessionExpired && !dismissed && (
                <div className="w-full bg-rose-500/10 border-b border-rose-500/20 text-rose-700 dark:text-rose-400 py-3 px-4 sm:px-6 md:px-8 animate-in slide-in-from-top duration-300">
                    <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={18} className="text-rose-500 animate-pulse shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                                {language === 'es' 
                                    ? 'Tu sesión de Amexzone ha expirado. Abre la extensión de Chrome "Clio Sync" y haz clic en "Sincronizar Sesión Activa" para reactivarla.'
                                    : 'Your Amexzone session has expired. Open the "Clio Sync" Chrome Extension and click "Sync Active Session" to re-authenticate.'
                                }
                            </span>
                        </div>
                        <button 
                            onClick={() => setDismissed(true)}
                            className="p-1 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0"
                            title={language === 'es' ? "Cerrar" : "Dismiss"}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 pb-24 md:pb-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}
