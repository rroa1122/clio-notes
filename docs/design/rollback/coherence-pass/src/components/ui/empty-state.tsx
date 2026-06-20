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
            "flex flex-col items-center justify-center text-center bg-card/50 border border-dashed border-border rounded-[2rem]",
            compact ? "p-8 min-h-[160px]" : "p-16 min-h-[320px]",
            className
        )}>
            <div className={cn(
                "bg-primary/5 rounded-2xl flex items-center justify-center ring-1 ring-primary/10",
                compact ? "w-12 h-12 mb-4" : "w-16 h-16 mb-6"
            )}>
                <Icon className={cn("text-primary opacity-40", compact ? "w-6 h-6" : "w-8 h-8")} />
            </div>
            <h3 className={cn("font-black text-foreground tracking-tight mb-1", compact ? "text-sm" : "text-lg")}>{title}</h3>
            <p className={cn("text-muted-foreground leading-relaxed mx-auto", compact ? "text-[10px] max-w-xs" : "text-sm max-w-sm mb-8")}>
                {description}
            </p>
            {action && !compact && (
                <Button onClick={action.onClick} className="rounded-xl px-10 h-12 font-black uppercase tracking-tighter shadow-lg shadow-primary/20">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
