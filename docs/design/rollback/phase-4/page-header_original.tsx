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
        <div className={cn("flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-6", className)}>
            <div className="space-y-1">
                <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase sm:text-4xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs font-bold text-muted-foreground/60 max-w-2xl uppercase tracking-widest">
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
