import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    hasError?: boolean;
    autoFocus?: boolean;
    onComplete?: (code: string) => void;
}

export const OtpInput: React.FC<OtpInputProps> = ({
    length = 6,
    value,
    onChange,
    disabled = false,
    hasError = false,
    autoFocus = true,
    onComplete
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const digits = Array.from({ length }, (_, i) => value[i] || '');

    useEffect(() => {
        if (autoFocus && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [autoFocus]);

    const handleDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value;
        const digit = rawVal.replace(/\D/g, '').slice(-1);

        const newDigits = [...digits];
        newDigits[index] = digit;
        const newCode = newDigits.join('');

        onChange(newCode);

        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (newCode.length === length && onComplete) {
            onComplete(newCode);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!digits[index] && index > 0) {
                const newDigits = [...digits];
                newDigits[index - 1] = '';
                onChange(newDigits.join(''));
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (!pastedData) return;

        onChange(pastedData);

        const targetIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[targetIndex]?.focus();

        if (pastedData.length === length && onComplete) {
            onComplete(pastedData);
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3">
            {Array.from({ length }).map((_, index) => {
                const isFilled = Boolean(digits[index]);
                return (
                    <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digits[index]}
                        disabled={disabled}
                        onChange={(e) => handleDigitChange(index, e)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`size-12 sm:size-14 text-center text-xl sm:text-2xl font-black rounded-2xl border transition-all shadow-sm outline-none ${
                            disabled ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-400 border-slate-200 dark:border-slate-800' :
                            hasError
                                ? 'bg-rose-50/50 border-rose-400 text-rose-600 focus:ring-4 focus:ring-rose-500/15 focus:border-rose-500'
                                : isFilled
                                    ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/5'
                                    : 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                        }`}
                    />
                );
            })}
        </div>
    );
};
