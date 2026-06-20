import React from 'react';

interface StatusBadgeProps {
    status: 'present' | 'denied' | 'not_mentioned' | 'absent' | 'unknown';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config = {
        present: {
            label: 'Present',
            classes: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
        },
        denied: {
            label: 'Denied',
            classes: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
        },
        absent: {
            label: 'Absent',
            classes: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
        },
        unknown: {
            label: 'Unknown',
            classes: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800'
        },
        not_mentioned: {
            label: 'Not Mentioned',
            classes: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800'
        }
    };

    const { label, classes } = config[status] || config.not_mentioned;

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${classes}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
