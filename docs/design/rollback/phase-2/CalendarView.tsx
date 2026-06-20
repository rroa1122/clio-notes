import { useState, useRef, useEffect } from "react"
import { format, addDays, startOfWeek, setHours, isValid, isSameDay, parseISO } from "date-fns"
import { type Appointment, AppointmentCard } from "./AppointmentCard"
import { cn } from "../../lib/utils"
import { calendarService, type CalendarEvent } from "../../services/calendarService"
import { EventDetailsPanel } from "./EventDetailsPanel"
import { CreateEventModal } from "./CreateEventModal"
import { Plus, Eye, EyeOff, RefreshCw, CalendarCheck, X, Activity, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "../ui/button"

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8 AM - 6 PM
const TIME_SLOT_HEIGHT = 52
const START_HOUR = 8

export function CalendarView() {
    const [viewDate, setViewDate] = useState(new Date())
    const [currentTime, setCurrentTime] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [showCancelled, setShowCancelled] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Auto-update current time indicator
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const start = startOfWeek(viewDate, { weekStartsOn: 1 });
            const end = addDays(start, 5);
            const data = await calendarService.fetchEventsForRange(
                start.toISOString(),
                end.toISOString(),
                showCancelled
            );
            setEvents(data);
        } catch (err) {
            console.error("Failed to fetch events:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [viewDate, showCancelled]);

    const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 }) // Monday
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)) // Mon-Fri

    const nextWeek = () => setViewDate(prev => addDays(prev, 7));
    const prevWeek = () => setViewDate(prev => addDays(prev, -7));
    const goToToday = () => setViewDate(new Date());

    const getStyleForAppointment = (apt: Appointment) => {
        const [h, m] = apt.startTime.split(":").map(Number)
        const hour = Math.max(START_HOUR, Math.min(18, h));
        const minutes = m || 0;
        const startMinutesFromBase = (hour - START_HOUR) * 60 + minutes
        const top = (startMinutesFromBase / 60) * TIME_SLOT_HEIGHT
        const height = (apt.duration / 60) * TIME_SLOT_HEIGHT
        return {
            top: `${top}px`,
            height: `${height}px`,
            zIndex: 10,
        }
    }

    const getTimeLinePosition = () => {
        const h = currentTime.getHours();
        const m = currentTime.getMinutes();
        if (h < START_HOUR || h > 18) return null;
        const startMinutesFromBase = (h - START_HOUR) * 60 + m;
        return (startMinutesFromBase / 60) * TIME_SLOT_HEIGHT;
    }

    const timeLineTop = getTimeLinePosition();

    const appointments: (Appointment & { raw: CalendarEvent })[] = events.map(event => {
        const start = parseISO(event.start_at);
        const end = parseISO(event.end_at);
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);

        return {
            id: event.id,
            patient_last4: event.patient_last4 || '',
            patientName: event.patient_name || `Patient ${event.patient_last4 || 'N/A'}`,
            visitType: "Consultation",
            provider: "Dr. Sarah Smith",
            startTime: format(start, "HH:mm"),
            duration: duration,
            isClio: event.source === 'ai_voice',
            date: format(start, "yyyy-MM-dd"),
            outcome: event.status === 'booked' ? 'appointment_booked' : 'cancelled',
            raw: event
        };
    });

    const handleCreateEvent = async (eventData: Partial<CalendarEvent>) => {
        await calendarService.createEvent(eventData);
        fetchEvents();
    };

    const handleCancelEvent = async (reason: string) => {
        if (!selectedEvent) return;
        await calendarService.cancelEvent(selectedEvent.id, reason);
        fetchEvents();
    };

    const [activeTab, setActiveTab] = useState<'calendar' | 'snapshot' | 'upcoming' | 'health'>('calendar');

    return (
        <div className="flex flex-col bg-white border border-slate-200/60 rounded-2xl shadow-[0_18px_60px_rgba(15,23,42,0.10)] p-5 relative">
            {/* 1. Workstation Toolbar */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-200/50 bg-white relative z-50 h-[56px]">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-[17px] tracking-tight text-slate-900 ml-1">
                        {format(weekStart, "MMMM yyyy")}
                    </h3>
                    {loading && <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin opacity-40" />}
                </div>

                <div className="flex items-center gap-3">
                    {/* Navigation Group Pill */}
                    <div className="flex items-center gap-0.5 bg-white p-1 rounded-full border border-slate-200/60 shadow-sm h-9">
                        <button
                            onClick={prevWeek}
                            className="h-7 w-9 flex items-center justify-center hover:bg-slate-50 hover:shadow-sm rounded-full text-slate-600 transition-all active:scale-95"
                        >
                            <span className="text-[14px]">←</span>
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-4 h-7 hover:bg-slate-50 hover:shadow-sm rounded-full text-[12px] font-bold text-slate-700 transition-all active:scale-95"
                        >
                            Today
                        </button>
                        <button
                            onClick={nextWeek}
                            className="h-7 w-9 flex items-center justify-center hover:bg-slate-50 hover:shadow-sm rounded-full text-slate-600 transition-all active:scale-95"
                        >
                            <span className="text-[14px]">→</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowCancelled(!showCancelled)}
                        className={cn(
                            "flex items-center gap-2 px-4 h-9 rounded-full text-[12px] font-bold transition-all border border-slate-200/60 bg-white hover:bg-slate-50 shadow-sm",
                            showCancelled ? "text-rose-600 border-rose-500/30 bg-rose-50" : "text-slate-600"
                        )}
                    >
                        {showCancelled ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{showCancelled ? "Showing void" : "Hide void"}</span>
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 h-9 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.20)] transition-all active:scale-[0.98] font-bold text-[13px] tracking-tight"
                    >
                        <Plus size={16} /> New appointment
                    </button>
                </div>
            </div>

            {/* 2. Workstation Utilities (Segmented Tabs Rail) */}
            <div className="px-6 py-3 bg-transparent border-b border-slate-200/50 z-40">
                <div className="inline-flex gap-1 p-1 bg-slate-100/50 rounded-full border border-slate-200/60">
                    {[
                        { id: 'calendar', label: 'Schedule' },
                        { id: 'snapshot', label: 'Snapshot' },
                        { id: 'upcoming', label: 'Upcoming' },
                        { id: 'health', label: 'Health' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(activeTab === tab.id ? 'calendar' : tab.id as any)}
                            className={cn(
                                "h-8 px-5 text-[12px] font-bold rounded-full transition-all duration-200 ease-out outline-none select-none tracking-tight",
                                activeTab === tab.id
                                    ? "bg-white border border-slate-200/60 shadow-[0_4px_12px_rgba(15,23,42,0.08)] text-slate-900"
                                    : "text-slate-500 hover:text-slate-800 active:scale-[0.98] hover:bg-white/60"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 3. Operational Panel (Discrete Left-Aligned Sub-Card) */}
                <div className={cn(
                    "mt-3 overflow-hidden transition-all duration-300 ease-in-out origin-top",
                    activeTab === 'calendar'
                        ? "max-h-0 opacity-0 pointer-events-none translate-y-[-10px]"
                        : "max-h-[160px] opacity-100 pointer-events-auto translate-y-0"
                )}>
                    <div className="max-w-[500px] rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-black/[0.02] py-4 px-6 relative group flex flex-col justify-center min-h-[90px] ml-1 mb-4">
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-center w-full">
                            {activeTab === 'snapshot' && (
                                <div className="grid grid-cols-2 gap-8 w-full animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-slate-500 leading-none">Total clinical volume</p>
                                        <div className="flex items-center gap-2.5">
                                            <p className="text-2xl font-bold tracking-tight text-slate-900 leading-none">12</p>
                                            <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/10">+12%</div>
                                        </div>
                                    </div>
                                    <div className="border-l border-slate-200/60 pl-8 space-y-1">
                                        <p className="text-[11px] font-bold text-slate-500 leading-none">Diagnostic efficiency</p>
                                        <p className="text-2xl font-bold tracking-tight text-slate-900 leading-none">86%</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'upcoming' && (
                                <div className="flex flex-col gap-2.5 w-full animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl shadow-sm shadow-black/[0.01]">
                                        <span className="text-[11px] font-bold text-primary/70 w-10">14:30</span>
                                        <span className="text-[12px] font-semibold text-slate-800 truncate flex-1 tracking-tight">Follow-up: Session #241</span>
                                    </div>
                                    <div className="flex items-center gap-4 px-4 py-0.5">
                                        <span className="text-[11px] font-bold text-slate-500 w-10">15:15</span>
                                        <span className="text-[12px] font-medium text-slate-700 truncate flex-1">New Intake: Session #242</span>
                                        <span className="text-[10px] font-bold text-slate-500/80 ml-auto">+3 more</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'health' && (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300 w-full">
                                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/60 px-4 py-2 rounded-full">
                                        <div className="relative size-1.5 translate-y-[-1px]">
                                            <div className="absolute inset-0 rounded-full bg-emerald-500/60 animate-pulse" />
                                            <div className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping opacity-20" />
                                        </div>
                                        <span className="text-[11px] font-bold text-emerald-700 tracking-tight">Systems nominal</span>
                                    </div>
                                    <div className="ml-auto space-y-1 text-right pr-2">
                                        <p className="text-[10px] font-semibold text-slate-500 leading-none">Latency: 24ms</p>
                                        <p className="text-[10px] font-semibold text-slate-500 leading-none">Sync: Active</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 bg-white">
                <div className="flex-1 flex flex-col">
                    <div className="flex border-b border-slate-200/80 bg-slate-50/60 sticky top-0 z-40 transition-colors">
                        <div className="w-16 flex-shrink-0 border-r border-slate-200/70" />
                        <div className="flex flex-1">
                            {weekDays.map((day) => {
                                const isToday = isSameDay(day, new Date());
                                return (
                                    <div key={day.toString()} className={cn(
                                        "flex-1 border-r border-slate-200/70 px-2 py-2 text-center transition-all",
                                        isToday ? "bg-primary/[0.015]" : ""
                                    )}>
                                        <div className={cn(
                                            "text-[10px] font-bold tracking-tight mb-0.5 uppercase",
                                            isToday ? "text-primary opacity-100" : "text-slate-500"
                                        )}>
                                            {format(day, "EEE")}
                                        </div>
                                        <div className={cn(
                                            "text-[14px] font-bold inline-flex items-center justify-center w-6 h-6 rounded-full transition-all",
                                            isToday ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-800/90"
                                        )}>
                                            {format(day, "d")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative no-scrollbar bg-white mt-4 overflow-visible" ref={containerRef}>
                        <div className="flex min-h-[500px] relative" style={{ height: HOURS.length * TIME_SLOT_HEIGHT }}>
                            <div className="w-16 flex-shrink-0 border-r border-slate-200/70 bg-slate-50/50 sticky left-0 z-40 text-[11px] font-bold text-slate-500">
                                {HOURS.map((hour) => (
                                    <div key={hour} className="border-b border-slate-200/60 relative" style={{ height: TIME_SLOT_HEIGHT }}>
                                        <span className="absolute -top-2 px-2 right-1 flex items-center gap-1">
                                            {format(setHours(new Date(), hour), "h a")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-1 relative bg-grid-slate-900/[0.005]">
                                {weekDays.map((day) => {
                                    const dayStr = format(day, "yyyy-MM-dd")
                                    const isToday = isSameDay(day, new Date())
                                    const daysAppointments = appointments.filter(a => a.date === dayStr)

                                    return (
                                        <div key={dayStr} className={cn(
                                            "flex-1 border-r border-slate-200/70 relative min-w-[120px]",
                                            isToday ? "bg-primary/[0.01]" : ""
                                        )}>
                                            {HOURS.map((h) => (
                                                <div key={h} className="border-b border-slate-200/70/40" style={{ height: TIME_SLOT_HEIGHT }} />
                                            ))}

                                            {daysAppointments.map(apt => (
                                                <div
                                                    key={apt.id}
                                                    className="absolute inset-x-0 z-10 cursor-pointer group"
                                                    style={getStyleForAppointment(apt)}
                                                >
                                                    <AppointmentCard
                                                        appointment={apt}
                                                        style={{ height: "100%", position: "relative" }}
                                                        onClick={() => setSelectedEvent(apt.raw)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}

                                {timeLineTop !== null && (
                                    <div
                                        className="absolute left-0 right-0 border-t border-destructive/30 z-30 pointer-events-none flex items-center"
                                        style={{ top: `${timeLineTop}px` }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1 border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.2)]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {selectedEvent && (
                    <>
                        {/* High-fidelity side overlay drawer for Desktop */}
                        <div className="hidden lg:block">
                            {/* Backdrop that closes on outside click ONLY if we want it to block, 
                                but the user said 'non-blocking'. I'll skip the backdrop for true non-blocking
                                OR use a subtle one that doesn't dim much. */}
                            <EventDetailsPanel
                                event={selectedEvent}
                                onClose={() => setSelectedEvent(null)}
                                onCancel={handleCancelEvent}
                                className="fixed inset-y-0 right-0 w-[420px] shadow-2xl z-[60] border-l border-border/20"
                            />
                        </div>
                        {/* Overlay for smaller screens */}
                        <div className="lg:hidden fixed inset-0 z-[60]">
                            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setSelectedEvent(null)} />
                            <EventDetailsPanel
                                event={selectedEvent}
                                onClose={() => setSelectedEvent(null)}
                                onCancel={handleCancelEvent}
                            />
                        </div>
                    </>
                )}
            </div>

            {showCreateModal && (
                <CreateEventModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateEvent}
                />
            )}
        </div>
    )
}
