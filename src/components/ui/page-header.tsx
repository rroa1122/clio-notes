import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-8", className)}>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs font-semibold text-slate-500 max-w-2xl tracking-tight">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 mt-6 md:mt-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
