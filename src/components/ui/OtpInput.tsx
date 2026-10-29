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
        <div className="grid grid-cols-6 gap-2.5 w-full">
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
                        className={`w-full aspect-square text-center text-lg sm:text-xl font-black rounded-[12px] border transition-all outline-none ${
                            disabled
                                ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-400 border-slate-200 dark:border-slate-800'
                                : hasError
                                    ? 'bg-red-500/5 border-red-500/60 text-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                    : isFilled
                                        ? 'bg-[#6366f1]/10 dark:bg-[#6366f1]/15 border-[#6366f1] text-[#6366f1] dark:text-indigo-300 shadow-sm shadow-[#6366f1]/10'
                                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20'
                        }`}
                    />
                );
            })}
        </div>
    );
};
