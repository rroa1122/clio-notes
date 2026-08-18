import React from 'react';

export type StatusBadgeType = 'present' | 'denied' | 'not_mentioned' | 'absent' | 'unknown';

export interface StatusBadgeProps {
    status: StatusBadgeType;
    className?: string;
}

interface BadgeStyleConfig {
    label: string;
    classes: string;
    dotClasses: string;
}

const statusConfig: Record<StatusBadgeType, BadgeStyleConfig> = {
    present: {
        label: 'Present',
        classes: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-500/30',
        dotClasses: 'bg-rose-500 dark:bg-rose-400'
    },
    denied: {
        label: 'Denied',
        classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30',
        dotClasses: 'bg-emerald-500 dark:bg-emerald-400'
    },
    absent: {
        label: 'Absent',
        classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30',
        dotClasses: 'bg-emerald-500 dark:bg-emerald-400'
    },
    unknown: {
        label: 'Unknown',
        classes: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30',
        dotClasses: 'bg-amber-500 dark:bg-amber-400'
    },
    not_mentioned: {
        label: 'Not Mentioned',
        classes: 'bg-slate-100/80 text-slate-600 ring-1 ring-inset ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/60',
        dotClasses: 'bg-slate-400 dark:bg-slate-500'
    }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
    const { label, classes, dotClasses } = statusConfig[status] || statusConfig.not_mentioned;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase select-none transition-colors duration-150 ${classes} ${className}`.trim()}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`} aria-hidden="true" />
            <span>{label}</span>
        </span>
    );
};

export default StatusBadge;
