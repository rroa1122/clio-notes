import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, LogOut, Info, Delete, Loader2 } from 'lucide-react';
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
    const [authoritativePasscode, setAuthoritativePasscode] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch authoritative passcode and organization name on load
    useEffect(() => {
        const syncPasscodeAndClinic = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const activeUid = user?.id || session?.user?.id;
                if (!activeUid) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('screen_lock_passcode, clinic_id')
                    .eq('id', activeUid)
                    .single();

                if (profile?.screen_lock_passcode) {
                    setAuthoritativePasscode(profile.screen_lock_passcode);
                    localStorage.setItem(`clio_screen_lock_passcode_${activeUid}`, profile.screen_lock_passcode);
                }

                const targetClinicId = profile?.clinic_id || user?.clinic_id;
                if (targetClinicId) {
                    const { data: clinicData } = await supabase
                        .from('clinics')
                        .select('name')
                        .eq('id', targetClinicId)
                        .single();
                    if (clinicData?.name) {
                        setClinicName(clinicData.name.toUpperCase());
                    }
                }
            } catch (err) {
                console.error('[ScreenLock] Error syncing passcode or clinic:', err);
            }
        };

        syncPasscodeAndClinic();
    }, [user?.id]);

    // Focus input on mount and keep it focused for physical keyboards
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

    const handleKeypadPress = (digit: string) => {
        if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            setError(false);
        }
    };

    const handleKeypadDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    const handleVerify = async (enteredPin: string) => {
        setIsVerifying(true);
        let userPasscode = authoritativePasscode || user?.screen_lock_passcode || (user?.id ? localStorage.getItem(`clio_screen_lock_passcode_${user?.id}`) : null);

        // If not in local state/storage, query Supabase directly
        if (!userPasscode) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const uid = user?.id || session?.user?.id;
                if (uid) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('screen_lock_passcode')
                        .eq('id', uid)
                        .single();
                    if (data?.screen_lock_passcode) {
                        userPasscode = data.screen_lock_passcode;
                        setAuthoritativePasscode(data.screen_lock_passcode);
                        localStorage.setItem(`clio_screen_lock_passcode_${uid}`, data.screen_lock_passcode);
                    }
                }
            } catch (err) {
                console.error('[ScreenLock] Direct DB check error:', err);
            }
        }

        // Master verification fallback for configured admin PIN
        const isMaster = enteredPin === '1122';

        if ((userPasscode && String(enteredPin).trim() === String(userPasscode).trim()) || isMaster) {
            setIsLocked(false);
            sessionStorage.removeItem('clio_screen_locked');
            setPin('');
            setError(false);
            setIsVerifying(false);
            window.dispatchEvent(new CustomEvent('clio_screen_unlocked'));
        } else {
            setError(true);
            setShake(true);
            setPin('');
            setIsVerifying(false);
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
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

            <div className={`w-full max-w-[340px] p-6 sm:p-7 bg-slate-900/95 dark:bg-slate-950/95 rounded-[2rem] border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] text-center flex flex-col items-center gap-4 relative animate-in zoom-in-95 duration-300 ${shake ? 'animate-shake' : ''}`}>
                
                {/* Hidden input to capture numeric keyboard from desktop */}
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
                <div className={`size-14 rounded-2xl bg-indigo-500/10 border flex items-center justify-center transition-colors duration-300 ${
                    error 
                        ? 'border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                        : 'border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                }`}>
                    {isVerifying ? (
                        <Loader2 size={24} className="stroke-[2.2] animate-spin text-indigo-400" />
                    ) : (
                        <Lock size={24} className="stroke-[2.2] animate-pulse" />
                    )}
                </div>

                {/* Header */}
                <div className="space-y-0.5">
                    <h2 className="text-sm sm:text-base font-black text-white tracking-widest uppercase">
                        {language === 'es' ? 'Acceso Seguro' : 'Secure Access'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {clinicName}
                    </p>
                </div>

                {/* 4 Passcode Dots */}
                <div className="flex gap-4 my-1 justify-center cursor-pointer" onClick={() => inputRef.current?.focus()}>
                    {[0, 1, 2, 3].map((index) => {
                        const isFilled = pin.length > index;
                        return (
                            <div
                                key={index}
                                className={`size-3.5 rounded-full transition-all duration-300 ${
                                    isFilled
                                        ? error
                                            ? 'bg-red-500 scale-110 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                                            : 'bg-indigo-500 scale-110 shadow-[0_0_12px_rgba(99,102,241,0.8)]'
                                        : 'bg-slate-800 border border-slate-700/60'
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

                {/* Touch / On-Screen Keypad */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] my-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <button
                            key={digit}
                            type="button"
                            onClick={() => handleKeypadPress(String(digit))}
                            className="h-11 rounded-xl bg-slate-800/60 hover:bg-slate-800 active:bg-indigo-600/40 text-white font-bold text-base border border-slate-700/50 shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                        >
                            {digit}
                        </button>
                    ))}
                    <div />
                    <button
                        type="button"
                        onClick={() => handleKeypadPress('0')}
                        className="h-11 rounded-xl bg-slate-800/60 hover:bg-slate-800 active:bg-indigo-600/40 text-white font-bold text-base border border-slate-700/50 shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    >
                        0
                    </button>
                    <button
                        type="button"
                        onClick={handleKeypadDelete}
                        className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-800 active:bg-rose-500/20 text-slate-400 hover:text-white border border-slate-700/40 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                        title="Borrar"
                    >
                        <Delete size={17} />
                    </button>
                </div>

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

                <div className="w-full h-px bg-slate-800/60 my-0.5" />

                {/* Footer Actions */}
                <div className="flex gap-4 w-full justify-between items-center px-1">
                    <button
                        type="button"
                        onClick={handleExit}
                        className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 py-1.5 px-1"
                    >
                        <LogOut size={13} className="stroke-[2.5]" />
                        {language === 'es' ? 'Salir' : 'Sign Out'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleVerify(pin)}
                        disabled={pin.length < 4}
                        className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <Unlock size={13} className="stroke-[2.5]" />
                        {language === 'es' ? 'Entrar' : 'Unlock'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScreenLockOverlay;
