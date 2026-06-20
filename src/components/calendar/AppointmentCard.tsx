import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

export type AppointmentVisitType = "New Patient" | "Follow-up" | "Procedure" | "Consultation" | "Emergency Exam" | "Hygiene" | "Cleaning";

export interface Appointment {
    id: string
    patientName: string
    visitType: AppointmentVisitType
    provider: string
    startTime: string // HH:mm
    duration: number // minutes
    isGoogle?: boolean
    isClio?: boolean
    date: string // YYYY-MM-DD
    outcome?: string
    approvalStatus?: 'PENDING' | 'CONFIRMED'
    createdBy?: string
}

const appointmentVariants = cva(
    "absolute inset-x-0 mx-1 rounded-xl border border-slate-200 p-2.5 text-xs transition-all duration-150 hover:-translate-y-[1.5px] hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:z-20 cursor-pointer overflow-hidden group active:scale-[0.99] bg-white",
    {
        variants: {
            visitType: {
                "New Patient": "bg-blue-500/[0.04] border-blue-500/30 text-blue-700/90 hover:bg-blue-500/[0.08]",
                "Follow-up": "bg-emerald-500/[0.04] border-emerald-500/30 text-emerald-700/90 hover:bg-emerald-500/[0.08]",
                "Procedure": "bg-purple-500/[0.04] border-purple-500/30 text-purple-700/90 hover:bg-purple-500/[0.08]",
                "Consultation": "bg-indigo-500/[0.04] border-indigo-500/30 text-indigo-700/90 hover:bg-indigo-500/[0.08]",
                "Emergency Exam": "bg-rose-500/[0.04] border-rose-500/30 text-rose-700/90 hover:bg-rose-500/[0.08]",
                "Hygiene": "bg-teal-500/[0.04] border-teal-500/30 text-teal-700/90 hover:bg-teal-500/[0.08]",
                "Cleaning": "bg-cyan-500/[0.04] border-cyan-500/30 text-cyan-700/90 hover:bg-cyan-500/[0.08]",
                "Google Event": "bg-slate-500/[0.04] border-slate-500/30 text-slate-600/80 hover:bg-slate-500/[0.08]",
            },
            outcome: {
                "appointment_booked": "border-l-[3px]",
                "appointment_cancelled": "opacity-40 grayscale border-dashed border-slate-300 bg-slate-50",
            }
        },
        defaultVariants: {
            visitType: "Consultation",
        },
    }
)

interface AppointmentCardProps {
    appointment: Appointment
    style?: React.CSSProperties
    onClick?: (apt: Appointment) => void
    onResizeStart?: (e: React.MouseEvent) => void
}

export function AppointmentCard({ appointment, style, onClick, onResizeStart }: AppointmentCardProps) {
    const variantType = appointment.isGoogle ? "Google Event" : appointment.visitType
    const isCancelled = appointment.outcome === 'appointment_cancelled' || appointment.outcome === 'cancelled';

    return (
        <div
            className={cn(
                appointmentVariants({
                    visitType: variantType as any,
                    outcome: isCancelled ? 'appointment_cancelled' : 'appointment_booked'
                }),
                "flex flex-row items-center gap-2 justify-between py-1 px-2",
                appointment.approvalStatus === 'PENDING' && "border-dashed border-slate-300 opacity-90 shadow-none bg-slate-50/50"
            )}
            style={style}
            onClick={(e) => {
                e.stopPropagation()
                onClick?.(appointment)
            }}
        >
            <div className={cn(
                "flex items-center gap-1 font-semibold leading-tight w-full overflow-hidden"
            )}>
                {appointment.isClio && !appointment.isGoogle && (
                    <div className="flex-shrink-0 size-4.5 bg-primary text-white flex items-center justify-center rounded-lg text-[9px] shadow-sm transform group-hover:rotate-6 transition-transform ring-1 ring-white/30" title="AI Booked">
                        C
                    </div>
                )}
                <span className={cn(
                    "truncate font-bold tracking-tight text-current/95 text-[11px]"
                )}>
                    {appointment.approvalStatus === 'PENDING' && (
                        <span className="text-slate-500 font-bold mr-1">
                            •
                        </span>
                    )}
                    {appointment.patientName}
                    <span className="ml-2 opacity-50 font-medium text-[10px] hidden sm:inline">
                        — {appointment.visitType}
                    </span>
                    {appointment.createdBy && (
                        <span className="ml-1 opacity-40 font-medium text-[10px]">({appointment.createdBy})</span>
                    )}
                </span>
                {isCancelled && <span className="flex-shrink-0 ml-auto text-[7px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md border border-red-200">Void</span>}
                {appointment.approvalStatus === 'PENDING' && !isCancelled && (
                    <span className="flex-shrink-0 ml-auto text-[7px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200 uppercase tracking-tighter animate-pulse">Pending</span>
                )}
            </div>

            {onResizeStart && !isCancelled && (
                <div
                    className="absolute bottom-0 inset-x-0 h-1.5 cursor-s-resize hover:bg-black/5 transition-colors z-20"
                    onMouseDown={(e) => {
                        e.stopPropagation()
                        onResizeStart(e)
                    }}
                />
            )}
        </div>
    )
}
