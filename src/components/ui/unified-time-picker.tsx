import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UnifiedTimePickerProps {
    timeIn: string;
    timeOut: string;
    durationMin: string;
    units: string;
    onTimeInChange: (time: string) => void;
    onTimeOutChange: (time: string) => void;
    onDurationChange: (duration: string) => void;
    onClose?: () => void;
    language?: string;
    initialTab?: 'start' | 'end';
}

function parseTimeToParts(timeStr?: string) {
    let hours = 10;
    let minutes = 0;
    let period = 'AM';

    if (timeStr && timeStr.trim()) {
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)?$/i);
        if (match) {
            let h = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            if (match[3]) {
                period = match[3].toUpperCase();
            } else if (h >= 12) {
                period = 'PM';
            } else {
                period = 'AM';
            }
            if (h > 12) h -= 12;
            if (h === 0) h = 12;
            hours = h;
        }
    }
    return { hours, minutes, period };
}

function formatPartsToTime(h: number, m: number, p: string) {
    let finalH = h;
    if (isNaN(finalH) || finalH < 1) finalH = 12;
    if (finalH > 12) finalH = 12;
    let finalM = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')} ${p}`;
}

function parseToMinutes(timeStr?: string): number | null {
    if (!timeStr) return null;
    const { hours, minutes, period } = parseTimeToParts(timeStr);
    let h = hours;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + minutes;
}

function formatMinutesToTime(totalMins: number): string {
    let normalized = totalMins % (24 * 60);
    if (normalized < 0) normalized += 24 * 60;
    let h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const p = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
}

