import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
    label: string;
    value: string | number;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    icon: LucideIcon;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export function KPICard({ label, value, trend, trendDirection, icon: Icon, color = 'primary' }: KPICardProps) {
    const colorStyles = {
        primary: 'bg-teal-50 text-teal-700',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
        error: 'bg-red-50 text-red-700',
        info: 'bg-blue-50 text-blue-700',
    };

    return (
        <div className="card flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div className={clsx('p-2 rounded-lg', colorStyles[color])}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <span className={clsx(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        trendDirection === 'up' ? 'text-emerald-700 bg-emerald-50' :
                            trendDirection === 'down' ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100'
                    )}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <div className="text-2xl font-bold text-[var(--color-text-main)]">{value}</div>
                <div className="text-sm text-[var(--color-text-muted)] font-medium">{label}</div>
            </div>
        </div>
    );
}
