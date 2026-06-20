import { useState } from "react";
import { format, isValid, addMinutes } from "date-fns";
import { Search, Filter, CalendarCheck, CalendarX, CalendarClock, ExternalLink, MoreVertical, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { mockAppointmentsClinic1 } from "@/notes-module/lib/mock-data";

export function Appointments() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [appointments, setAppointments] = useState(mockAppointmentsClinic1);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    // Form state
    const [newPatientName, setNewPatientName] = useState("");
    const [newProvider, setNewProvider] = useState("Dr. Sarah Smith");
    const [newStartTime, setNewStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

    const filteredAppointments = appointments.filter(app =>
        app.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const safeFormat = (dateStr: string, formatStr: string) => {
        const d = new Date(dateStr);
        if (!isValid(d)) return "Invalid Date";
        return format(d, formatStr);
    };

    const handleManualBooking = (e: React.FormEvent) => {
        e.preventDefault();

        const newApp = {
            id: `manual-${Date.now()}`,
            patient_name: newPatientName,
            provider: newProvider,
            start_time: new Date(newStartTime).toISOString(),
            end_time: addMinutes(new Date(newStartTime), 30).toISOString(),
            status: 'confirmed' as const,
            source_call_id: "manual",
            clinic_id: "clinic-1",
            created_by_agent: false,
        };

        setAppointments([newApp, ...appointments]);
        setIsBookingOpen(false);
        setNewPatientName("");
        // In a real app we'd trigger a toast here
    };

    const stats = {
        total: filteredAppointments.filter(a => safeFormat(a.start_time, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        rescheduled: appointments.filter(a => a.status === 'rescheduled').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1>
                    <p className="text-sm text-muted-foreground">Manage appointments booked by the AI agent.</p>
                </div>

                <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-9 font-semibold px-4 gap-2">
                            <Plus className="h-4 w-4" />
                            Manual Booking
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleManualBooking}>
                            <DialogHeader>
                                <DialogTitle>Book Appointment</DialogTitle>
                                <DialogDescription>
                                    Manually add a new appointment to the schedule.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="patient-name">Patient Name</Label>
                                    <Input
                                        id="patient-name"
                                        placeholder="Full Name"
                                        value={newPatientName}
                                        onChange={(e) => setNewPatientName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="provider">Provider</Label>
                                    <Select value={newProvider} onValueChange={setNewProvider}>
                                        <SelectTrigger id="provider">
                                            <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Dr. Sarah Smith">Dr. Sarah Smith</SelectItem>
                                            <SelectItem value="Dr. Michael Chen">Dr. Michael Chen</SelectItem>
                                            <SelectItem value="Dr. Emily Rodriguez">Dr. Emily Rodriguez</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="start-time">Date & Time</Label>
                                    <Input
                                        id="start-time"
                                        type="datetime-local"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Complete Booking</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-none border-border">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today's Load</CardTitle>
                        <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirmed</CardTitle>
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold text-emerald-600">{stats.confirmed}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cancelled</CardTitle>
                        <CalendarX className="h-3.5 w-3.5 text-rose-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold text-rose-600">{stats.cancelled}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rescheduled</CardTitle>
                        <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-2xl font-bold text-amber-600">{stats.rescheduled}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-lg border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patients..."
                        className="pl-9 bg-background h-9 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
                    <Filter className="h-3.5 w-3.5" />
                    Filter Date
                </Button>
                <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
                    <Filter className="h-3.5 w-3.5" />
                    Status
                </Button>
            </div>

            <div className="border rounded-lg bg-card shadow-none overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[200px] h-10 py-0 text-xs uppercase font-bold tracking-tight">Patient Name</TableHead>
                            <TableHead className="h-10 py-0 text-xs uppercase font-bold tracking-tight">Provider</TableHead>
                            <TableHead className="h-10 py-0 text-xs uppercase font-bold tracking-tight">Start Time</TableHead>
                            <TableHead className="h-10 py-0 text-xs uppercase font-bold tracking-tight text-center">Status</TableHead>
                            <TableHead className="h-10 py-0 text-xs uppercase font-bold tracking-tight">Source</TableHead>
                            <TableHead className="text-right h-10 py-0"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAppointments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                    No appointments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAppointments.map((app) => (
                                <TableRow key={app.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border">
                                                {app.patient_name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span className="text-sm font-semibold text-foreground">{app.patient_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-sm text-muted-foreground">{app.provider}</TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">{safeFormat(app.start_time, "MMM d, yyyy")}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{safeFormat(app.start_time, "h:mm a")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-center">
                                        <Badge
                                            variant={
                                                app.status === 'confirmed' ? 'success' :
                                                    app.status === 'rescheduled' ? 'warning' :
                                                        app.status === 'cancelled' ? 'destructive' : 'secondary'
                                            }
                                            className="text-[10px] uppercase font-bold tracking-tighter"
                                        >
                                            {app.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => app.source_call_id !== 'manual' && navigate(`/calls/${app.source_call_id}`)}>
                                            <Badge variant="outline" className="text-[9px] font-mono tracking-tighter shadow-none group-hover:bg-muted transition-colors">
                                                {app.source_call_id === 'manual' ? 'MANUAL' : 'AI AGENT'}
                                            </Badge>
                                            {app.source_call_id !== 'manual' && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-3">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
