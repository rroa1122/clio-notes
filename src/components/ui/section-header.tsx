import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
    return (
        <div className={cn("flex items-end justify-between mb-4 px-1", className)}>
            <div className="space-y-0.5">
                <h2 className="text-sm font-black text-foreground tracking-tight flex items-center gap-2">
                    {title}
                </h2>
                {description && (
                    <p className="text-[10px] font-bold text-muted-foreground/50 tracking-wide">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 pb-0.5">
                    {actions}
                </div>
            )}
        </div>
    );
}
