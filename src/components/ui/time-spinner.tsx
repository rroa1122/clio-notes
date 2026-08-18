import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TimeSpinner({ onConfirm, initialTimeStr }: { onConfirm: (timeStr: string) => void, initialTimeStr?: string }) {
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

    // Toggle AM / PM
    const togglePeriod = () => {
        setP(prev => prev === 'AM' ? 'PM' : 'AM');
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

    return (
        <div className="flex flex-col gap-3 w-full max-w-[210px] mx-auto select-none text-slate-800 dark:text-slate-100">
            {/* Harmonious Time Controls Row */}
            <div className="flex items-center justify-between w-full">
                {/* Hours Block */}
                <div className="flex flex-col items-center">
                    <button 
                        type="button" 
                        onClick={incrementHour} 
                        className="h-4 w-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Increment hour"
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
                        className="text-center text-xl font-mono font-medium text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl p-0 m-0 tracking-tight transition-all"
                        style={{ outline: 'none', WebkitAppearance: 'none', width: '54px', height: '44px' }}
                    />
                    
                    <button 
                        type="button" 
                        onClick={decrementHour} 
                        className="h-4 w-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Decrement hour"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>

                {/* Center Colon */}
                <div className="text-xl font-light text-slate-400 dark:text-slate-500 select-none self-center pb-0.5 px-0.5">:</div>

                {/* Minutes Block */}
                <div className="flex flex-col items-center">
                    <button 
                        type="button" 
                        onClick={incrementMinute} 
                        className="h-4 w-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Increment minute"
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
                        className="text-center text-xl font-mono font-medium text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl p-0 m-0 tracking-tight transition-all"
                        style={{ outline: 'none', WebkitAppearance: 'none', width: '54px', height: '44px' }}
                    />
                    
                    <button 
                        type="button" 
                        onClick={decrementMinute} 
                        className="h-4 w-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Decrement minute"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>

                {/* Minimalist, Ultra-Clean AM/PM Card */}
                <div className="flex flex-col items-center">
                    <div className="h-4" /> {/* Alignment spacer */}
                    <button 
                        type="button"
                        onClick={togglePeriod}
                        title={`Click to switch to ${p === 'AM' ? 'PM' : 'AM'}`}
                        className="rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 shadow-xs border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-900 dark:text-slate-100"
                        style={{ width: '50px', height: '44px' }}
                    >
                        <span className="text-sm font-semibold font-mono tracking-wider">
                            {p}
                        </span>
                    </button>
                    <div className="h-4" /> {/* Alignment spacer */}
                </div>
            </div>

            {/* Symmetrical 5-Column Grid for Presets */}
            <div className="grid grid-cols-5 gap-1 w-full">
                <button
                    type="button"
                    onClick={setCurrentTime}
                    className="h-7 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center"
                >
                    Now
                </button>
                {[0, 15, 30, 45].map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setQuickTime(m)}
                        className={cn(
                            "h-7 rounded-lg text-[10px] font-mono transition-all cursor-pointer border flex items-center justify-center",
                            parseInt(mStr, 10) === m
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-medium"
                                : "bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-slate-200/60 dark:border-slate-700/60 font-normal"
                        )}
                    >
                        :{String(m).padStart(2, '0')}
                    </button>
                ))}
            </div>

            {/* Confirm Time Button - Matching proportions */}
            <button 
                type="button"
                onClick={handleConfirm}
                className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl h-9 font-medium text-xs shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 mt-0.5"
            >
                <Check size={14} className="opacity-90" />
                <span>Confirm</span>
            </button>
        </div>
    );
}
