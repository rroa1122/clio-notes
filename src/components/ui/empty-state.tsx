import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
    compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-[2rem]",
            compact ? "p-6 min-h-[140px]" : "p-12 min-h-[280px]",
            className
        )}>
            <div className={cn(
                "bg-indigo-50 rounded-2xl flex items-center justify-center ring-1 ring-indigo-100",
                compact ? "w-10 h-10 mb-3" : "w-14 h-14 mb-5"
            )}>
                <Icon className={cn("text-indigo-600 opacity-60", compact ? "w-5 h-5" : "w-7 h-7")} />
            </div>
            <h3 className={cn("font-bold text-slate-900 tracking-tight mb-1", compact ? "text-sm" : "text-base")}>{title}</h3>
            <p className={cn("text-slate-500 leading-relaxed mx-auto mb-6", compact ? "text-[11px] max-w-xs" : "text-sm max-w-sm")}>
                {description}
            </p>
            {action && !compact && (
                <Button onClick={action.onClick} className="rounded-xl px-8 h-10 font-bold text-xs uppercase tracking-widest shadow-md shadow-indigo-100/30">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
