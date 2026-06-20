import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

interface KpiTileProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive?: boolean;
    };
    description?: string;
    className?: string;
    iconClassName?: string;
}

export function KpiTile({
    label,
    value,
    icon: Icon,
    trend,
    description,
    className,
    iconClassName
}: KpiTileProps) {
    return (
        <div className={cn("flex items-center justify-between group", className)}>
            <div className="flex items-center gap-3">
                <div className={cn(
                    "size-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors ring-1 ring-primary/10",
                    iconClassName
                )}>
                    <Icon size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-muted-foreground/60 tracking-tight mb-0">{label}</p>
                    <p className="text-xl font-black tracking-tighter tabular-nums leading-none">{value}</p>
                    {description && (
                        <p className="text-[9px] font-bold text-muted-foreground/40 tracking-tight mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            {trend && (
                <div className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                    trend.isPositive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}>
                    {trend.value}
                </div>
            )}
        </div>
    );
}

export function KpiGrid({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <Card className="p-6">
            <div className="space-y-6">
                {children}
            </div>
        </Card>
    );
}
