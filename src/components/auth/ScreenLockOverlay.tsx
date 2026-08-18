import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, LogOut, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabaseClient';

export const ScreenLockOverlay: React.FC = () => {
    const { user, signOut, setIsLocked } = useAuth();
    const { language } = useLanguage();
    const [pin, setPin] = useState('');
    const [clinicName, setClinicName] = useState('CLIO NOTES');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [showForgotTip, setShowForgotTip] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch organization name on load
    useEffect(() => {
        if (!user?.clinic_id) return;
        supabase
            .from('clinics')
            .select('name')
            .eq('id', user.clinic_id)
            .single()
            .then(({ data }) => {
                if (data?.name) {
                    setClinicName(data.name.toUpperCase());
                }
            });
    }, [user]);

    // Focus input on mount and keep it focused
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
        const forceFocus = () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        };
        window.addEventListener('click', forceFocus);
        return () => window.removeEventListener('click', forceFocus);
    }, []);

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length <= 4) {
            setPin(val);
            setError(false);
        }
    };

    const handleVerify = async (enteredPin: string) => {
        const userPasscode = user?.screen_lock_passcode || localStorage.getItem(`clio_screen_lock_passcode_${user?.id}`);
        
        if (userPasscode && String(enteredPin).trim() === String(userPasscode).trim()) {
            setIsLocked(false);
            sessionStorage.removeItem('clio_screen_locked');
            setPin('');
            setError(false);
            window.dispatchEvent(new CustomEvent('clio_screen_unlocked'));
        } else {
            setError(true);
            setShake(true);
            setPin('');
            setTimeout(() => setShake(false), 500);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    // Auto-verify on 4th digit
    useEffect(() => {
        if (pin.length === 4) {
            handleVerify(pin);
        }
    }, [pin]);

    const handleExit = async () => {
        sessionStorage.removeItem('clio_screen_locked');
        await signOut('voluntary');
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>

            <div className={`w-full max-w-[360px] p-8 mx-4 bg-slate-900/90 dark:bg-slate-950/90 rounded-[2rem] border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] text-center flex flex-col items-center gap-6 relative animate-in zoom-in-95 duration-300 ${shake ? 'animate-shake' : ''}`}>
                
                {/* Hidden input to capture numeric keyboard */}
                <input
                    ref={inputRef}
                    id="screen_lock_pin_code"
                    name="screen_lock_pin_code"
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={handlePinChange}
                    autoComplete="one-time-code"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    autoFocus
                />

                {/* Glowing Lock Icon */}
                <div className={`size-16 rounded-2xl bg-indigo-500/10 border flex items-center justify-center transition-colors duration-300 ${
                    error 
                        ? 'border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                        : 'border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                }`}>
                    <Lock size={28} className="stroke-[2.2] animate-pulse" />
                </div>

                {/* Header */}
                <div className="space-y-1">
                    <h2 className="text-base font-black text-white tracking-widest uppercase">
                        {language === 'es' ? 'Acceso Seguro' : 'Secure Access'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {clinicName}
                    </p>
                </div>

                {/* 4 Passcode Dots */}
                <div className="flex gap-5 my-2 justify-center cursor-pointer" onClick={() => inputRef.current?.focus()}>
                    {[0, 1, 2, 3].map((index) => {
                        const isFilled = pin.length > index;
                        return (
                            <div
                                key={index}
                                className={`size-4 rounded-full transition-all duration-300 ${
                                    isFilled
                                        ? error
                                            ? 'bg-red-500 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                                            : 'bg-indigo-500 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.8)]'
                                        : 'bg-slate-800 border border-slate-700/50'
                                }`}
                            />
                        );
                    })}
                </div>

                {error && (
                    <p className="text-[11px] font-bold text-red-400 animate-pulse leading-none">
                        {language === 'es' ? 'Código de acceso incorrecto' : 'Incorrect passcode'}
                    </p>
                )}

                {/* Forgot passcode link */}
                <div className="relative w-full flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowForgotTip(!showForgotTip)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-wider"
                    >
                        {language === 'es' ? '¿Olvidaste tu Código?' : 'Forgot Passcode?'}
                    </button>

                    {showForgotTip && (
                        <div className="absolute z-10 bottom-6 left-1/2 -translate-x-1/2 w-60 p-3.5 bg-slate-950 text-slate-300 border border-slate-800 text-[11px] rounded-2xl shadow-xl flex items-start gap-2 text-left font-medium leading-relaxed animate-in fade-in duration-200">
                            <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                            <p>
                                {language === 'es' 
                                    ? 'Haz clic en SALIR para cerrar tu sesión, luego entra con tu correo/contraseña y crea un nuevo código en ajustes.'
                                    : 'Click SIGN OUT to logout, then log in using your standard credentials and set a new passcode in settings.'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-slate-800/60 my-1" />

                {/* Footer Actions */}
                <div className="flex gap-4 w-full justify-between items-center px-2">
                    <button
                        type="button"
                        onClick={handleExit}
                        className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 py-2 px-1"
                    >
                        <LogOut size={13} className="stroke-[2.5]" />
                        {language === 'es' ? 'Salir' : 'Sign Out'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleVerify(pin)}
                        disabled={pin.length < 4}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <Unlock size={13} className="stroke-[2.5]" />
                        {language === 'es' ? 'Entrar' : 'Unlock'}
                    </button>
                </div>
            </div>
        </div>
    );
};
