import { User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Patient } from "../lib/storage";

export interface PatientSummaryCardProps {
    patient: Patient;
    onReset: () => void;
    className?: string;
}

export function PatientSummaryCard({ patient, onReset, className }: PatientSummaryCardProps) {
    const patientDisplayName = patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';

    return (
        <div
            className={cn(
                "group relative flex items-center justify-between h-11 px-3 rounded-xl mt-0.5",
                "bg-card border border-border/80 dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40",
                "shadow-xs transition-all duration-200 overflow-hidden select-none",
                className
            )}
        >
            {/* Left: Avatar + 2-line Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1.5">
                {/* Compact Avatar */}
                <div className="relative size-7 shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center">
                    <User className="size-3.5 text-primary stroke-[2.2]" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-1 ring-card" />
                </div>

                {/* 2-line Content: Name on Top, DOB/ID on Bottom */}
                <div className="flex flex-col min-w-0 truncate">
                    <span className="text-xs font-semibold text-foreground tracking-tight truncate leading-tight">
                        {patientDisplayName}
                    </span>

                    {(patient.dob || patient.emr_id) && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap leading-none mt-0.5">
                            {patient.dob && (
                                <span>DOB: {patient.dob}</span>
                            )}
                            {patient.dob && patient.emr_id && (
                                <span className="opacity-50">·</span>
                            )}
                            {patient.emr_id && (
                                <span>ID: {patient.emr_id}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Sleek Change Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 px-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border-0 active:scale-95 transition-all duration-200 gap-1 font-medium text-[11px] group/btn shrink-0 cursor-pointer"
                title="Change selected patient"
            >
                <RefreshCw className="size-3 text-muted-foreground/80 group-hover/btn:text-primary transition-transform duration-500 ease-out group-hover/btn:rotate-180" />
                <span className="tracking-tight hidden sm:inline">Change</span>
            </Button>
        </div>
    );
}
