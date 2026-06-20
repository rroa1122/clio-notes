import { CalendarView } from '../components/calendar/CalendarView';
import { useCalls } from '../context/CallsContext';
import { Card } from '../components/ui/card';
import {
    Users,
    Phone,
    Clock,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PageHeader } from '../components/ui/page-header';

export function Overview() {
    const { kpis } = useCalls();

    if (!kpis) return (
        <div className="h-full flex items-center justify-center p-16 text-center text-muted-foreground animate-pulse">
            <div className="space-y-6">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="font-semibold tracking-tight text-sm text-slate-400">Synchronizing workspace...</p>
            </div>
        </div>
    );

    const kpiData = [
        {
            label: "Total patients",
            value: kpis.totalPatients || 0,
            icon: Users,
            delta: "+12%",
            isPositive: true
        },
        {
            label: "Total calls",
            value: kpis.totalCalls || 0,
            icon: Phone,
            delta: "+5%",
            isPositive: true
        },
        {
            label: "Avg duration",
            value: "14m",
            icon: Clock,
            delta: "-2%",
            isPositive: false
        },
        {
            label: "Efficiency",
            value: "94%",
            icon: ArrowUpRight,
            delta: "+4%",
            isPositive: true
        },
    ];

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 w-full">
            <PageHeader
                title="Dashboard"
                subtitle="Welcome back. Here is what is happening with your practice today."
            />

            {/* B) KPI / Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((kpi, i) => (
                    <Card key={i} className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <kpi.icon className="size-4 text-slate-600" />
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold border",
                                kpi.isPositive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                            )}>
                                {kpi.isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                                {kpi.delta}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                            <span className="text-2xl font-semibold tracking-tight text-slate-900">{kpi.value}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* C) Main Operational Canvas */}
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Clinical schedule</h2>
                        <p className="text-sm font-medium text-slate-500">Manage your daily appointments and patient encounters.</p>
                    </div>
                </header>
                <div className="w-full">
                    <CalendarView />
                </div>
            </div>
        </div>
    );
}
