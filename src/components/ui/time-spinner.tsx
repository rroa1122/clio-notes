import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Check, Clock, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export interface TimeSpinnerProps {
    onConfirm: (timeStr: string) => void;
    initialTimeStr?: string;
    label?: string;
}

export function TimeSpinner({ onConfirm, initialTimeStr, label }: TimeSpinnerProps) {
    const { language } = useLanguage();
    const parseInitial = (str?: string) => {
        let initH = 10;
        let initM = 0;
        let initP = 'AM';
        
        if (str) {
            const match = str.trim().match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)?$/i);
            if (match) {
                let parsedH = parseInt(match[1], 10);
                initM = parseInt(match[2], 10);
                if (match[3]) {
                    initP = match[3].toUpperCase();
                } else if (parsedH >= 12) {
                    initP = 'PM';
                } else {
                    initP = 'AM';
                }
                
                if (parsedH > 12) {
                    parsedH -= 12;
                }
                if (parsedH === 0) parsedH = 12;
                initH = parsedH;
            }
        }
        return { initH, initM, initP };
    };

    const initial = parseInitial(initialTimeStr);
    const [p, setP] = useState(initial.initP);
    const [hStr, setHStr] = useState(String(initial.initH).padStart(2, '0'));
    const [mStr, setMStr] = useState(String(initial.initM).padStart(2, '0'));

    const hourInputRef = useRef<HTMLInputElement>(null);
    const minInputRef = useRef<HTMLInputElement>(null);

    // Sync from external initialTimeStr changes
    useEffect(() => {
        if (initialTimeStr) {
            const parsed = parseInitial(initialTimeStr);
            setP(parsed.initP);
            setHStr(String(parsed.initH).padStart(2, '0'));
            setMStr(String(parsed.initM).padStart(2, '0'));
        }
    }, [initialTimeStr]);

    // Spinner buttons handlers
    const incrementHour = () => {
        let cur = parseInt(hStr, 10);
        if (isNaN(cur)) cur = 10;
        const next = cur === 12 ? 1 : cur + 1;
        setHStr(String(next).padStart(2, '0'));
    };

    const decrementHour = () => {
        let cur = parseInt(hStr, 10);
        if (isNaN(cur)) cur = 10;
        const next = cur === 1 ? 12 : cur - 1;
        setHStr(String(next).padStart(2, '0'));
    };
    
    const incrementMinute = () => {
        let cur = parseInt(mStr, 10);
        if (isNaN(cur)) cur = 0;
        const next = cur === 59 ? 0 : cur + 1;
        setMStr(String(next).padStart(2, '0'));
    };

    const decrementMinute = () => {
        let cur = parseInt(mStr, 10);
        if (isNaN(cur)) cur = 0;
        const next = cur === 0 ? 59 : cur - 1;
        setMStr(String(next).padStart(2, '0'));
    };

    // Direct input editing
    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(0, 2);
        setHStr(val);
        
        if (val.length > 0) {
            const num = parseInt(val, 10);
            if (!isNaN(num)) {
                if (num >= 13 && num <= 23) {
                    setP('PM');
                }
                if (val.length === 2 || num > 1) {
                    setTimeout(() => {
                        minInputRef.current?.focus();
                    }, 10);
                }
            }
        }
    };

    const handleHourBlur = () => {
        let num = parseInt(hStr, 10);
        if (isNaN(num) || num < 1) {
            num = 12;
        } else if (num > 12) {
            if (num <= 23) {
                num = num - 12;
                setP('PM');
            } else {
                num = 12;
            }
        }
        setHStr(String(num).padStart(2, '0'));
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(0, 2);
        setMStr(val);
    };

    const handleMinuteBlur = () => {
        let num = parseInt(mStr, 10);
        if (isNaN(num) || num < 0 || num > 59) {
            num = 0;
        }
        setMStr(String(num).padStart(2, '0'));
    };

    const handleConfirm = () => {
        let finalH = parseInt(hStr, 10);
        let finalM = parseInt(mStr, 10);
        let finalP = p;

        if (isNaN(finalH) || finalH < 1) finalH = 12;
        if (finalH > 12) {
            if (finalH <= 23) {
                finalH = finalH - 12;
                finalP = 'PM';
            } else {
                finalH = 12;
            }
        }
        if (finalH === 0) finalH = 12;

        if (isNaN(finalM) || finalM < 0 || finalM > 59) finalM = 0;

        const formatted = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')} ${finalP}`;
        onConfirm(formatted);
    };

    const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            incrementHour();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            decrementHour();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            incrementMinute();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            decrementMinute();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    const setQuickTime = (minutes: number) => {
        setMStr(String(minutes).padStart(2, '0'));
    };

    const setCurrentTime = () => {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        setHStr(String(hours).padStart(2, '0'));
        setMStr(String(minutes).padStart(2, '0'));
        setP(period);
    };

    const activeDisplay = `${hStr}:${mStr} ${p}`;

    return (
        <div className="flex flex-col gap-2.5 w-full select-none text-card-foreground">
            {/* Header row mirroring the Calendar month/year header */}
            <div className="flex items-center justify-between pb-2 mb-0.5 border-b border-border/40">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Clock size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold tracking-tight text-foreground truncate">
                        {label || (language === 'es' ? 'Seleccionar hora' : 'Select Time')}
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md shrink-0">
                    {activeDisplay}
                </span>
            </div>

            {/* Main Digital Clock Inputs & Steppers */}
            <div className="flex items-center justify-center gap-2 py-1">
                
                {/* Hours Box with Stepper */}
                <div className="flex flex-col items-center">
                    <button 
                        type="button" 
                        onClick={incrementHour} 
                        className="h-4.5 w-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Aumentar hora"
                    >
                        <ChevronUp size={14} />
                    </button>
                    
                    <input 
                        ref={hourInputRef}
                        type="text"
                        inputMode="numeric"
                        value={hStr}
                        onChange={handleHourChange}
                        onBlur={handleHourBlur}
                        onKeyDown={handleHourKeyDown}
                        className="w-13 h-11 text-center text-xl font-mono font-bold text-foreground bg-secondary/50 border border-border/60 focus:border-indigo-500 focus:bg-background rounded-xl p-0 m-0 tracking-tight transition-all shadow-xs"
                        style={{ outline: 'none', WebkitAppearance: 'none' }}
                    />
                    
                    <button 
                        type="button" 
                        onClick={decrementHour} 
                        className="h-4.5 w-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Disminuir hora"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>

                {/* Center Colon */}
                <span className="text-xl font-bold text-muted-foreground select-none pb-0.5">:</span>

                {/* Minutes Box with Stepper */}
                <div className="flex flex-col items-center">
                    <button 
                        type="button" 
                        onClick={incrementMinute} 
                        className="h-4.5 w-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Aumentar minuto"
                    >
                        <ChevronUp size={14} />
                    </button>
                    
                    <input 
                        ref={minInputRef}
                        type="text"
                        inputMode="numeric"
                        value={mStr}
                        onChange={handleMinuteChange}
                        onBlur={handleMinuteBlur}
                        onKeyDown={handleMinuteKeyDown}
                        className="w-13 h-11 text-center text-xl font-mono font-bold text-foreground bg-secondary/50 border border-border/60 focus:border-indigo-500 focus:bg-background rounded-xl p-0 m-0 tracking-tight transition-all shadow-xs"
                        style={{ outline: 'none', WebkitAppearance: 'none' }}
                    />
                    
                    <button 
                        type="button" 
                        onClick={decrementMinute} 
                        className="h-4.5 w-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Disminuir minuto"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>

                {/* Segmented AM / PM Vertical Pill */}
                <div className="flex flex-col p-0.5 rounded-xl bg-secondary/60 border border-border/60 shrink-0">
                    <button 
                        type="button"
                        onClick={() => setP('AM')}
                        className={cn(
                            "px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer",
                            p === 'AM'
                                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        AM
                    </button>
                    <button 
                        type="button"
                        onClick={() => setP('PM')}
                        className={cn(
                            "px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer",
                            p === 'PM'
                                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        PM
                    </button>
                </div>
            </div>

            {/* Quick Presets Row (:00, :15, :30, :45) */}
            <div className="grid grid-cols-4 gap-1 w-full">
                {[0, 15, 30, 45].map((m) => {
                    const isSelected = parseInt(mStr, 10) === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setQuickTime(m)}
                            className={cn(
                                "h-6.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border flex items-center justify-center",
                                isSelected
                                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                                    : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            :{String(m).padStart(2, '0')}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Row mirroring the Calendar footer ("Hoy" y "Ayer") */}
            <div className="flex items-center justify-between pt-2 mt-0.5 border-t border-border/40 px-1 text-[11px]">
                <button
                    type="button"
                    onClick={setCurrentTime}
                    className="text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                    <Sparkles size={11} />
                    <span>{language === 'es' ? 'Ahora' : 'Now'}</span>
                </button>

                <button 
                    type="button"
                    onClick={handleConfirm}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                    <Check size={12} strokeWidth={3} />
                    <span>{language === 'es' ? 'Listo' : 'Done'}</span>
                </button>
            </div>
        </div>
    );
}
