
import { useEffect, useState } from 'react';
import { getPatients, type Patient } from '../data/mockData';
import { Search, Calendar, Phone, MoreHorizontal, User, UserPlus, Users2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../components/ui/table';
import { PageHeader } from '../components/ui/page-header';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';

export function Patients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getPatients().then(data => {
            setPatients(data);
            setIsLoading(false);
        });
    }, []);

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm)
    );

    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
            <PageHeader
                title="Patient Directory"
                subtitle="Securely manage medical records, interaction history, and communication preferences."
                actions={
                    <Button className="rounded-xl font-bold uppercase tracking-tighter gap-2 shadow-lg shadow-primary/20">
                        <UserPlus className="h-4 w-4" />
                        Add New Patient
                    </Button>
                }
            />

            <Card className="bg-surface border border-border/60 shadow-soft rounded-card overflow-hidden">
                <CardHeader className="pb-6 pt-8 px-8 border-b border-border/60">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-semibold text-slate-900 tracking-tight">Active Registrations</CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-500 tracking-tight">
                                Database of {patients.length} identified individuals within the clinic network.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-80 group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 group-focus-within/search:text-primary transition-colors" />
                            <Input
                                type="text"
                                placeholder="Search by name or phone..."
                                className="pl-11 h-11 rounded-input bg-white border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:ring-offset-0 text-sm font-medium text-slate-900 transition-all duration-200 placeholder:text-slate-400 shadow-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-8">Patient Identity</TableHead>
                                    <TableHead>Classification</TableHead>
                                    <TableHead>Last Interaction</TableHead>
                                    <TableHead>Next Scheduled</TableHead>
                                    <TableHead>Call Frequency</TableHead>
                                    <TableHead className="px-8 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6} className="px-8 py-4">
                                                <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full opacity-50" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredPatients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-8 py-16">
                                            <EmptyState
                                                icon={searchTerm ? Search : Users2}
                                                title={searchTerm ? "No patients found" : "No registered patients"}
                                                description={searchTerm ? `No records found matching "${searchTerm}". Verify the spelling or try a different term.` : "Your patient directory is empty. Get started by adding your first patient record."}
                                                action={searchTerm ? {
                                                    label: "Clear Search",
                                                    onClick: () => setSearchTerm('')
                                                } : {
                                                    label: "Add Patient",
                                                    onClick: () => { }
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <TableRow key={patient.id} className="cursor-pointer group h-16">
                                            <TableCell className="px-8 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-full bg-slate-100/80 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200/50 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
                                                        {patient.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="font-semibold text-slate-900 text-sm truncate group-hover:text-primary transition-colors">{patient.name}</div>
                                                        <div className="text-[11px] text-slate-400 font-bold font-mono tracking-tight uppercase">{patient.phone}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {patient.tags.map(tag => (
                                                        <Badge key={tag} variant="secondary" className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/5 text-primary/80 border-none uppercase tracking-tighter">
                                                            {tag.replace('-', ' ')}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-slate-500 font-semibold text-xs tabular-nums">
                                                {patient.lastVisit ? format(new Date(patient.lastVisit), 'MMM d, yyyy') : <span className="text-slate-300 italic font-normal">—</span>}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {patient.nextAppointment ? (
                                                    <Badge variant="outline" className="gap-1.5 font-bold text-[10px] uppercase border-emerald-500/20 text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full">
                                                        <Calendar size={10} className="shrink-0" />
                                                        {format(new Date(patient.nextAppointment), 'MMM d')}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-300 italic font-normal text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-1.5 text-slate-500 font-bold tabular-nums text-xs">
                                                    <Phone className="size-3.5 opacity-40 shrink-0" />
                                                    {patient.totalCalls}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 py-3 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100 duration-200">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
