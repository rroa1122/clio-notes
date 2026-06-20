import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { X, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'info' | 'success' | 'warning';
    onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-full duration-300",
            type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
                type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-900" :
                    "bg-white border-slate-200 text-slate-900"
        )}>
            {type === 'success' && <CheckCircle2 className="text-emerald-500" size={18} />}
            {type === 'warning' && <AlertCircle className="text-amber-500" size={18} />}
            {type === 'info' && <Info className="text-blue-500" size={18} />}

            <p className="text-sm font-medium pr-2">{message}</p>

            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X size={14} />
            </button>
        </div>
    );
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<{ id: string, message: string, type?: any }[]>([]);

    useEffect(() => {
        (window as any).showGlobalNotification = (message: string, type: any = 'info') => {
            const id = Math.random().toString(36).substr(2, 9);
            setToasts(prev => [...prev, { id, message, type }]);
        };

        return () => {
            delete (window as any).showGlobalNotification;
        };
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <>
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </>
    );
}
