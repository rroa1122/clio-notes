import { User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TiltCard } from "../../components/ui/tilt-card";
import type { Patient } from "../lib/storage";

interface PatientSummaryCardProps {
    patient: Patient;
    onReset: () => void;
}

export function PatientSummaryCard({ patient, onReset }: PatientSummaryCardProps) {
    return (
        <TiltCard intensity={4} scale={1.01}>
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/10 shadow-none group transition-all duration-300 hover:bg-primary/[0.08]">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-10 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105 duration-300">
                    <User size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-700 truncate tracking-tight">
                        {patient.full_name}
                    </span>
                    <div className="flex flex-col gap-0.5 text-[10px] uppercase tracking-tight mt-0.5">
                        {patient.dob && (
                            <div className="flex items-center gap-1.5 font-semibold">
                                <span className="text-slate-400 font-medium">DOB:</span>
                                <span className="text-slate-500 tracking-tighter">{patient.dob}</span>
                            </div>
                        )}
                        {patient.emr_id && (
                            <div className="flex items-center gap-1.5 font-semibold">
                                <span className="text-slate-400 font-medium">ID:</span>
                                <span className="text-slate-500 tracking-tighter">{patient.emr_id}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 pr-3 pl-2.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all gap-1.5 font-semibold text-[11px]"
            >
                <RefreshCw size={13} className="opacity-40 group-hover:rotate-180 transition-transform duration-500" />
                <span>Change</span>
            </Button>
        </div>
        </TiltCard>
    );
}
