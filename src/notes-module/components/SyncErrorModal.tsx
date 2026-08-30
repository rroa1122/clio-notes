import React, { useState } from 'react';
import { 
    AlertTriangle, 
    ShieldAlert, 
    CreditCard, 
    RefreshCw, 
    X, 
    HelpCircle, 
    Clock, 
    ArrowRight, 
    Sparkles, 
    ChevronDown, 
    ChevronUp,
    User,
    Calendar
} from 'lucide-react';
import { formatSyncError } from '../../lib/services/syncErrorFormatter';
import { cn } from '../../lib/utils';

interface SyncErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    errorMessage?: string | null;
    onRetry?: () => void;
    onApplySuggestedTimeAndRetry?: (suggestedTime: string) => void;
    isRetrying?: boolean;
    patientName?: string;
    visitDate?: string;
}

export const SyncErrorModal: React.FC<SyncErrorModalProps> = ({
    isOpen,
    onClose,
    errorMessage,
    onRetry,
    onApplySuggestedTimeAndRetry,
    isRetrying = false,
    patientName,
    visitDate,
}) => {
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

    if (!isOpen) return null;

    const formatted = formatSyncError(errorMessage);

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'billing':
                return {
                    icon: CreditCard,
                    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    accentGlow: 'shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]'
                };
            case 'auth':
                return {
                    icon: ShieldAlert,
                    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                    accentGlow: 'shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]'
                };
            case 'validation':
                return {
                    icon: AlertTriangle,
                    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                    accentGlow: 'shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]'
                };
            default:
                return {
                    icon: AlertTriangle,
                    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                    accentGlow: 'shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]'
                };
        }
    };

    const config = getCategoryStyles(formatted.category);
    const CategoryIcon = config.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className={cn(
                    "relative w-full max-w-lg overflow-hidden bg-slate-900/95 border border-slate-700/80 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all text-slate-100 flex flex-col",
                    config.accentGlow
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-850/40">
                    <div className="flex items-center gap-3.5">
                        <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 shadow-inner">
                            <CategoryIcon size={20} />
                        </div>
                        <div className="space-y-1">
                            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border", config.badge)}>
                                {formatted.categoryLabel}
                            </span>
                            <h3 className="text-[16px] font-bold text-white tracking-tight">
                                {formatted.title}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Patient / Date Micro-Bar */}
                {(patientName || visitDate) && (
                    <div className="px-6 py-2.5 bg-slate-800/50 border-b border-slate-750/70 flex items-center gap-4 text-[11px] font-medium text-slate-300">
                        {patientName && (
                            <span className="flex items-center gap-1.5 truncate">
                                <User size={12} className="text-slate-400" />
                                <strong className="text-slate-100 font-semibold">{patientName}</strong>
                            </span>
                        )}
                        {visitDate && (
                            <span className="flex items-center gap-1.5 shrink-0">
                                <Calendar size={12} className="text-slate-400" />
                                <strong className="text-slate-100 font-semibold">{visitDate}</strong>
                            </span>
                        )}
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 space-y-3.5 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {/* Error description message */}
                    <div className="text-xs text-slate-200 leading-relaxed bg-slate-800/70 p-4 rounded-2xl border border-slate-700/60 shadow-sm">
                        {formatted.description}
                    </div>

                    {/* Action Suggestion Card */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-100 shadow-sm">
                        <div className="size-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles size={14} />
                        </div>
                        <div className="text-xs space-y-1">
                            <span className="font-bold text-white tracking-tight block">¿Qué debo hacer?</span>
                            <p className="text-indigo-200 leading-relaxed font-medium">
                                {formatted.actionHint}
                            </p>
                        </div>
                    </div>

                    {/* Technical details collapsible */}
                    {formatted.rawError && (
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>{showTechnicalDetails ? 'Ocultar reporte técnico' : 'Ver reporte técnico de Amexzone'}</span>
                                {showTechnicalDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            {showTechnicalDetails && (
                                <pre className="mt-2 p-3 text-[10px] font-mono text-slate-300 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto max-h-36 whitespace-pre-wrap custom-scrollbar">
                                    {formatted.rawError}
                                </pre>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-850/60 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                        Cerrar
                    </button>

                    <div className="flex items-center gap-2.5">
                        {/* Always available Retry Button */}
                        {onRetry && (
                            <button
                                type="button"
                                disabled={isRetrying}
                                onClick={() => {
                                    onRetry();
                                    onClose();
                                }}
                                className="h-10 px-4 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                title="Reintentar con la hora actual"
                            >
                                <RefreshCw size={13} className={isRetrying ? "animate-spin text-slate-400" : "text-slate-400"} />
                                <span>{isRetrying ? "Reintentando..." : "Reintentar"}</span>
                            </button>
                        )}

                        {/* Apply Suggested Time and Retry */}
                        {formatted.suggestedTime && onApplySuggestedTimeAndRetry && (
                            <button
                                type="button"
                                disabled={isRetrying}
                                onClick={() => {
                                    onApplySuggestedTimeAndRetry(formatted.suggestedTime!);
                                    onClose();
                                }}
                                className="group h-10 px-5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.35)] border border-indigo-400/30 disabled:opacity-50"
                            >
                                {isRetrying ? (
                                    <RefreshCw size={13} className="animate-spin text-indigo-200" />
                                ) : (
                                    <Clock size={13} className="text-indigo-200 group-hover:scale-110 transition-transform" />
                                )}
                                <span>Aplicar {formatted.suggestedTime} y Sincronizar</span>
                                <ArrowRight size={13} className="text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

