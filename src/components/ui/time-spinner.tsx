import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

function ScrollColumn({ items, value, onChange, isAmPm = false }: { items: string[], value: string, onChange: (v: string) => void, isAmPm?: boolean }) {
    const listRef = useRef<HTMLDivElement>(null);
    
    // Sync to initial value once on mount
    useEffect(() => {
        if (listRef.current) {
            const targetIndex = items.indexOf(value);
            if (targetIndex !== -1) {
                listRef.current.scrollTop = targetIndex * 34;
            }
        }
    }, []); // Only once!

    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }
        
        scrollTimeout.current = setTimeout(() => {
            const index = Math.round(scrollTop / 34);
            if (index >= 0 && index < items.length) {
                const newValue = items[index];
                if (newValue !== value) {
                    onChange(newValue);
                }
            }
        }, 80); // Update state only after scroll rests
    };

    return (
        <div 
            ref={listRef} 
            onScroll={handleScroll}
            className="h-full overflow-y-auto snap-y snap-mandatory flex flex-col z-10 w-[42px] [&::-webkit-scrollbar]:hidden" 
            style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none'
            }}
        >
            <div className="flex-shrink-0 h-[50px]" />
            {items.map((item, idx) => {
                const isActive = item === value;
                return (
                    <div 
                        key={item}
                        data-val={item}
                        onClick={() => {
                            listRef.current?.scrollTo({ top: idx * 34, behavior: 'smooth' });
                            onChange(item);
                        }}
                        className={cn(
                            "flex-shrink-0 h-[34px] flex items-center justify-center snap-center cursor-pointer transition-all duration-300 select-none",
                            isAmPm ? (
                                isActive 
                                    ? "font-bold text-primary text-[14px] tracking-widest" 
                                    : "font-medium text-slate-300 text-[12px] tracking-widest hover:text-slate-400 scale-90"
                            ) : (
                                isActive 
                                    ? "font-medium text-slate-900 text-[22px] tracking-tight" 
                                    : "font-medium text-slate-300 text-[18px] tracking-tight hover:text-slate-400 scale-[0.85]"
                            )
                        )}
                    >
                        {item}
                    </div>
                )
            })}
            <div className="flex-shrink-0 h-[50px]" />
        </div>
    )
}

export function TimeSpinner({ onConfirm, initialTimeStr }: { onConfirm: (timeStr: string) => void, initialTimeStr?: string }) {
    const hours = Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));
    const periods = ['AM', 'PM'];

    // Basic parser for initial time if provided (e.g. "09:00 AM", or "09:00")
    let initH = '10';
    let initM = '00';
    let initP = 'AM';
    
    if (initialTimeStr) {
        const match = initialTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
            let parsedH = parseInt(match[1]);
            initM = match[2].padStart(2, '0');
            initP = (match[3] || (parsedH >= 12 ? 'PM' : 'AM')).toUpperCase();
            
            if (!match[3] && parsedH > 12) {
                parsedH -= 12;
            }
            if (parsedH === 0) parsedH = 12;
            initH = String(parsedH).padStart(2, '0');
        }
    }

    const [h, setH] = useState(initH);
    const [m, setM] = useState(initM);
    const [p, setP] = useState(initP);

    return (
        <div className="flex flex-col gap-6 w-full px-2 mt-2 relative">
            <div 
                className="flex justify-center h-[134px] relative w-full overflow-hidden"
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)'
                }}
            >
                {/* Thick elegant bezel capsule */}
                <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[160px] h-[38px] bg-slate-400/5 rounded-[12px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.03)] border border-slate-200/50 pointer-events-none z-0" />
                
                <div className="flex h-full z-10 gap-2">
                    <ScrollColumn items={hours} value={h} onChange={setH} />
                    <span className="flex items-center justify-center font-light text-slate-300 text-[20px] pb-1.5">:</span>
                    <ScrollColumn items={minutes} value={m} onChange={setM} />
                </div>
                <div className="w-3 h-full" />
                <ScrollColumn items={periods} value={p} onChange={setP} isAmPm />
            </div>
            
            <Button 
                onClick={() => onConfirm(`${h}:${m} ${p}`)}
                className="w-full bg-primary hover:bg-primary/95 text-white rounded-full h-11 font-semibold mx-auto shadow-[0_8px_20px_rgba(var(--primary-rgb),0.2)] transition-all text-[12px] tracking-widest uppercase mt-2"
            >
                Confirm Time
            </Button>
        </div>
    )
}
