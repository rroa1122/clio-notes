import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export function TimeSpinner({ onConfirm, initialTimeStr }: { onConfirm: (timeStr: string) => void, initialTimeStr?: string }) {
    // Basic parser for initial time if provided (e.g. "10:00 AM")
    let initH = 10;
    let initM = 0;
    let initP = 'AM';
    
    if (initialTimeStr) {
        const match = initialTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
            let parsedH = parseInt(match[1], 10);
            initM = parseInt(match[2], 10);
            initP = (match[3] || (parsedH >= 12 ? 'PM' : 'AM')).toUpperCase();
            
            if (!match[3] && parsedH > 12) {
                parsedH -= 12;
            }
            if (parsedH === 0) parsedH = 12;
            initH = parsedH;
        }
    }

    const [h, setH] = useState(initH);
    const [m, setM] = useState(initM);
    const [p, setP] = useState(initP);

    // Local inputs string state for typing
    const [hStr, setHStr] = useState(String(initH).padStart(2, '0'));
    const [mStr, setMStr] = useState(String(initM).padStart(2, '0'));

    const hourInputRef = useRef<HTMLInputElement>(null);
    const minInputRef = useRef<HTMLInputElement>(null);

    // Sync when initialTimeStr changes from external sources
    useEffect(() => {
        if (initialTimeStr) {
            const match = initialTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (match) {
                let parsedH = parseInt(match[1], 10);
                let parsedM = parseInt(match[2], 10);
                let parsedP = (match[3] || (parsedH >= 12 ? 'PM' : 'AM')).toUpperCase();
                
                if (!match[3] && parsedH > 12) {
                    parsedH -= 12;
                }
                if (parsedH === 0) parsedH = 12;
                
                setH(parsedH);
                setM(parsedM);
                setP(parsedP);
                setHStr(String(parsedH).padStart(2, '0'));
                setMStr(String(parsedM).padStart(2, '0'));
            }
        }
    }, [initialTimeStr]);

    // Keep inputs in sync with button/scroll values
    useEffect(() => {
        setHStr(String(h).padStart(2, '0'));
    }, [h]);

    useEffect(() => {
        setMStr(String(m).padStart(2, '0'));
    }, [m]);

    // Handlers
    const incrementHour = () => setH(prev => prev === 12 ? 1 : prev + 1);
    const decrementHour = () => setH(prev => prev === 1 ? 12 : prev - 1);
    
    const incrementMinute = () => setM(prev => prev === 59 ? 0 : prev + 1);
    const decrementMinute = () => setM(prev => prev === 0 ? 59 : prev - 1);

    // Direct input edits
    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(0, 2);
        setHStr(val);
        
        if (val.length === 2) {
            const num = parseInt(val, 10);
            if (num >= 1 && num <= 12) {
                setH(num);
                minInputRef.current?.focus();
                minInputRef.current?.select();
            }
        }
    };

    const handleHourBlur = () => {
        let num = parseInt(hStr, 10);
        if (isNaN(num) || num < 1 || num > 12) {
            setHStr(String(h).padStart(2, '0'));
        } else {
            setH(num);
        }
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(0, 2);
        setMStr(val);
        
        if (val.length === 2) {
            const num = parseInt(val, 10);
            if (num >= 0 && num <= 59) {
                setM(num);
            }
        }
    };

    const handleMinuteBlur = () => {
        let num = parseInt(mStr, 10);
        if (isNaN(num) || num < 0 || num > 59) {
            setMStr(String(m).padStart(2, '0'));
        } else {
            setM(num);
        }
    };

    // Keyboard Arrow Keys
    const handleHourKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            incrementHour();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            decrementHour();
        }
    };

    const handleMinuteKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            incrementMinute();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            decrementMinute();
        }
    };

    // Prevent body/page scroll on wheel and increment/decrement value using manual listeners with passive: false
    useEffect(() => {
        const handleHrWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                setH(prev => prev === 12 ? 1 : prev + 1);
            } else {
                setH(prev => prev === 1 ? 12 : prev - 1);
            }
        };

        const handleMnWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                setM(prev => prev === 59 ? 0 : prev + 1);
            } else {
                setM(prev => prev === 0 ? 59 : prev - 1);
            }
        };

        const hrInput = hourInputRef.current;
        const mnInput = minInputRef.current;

        if (hrInput) {
            hrInput.addEventListener('wheel', handleHrWheel, { passive: false });
        }
        if (mnInput) {
            mnInput.addEventListener('wheel', handleMnWheel, { passive: false });
        }

        return () => {
            if (hrInput) {
                hrInput.removeEventListener('wheel', handleHrWheel);
            }
            if (mnInput) {
                mnInput.removeEventListener('wheel', handleMnWheel);
            }
        };
    }, []);

    return (
        <div className="flex flex-col gap-5 w-full px-2 mt-2 relative select-none">
            <div className="flex items-center justify-center gap-4 py-2">
                {/* Hours Column */}
                <div className="flex flex-col items-center gap-1.5">
                    <button 
                        type="button" 
                        onClick={incrementHour} 
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                    >
                        <ChevronUp size={16} strokeWidth={1.5} />
                    </button>
                    <input 
                        ref={hourInputRef}
                        type="text"
                        value={hStr}
                        onChange={handleHourChange}
                        onBlur={handleHourBlur}
                        onKeyDown={handleHourKeyDown}
                        className="w-14 h-12 text-center text-xl font-normal p-0 bg-transparent border border-slate-200/80 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100 transition-all caret-primary"
                    />
                    <button 
                        type="button" 
                        onClick={decrementHour}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                    >
                        <ChevronDown size={16} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Separator Colon */}
                <div className="text-xl font-light text-slate-350 dark:text-slate-650 self-center">:</div>

                {/* Minutes Column */}
                <div className="flex flex-col items-center gap-1.5">
                    <button 
                        type="button" 
                        onClick={incrementMinute}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                    >
                        <ChevronUp size={16} strokeWidth={1.5} />
                    </button>
                    <input 
                        ref={minInputRef}
                        type="text"
                        value={mStr}
                        onChange={handleMinuteChange}
                        onBlur={handleMinuteBlur}
                        onKeyDown={handleMinuteKeyDown}
                        className="w-14 h-12 text-center text-xl font-normal p-0 bg-transparent border border-slate-200/80 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100 transition-all caret-primary"
                    />
                    <button 
                        type="button" 
                        onClick={decrementMinute}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                    >
                        <ChevronDown size={16} strokeWidth={1.5} />
                    </button>
                </div>

                {/* AM/PM Column */}
                <div className="flex flex-col gap-1 justify-center pl-4 border-l border-slate-100 dark:border-slate-800/80 h-14 self-center">
                    <button 
                        type="button"
                        onClick={() => setP('AM')}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all select-none border-0 focus:outline-none",
                            p === 'AM' 
                                ? "bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 shadow-sm" 
                                : "text-slate-450 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350"
                        )}
                    >
                        AM
                    </button>
                    <button 
                        type="button"
                        onClick={() => setP('PM')}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all select-none border-0 focus:outline-none",
                            p === 'PM' 
                                ? "bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 shadow-sm" 
                                : "text-slate-450 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350"
                        )}
                    >
                        PM
                    </button>
                </div>
            </div>

            <Button 
                onClick={() => onConfirm(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`)}
                className="w-full bg-primary hover:bg-primary/95 text-white rounded-full h-11 font-semibold mx-auto shadow-[0_8px_20px_rgba(var(--primary-rgb),0.2)] transition-all text-[12px] tracking-widest uppercase mt-1"
            >
                Confirm Time
            </Button>
        </div>
    );
}