export function UnifiedTimePicker({
    timeIn,
    timeOut,
    durationMin,
    units,
    onTimeInChange,
    onTimeOutChange,
    onDurationChange,
    onClose,
    language = 'es',
    initialTab = 'start'
}: UnifiedTimePickerProps) {
    const [activeTab, setActiveTab] = useState<'start' | 'end'>(initialTab);

    // Active editing time parts
    const currentTargetTime = activeTab === 'start' ? timeIn : timeOut;
    const parts = parseTimeToParts(currentTargetTime || (activeTab === 'start' ? '10:00 AM' : '10:45 AM'));

    const [hStr, setHStr] = useState(String(parts.hours).padStart(2, '0'));
    const [mStr, setMStr] = useState(String(parts.minutes).padStart(2, '0'));
    const [period, setPeriod] = useState(parts.period);

    const hourRef = useRef<HTMLInputElement>(null);
    const minRef = useRef<HTMLInputElement>(null);

    // Sync when tab or outer value changes
    useEffect(() => {
        const p = parseTimeToParts(activeTab === 'start' ? timeIn : timeOut);
        setHStr(String(p.hours).padStart(2, '0'));
        setMStr(String(p.minutes).padStart(2, '0'));
        setPeriod(p.period);
    }, [activeTab, timeIn, timeOut]);

    // Commit changes in real-time
    const commitTime = (newH: number, newM: number, newP: string) => {
        const formatted = formatPartsToTime(newH, newM, newP);
        if (activeTab === 'start') {
            onTimeInChange(formatted);
        } else {
            onTimeOutChange(formatted);
        }
    };

    const handleHourChange = (val: string) => {
        const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
        setHStr(clean);
        if (clean.length > 0) {
            const num = parseInt(clean, 10);
            if (!isNaN(num) && num >= 1 && num <= 12) {
                commitTime(num, parseInt(mStr, 10) || 0, period);
                if (clean.length === 2 || num > 1) {
                    minRef.current?.focus();
                }
            }
        }
    };

    const handleMinuteChange = (val: string) => {
        const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
        setMStr(clean);
        if (clean.length > 0) {
            const num = parseInt(clean, 10);
            if (!isNaN(num) && num >= 0 && num <= 59) {
                commitTime(parseInt(hStr, 10) || 12, num, period);
            }
        }
    };

    const stepHour = (delta: number) => {
        let cur = parseInt(hStr, 10) || 12;
        let next = cur + delta;
        if (next > 12) next = 1;
        if (next < 1) next = 12;
        setHStr(String(next).padStart(2, '0'));
        commitTime(next, parseInt(mStr, 10) || 0, period);
    };

    const stepMinute = (delta: number) => {
        let cur = parseInt(mStr, 10) || 0;
        let next = cur + delta;
        if (next > 59) next = 0;
        if (next < 0) next = 59;
        setMStr(String(next).padStart(2, '0'));
        commitTime(parseInt(hStr, 10) || 12, next, period);
    };

    const togglePeriod = (newP: string) => {
        setPeriod(newP);
        commitTime(parseInt(hStr, 10) || 12, parseInt(mStr, 10) || 0, newP);
    };

    // Quick minute presets
    const setMinutePreset = (m: number) => {
        setMStr(String(m).padStart(2, '0'));
        commitTime(parseInt(hStr, 10) || 12, m, period);
    };

    // "Now" button
    const setNow = () => {
        const now = new Date();
        let h = now.getHours();
        const m = now.getMinutes();
        const p = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        setHStr(String(h).padStart(2, '0'));
        setMStr(String(m).padStart(2, '0'));
        setPeriod(p);
        commitTime(h, m, p);
    };

    // 1-Tap Clinical Duration Chips (TCM Standard)
    const CLINICAL_PRESETS = [
        { mins: 15, units: 1, label: '15m • 1u' },
        { mins: 30, units: 2, label: '30m • 2u' },
        { mins: 45, units: 3, label: '45m • 3u', popular: true },
        { mins: 60, units: 4, label: '60m • 4u' },
        { mins: 90, units: 6, label: '90m • 6u' },
        { mins: 120, units: 8, label: '120m • 8u' }
    ];

    const applyDuration = (mins: number) => {
        onDurationChange(String(mins));
        const startMins = parseToMinutes(timeIn);
        if (startMins !== null) {
            const endMins = startMins + mins;
            const newTimeOut = formatMinutesToTime(endMins);
            onTimeOutChange(newTimeOut);
        }
    };

    const currentDurationInt = parseInt(durationMin, 10);

    return (
        <div className="w-[320px] p-4 flex flex-col gap-3.5 select-none text-slate-800 dark:text-slate-100 bg-white/95 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Top Summary Header Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Clock size={15} />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{timeIn || '--:--'}</span>
                            <span className="text-slate-400 font-normal">→</span>
                            <span>{timeOut || '--:--'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {language === 'es' ? 'Rango del encuentro' : 'Encounter Window'}
                        </span>
                    </div>
                </div>

                {/* Duration & Units Badge */}
                {durationMin && (
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex flex-col items-end">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 font-mono leading-none">
                            {durationMin} min
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-600/80 dark:text-emerald-400 font-mono mt-0.5">
                            {units || Math.floor(parseInt(durationMin, 10) / 15)} {language === 'es' ? 'unidades' : 'units'}
                        </span>
                    </div>
                )}
            </div>

            {/* Tab Switcher: Hora de Inicio vs Hora de Fin */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                <button
                    type="button"
                    onClick={() => setActiveTab('start')}
                    className={cn(
                        "py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                        activeTab === 'start'
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                >
                    <span>{language === 'es' ? '1. Inicio (In)' : '1. Start (In)'}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('end')}
                    className={cn(
                        "py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                        activeTab === 'end'
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                >
                    <span>{language === 'es' ? '2. Fin (Out)' : '2. End (Out)'}</span>
                </button>
            </div>

            {/* Time Digital Stepper and AM/PM Segmented Control */}
            <div className="flex items-center justify-between gap-3 px-2 py-1">
                
                {/* Hours Block */}
                <div className="flex items-center gap-1">
                    <input
                        ref={hourRef}
                        type="text"
                        inputMode="numeric"
                        value={hStr}
                        onChange={(e) => handleHourChange(e.target.value)}
                        onBlur={() => {
                            let n = parseInt(hStr, 10);
                            if (isNaN(n) || n < 1) n = 12;
                            if (n > 12) n = 12;
                            setHStr(String(n).padStart(2, '0'));
                        }}
                        className="w-14 h-12 text-center text-2xl font-bold font-mono rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 outline-none transition-all shadow-xs"
                    />
                    <div className="flex flex-col gap-0.5">
                        <button
                            type="button"
                            onClick={() => stepHour(1)}
                            className="size-5.5 rounded-md flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            <ChevronUp size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => stepHour(-1)}
                            className="size-5.5 rounded-md flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            <ChevronDown size={13} />
                        </button>
                    </div>
                </div>

                <span className="text-2xl font-bold text-slate-400 select-none pb-1">:</span>

                {/* Minutes Block */}
                <div className="flex items-center gap-1">
                    <input
                        ref={minRef}
                        type="text"
                        inputMode="numeric"
                        value={mStr}
                        onChange={(e) => handleMinuteChange(e.target.value)}
                        onBlur={() => {
                            let n = parseInt(mStr, 10);
                            if (isNaN(n) || n < 0 || n > 59) n = 0;
                            setMStr(String(n).padStart(2, '0'));
                        }}
                        className="w-14 h-12 text-center text-2xl font-bold font-mono rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 outline-none transition-all shadow-xs"
                    />
                    <div className="flex flex-col gap-0.5">
                        <button
                            type="button"
                            onClick={() => stepMinute(1)}
                            className="size-5.5 rounded-md flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            <ChevronUp size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => stepMinute(-1)}
                            className="size-5.5 rounded-md flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            <ChevronDown size={13} />
                        </button>
                    </div>
                </div>

                {/* Segmented AM / PM Control */}
                <div className="flex flex-col p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                    <button
                        type="button"
                        onClick={() => togglePeriod('AM')}
                        className={cn(
                            "px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer",
                            period === 'AM'
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs"
                                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => togglePeriod('PM')}
                        className={cn(
                            "px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer",
                            period === 'PM'
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs"
                                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        PM
                    </button>
                </div>
            </div>

            {/* Quick Minute Presets & Now */}
            <div className="grid grid-cols-5 gap-1.5">
                <button
                    type="button"
                    onClick={setNow}
                    className="h-7 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                    <Sparkles size={11} />
                    <span>{language === 'es' ? 'Ahora' : 'Now'}</span>
                </button>
                {[0, 15, 30, 45].map((m) => {
                    const isSelected = parseInt(mStr, 10) === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMinutePreset(m)}
                            className={cn(
                                "h-7 rounded-lg text-xs font-mono transition-all border flex items-center justify-center cursor-pointer",
                                isSelected
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white font-bold shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                            )}
                        >
                            :{String(m).padStart(2, '0')}
                        </button>
                    );
                })}
            </div>

            {/* 1-Tap Clinical Duration Chips (TCM Standard) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span>{language === 'es' ? 'Duración clínica (TCM)' : 'Clinical Duration (TCM)'}</span>
                    <span className="text-indigo-500 font-semibold">{language === 'es' ? '1 toque autocalcula' : '1-tap auto-calc'}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5">
                    {CLINICAL_PRESETS.map((preset) => {
                        const isActive = currentDurationInt === preset.mins;
                        return (
                            <button
                                key={preset.mins}
                                type="button"
                                onClick={() => applyDuration(preset.mins)}
                                className={cn(
                                    "h-8 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 border cursor-pointer active:scale-95",
                                    isActive
                                        ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 font-bold shadow-sm"
                                        : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80"
                                )}
                            >
                                {isActive && <Check size={12} strokeWidth={3} className="shrink-0" />}
                                <span>{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Close / Apply button */}
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-8 mt-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center"
                >
                    {language === 'es' ? 'Listo' : 'Done'}
                </button>
            )}

        </div>
    );
}
