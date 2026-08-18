import React from 'react';
import { AlertTriangle, ShieldAlert, CreditCard, RefreshCw, X, HelpCircle, ExternalLink } from 'lucide-react';
import { formatSyncError } from '../../lib/services/syncErrorFormatter';

interface SyncErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    errorMessage?: string | null;
    onRetry?: () => void;
    isRetrying?: boolean;
    patientName?: string;
    visitDate?: string;
}

export const SyncErrorModal: React.FC<SyncErrorModalProps> = ({
    isOpen,
    onClose,
    errorMessage,
    onRetry,
    isRetrying = false,
    patientName,
    visitDate,
}) => {
    const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

    if (!isOpen) return null;

    const formatted = formatSyncError(errorMessage);

    const getCategoryConfig = (category: string) => {
        switch (category) {
            case 'billing':
                return {
                    icon: CreditCard,
                    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    headerGradient: 'from-amber-500/10 via-orange-500/5 to-transparent'
                };
            case 'auth':
                return {
                    icon: ShieldAlert,
                    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                    headerGradient: 'from-purple-500/10 via-indigo-500/5 to-transparent'
                };
            case 'validation':
                return {
                    icon: AlertTriangle,
                    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    headerGradient: 'from-rose-500/10 via-red-500/5 to-transparent'
                };
            default:
                return {
                    icon: AlertTriangle,
                    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                    headerGradient: 'from-slate-500/10 via-slate-500/5 to-transparent'
                };
        }
    };

    const config = getCategoryConfig(formatted.category);
    const CategoryIcon = config.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Accent Gradient Bar */}
                <div className={`p-6 pb-4 bg-gradient-to-b ${config.headerGradient} border-b border-slate-100 dark:border-slate-800/60`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm">
                                <CategoryIcon size={22} />
                            </div>
                            <div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border mb-1 ${config.badgeClass}`}>
                                    {formatted.categoryLabel}
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                    {formatted.title}
                                </h3>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {(patientName || visitDate) && (
                        <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {patientName && <span>👤 Paciente: <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong></span>}
                            {visitDate && <span>📅 Fecha: <strong className="text-slate-800 dark:text-slate-200">{visitDate}</strong></span>}
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4">
                    {/* Description */}
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                        {formatted.description}
                    </div>

                    {/* Action Suggestion Card */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200">
                        <HelpCircle size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <span className="font-bold tracking-tight block">¿Qué debo hacer?</span>
                            <p className="text-indigo-800/90 dark:text-indigo-300 leading-normal font-medium">
                                {formatted.actionHint}
                            </p>
                        </div>
                    </div>

                    {/* Technical details toggle */}
                    {formatted.rawError && (
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors inline-flex items-center gap-1"
                            >
                                {showTechnicalDetails ? 'Ocultar reporte técnico' : 'Ver reporte técnico de Amexzone'}
                            </button>

                            {showTechnicalDetails && (
                                <pre className="mt-2 p-3 text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-32 whitespace-pre-wrap">
                                    {formatted.rawError}
                                </pre>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    >
                        Entendido
                    </button>

                    <div className="flex items-center gap-2">
                        {onRetry && (
                            <button
                                type="button"
                                disabled={isRetrying}
                                onClick={() => {
                                    onRetry();
                                    onClose();
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isRetrying ? "animate-spin" : ""} />
                                <span>{isRetrying ? "Reintentando..." : "Reintentar Sincronización"}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
