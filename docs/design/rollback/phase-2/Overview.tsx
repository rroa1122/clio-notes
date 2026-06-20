import { CalendarView } from '../components/calendar/CalendarView';
import { useCalls } from '../context/CallsContext';

export function Overview() {
    const { kpis } = useCalls();

    if (!kpis) return (
        <div className="h-full flex items-center justify-center p-16 text-center text-muted-foreground animate-pulse">
            <div className="space-y-6">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="font-black tracking-tight text-xs opacity-60">Synchronizing Command Center...</p>
            </div>
        </div>
    );

    const hasNoData = kpis.totalCalls === 0;

    return (
        <div className="relative flex flex-col animate-in fade-in duration-1000 w-full min-h-screen gap-0 bg-slate-50 after:absolute after:inset-0 after:bg-[#0B1020]/[0.02] after:pointer-events-none">
            {/* Subtle Premium Radial Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_0%,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none" />

            {/* 1. Primary: Calendar Canvas workstation with integrated tabs */}
            <section className="relative z-10 animate-in slide-in-from-bottom-4 duration-700 flex flex-col w-full max-w-[1920px] mx-auto px-4 py-8 md:px-12 md:py-16">
                <div className="flex flex-col flex-1">
                    <CalendarView />
                </div>
            </section>
        </div>
    );
}
