import { format } from "date-fns";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import {
    PhoneIncoming,
    PhoneOff,
    CalendarCheck,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    DollarSign,
    TrendingUp,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockCallsClinic1, mockStatsClinic1 } from "@/notes-module/lib/mock-data";
import { cn } from "@/lib/utils";

const stats = [
    { name: "Calls Answered", value: "35", change: "+12%", trend: "up", icon: PhoneIncoming },
    { name: "Missed Prevented", value: "8", change: "+5%", trend: "up", icon: PhoneOff },
    { name: "Appointments Booked", value: "15", change: "+18%", trend: "up", icon: CalendarCheck },
    { name: "Total Minutes", value: "142", change: "+10%", trend: "up", icon: Clock },
    { name: "Total Cost", value: "$21.30", change: "+8%", trend: "down", icon: DollarSign },
    { name: "Est. ROI", value: "4.2x", change: "+0.5x", trend: "up", icon: TrendingUp },
];

const callsByDay = [
    { day: "Mon", calls: 12 },
    { day: "Tue", calls: 18 },
    { day: "Wed", calls: 15 },
    { day: "Thu", calls: 22 },
    { day: "Fri", calls: 19 },
    { day: "Sat", calls: 8 },
    { day: "Sun", calls: 5 },
];

const bookingFunnel = [
    { name: "Inbound", value: 100 },
    { name: "Intent Identified", value: 85 },
    { name: "Availability Checked", value: 60 },
    { name: "Booked", value: 42 },
];

export function Dashboard() {
    const reviewQueue = mockCallsClinic1.filter(c => c.flags.includes("needs_review")).slice(0, 5);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Executive Dashboard</h1>
                <p className="text-sm text-muted-foreground">Detailed overview of your AI voice agent's performance.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {stats.map((stat) => (
                    <Card key={stat.name} className="border shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {stat.name}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                            <div className="flex items-center gap-1 mt-1">
                                {stat.trend === "up" ? (
                                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 text-rose-500" />
                                )}
                                <span className={cn(
                                    "text-[10px] font-medium",
                                    stat.trend === "up" ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {stat.change}
                                </span>
                                <span className="text-[10px] text-muted-foreground">vs last week</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-none border-border overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold">Call Performance</CardTitle>
                            <CardDescription>Daily call volume with intent tracking.</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] shadow-none">+12.5%</Badge>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={callsByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-background border border-border p-2 rounded-lg shadow-sm text-[11px]">
                                                    <p className="font-bold border-b pb-1 mb-1">{payload[0].payload.day}</p>
                                                    <p className="text-primary">{payload[0].value} Calls</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="calls"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCalls)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-none border-border overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <CardTitle className="text-sm font-semibold">Booking Funnel</CardTitle>
                        <CardDescription>Conversion efficiency per stage.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bookingFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderRadius: "8px",
                                        border: "1px solid hsl(var(--border))",
                                        fontSize: "11px"
                                    }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="hsl(var(--primary))"
                                    radius={4}
                                    barSize={20}
                                    background={{ fill: 'hsl(var(--muted))', radius: 4 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
                    <div>
                        <CardTitle className="text-sm font-semibold">Review Queue</CardTitle>
                        <CardDescription>Recent calls flagged for manual review.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-8">
                        <a href="/quality">View all</a>
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {reviewQueue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground italic text-sm">
                                No calls currently needing review.
                            </div>
                        ) : (
                            reviewQueue.map((call) => (
                                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                            <AlertCircle className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-foreground">{call.caller_masked}</div>
                                            <div className="text-xs text-muted-foreground">{call.intent} • {format(new Date(call.start_time), "MMM d, h:mm a")}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-tighter shadow-none">Needs Review</Badge>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs underline underline-offset-4" asChild>
                                            <a href={`/calls/${call.id}`}>Open Details</a>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
