
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

            <Card className="border-none shadow-sm ring-1 ring-black/[0.03] rounded-3xl overflow-hidden">
                <CardHeader className="pb-6 pt-8 px-8 border-b border-border/50 bg-muted/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black tracking-tight">Active Registrations</CardTitle>
                            <CardDescription className="text-sm font-medium">
                                Database of {patients.length} identified individuals within the clinic network.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                                type="text"
                                placeholder="Search by name or phone..."
                                className="pl-10 h-11 rounded-2xl bg-muted/20 border-border/40 focus:bg-background transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="px-8 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Patient Identity</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Classification</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Last Interaction</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Next Scheduled</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Call Frequency</TableHead>
                                <TableHead className="px-8 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6} className="px-8 py-8 animate-pulse">
                                            <div className="h-12 bg-muted rounded-2xl w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="px-8 py-12">
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
                                    <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors cursor-pointer group">
                                        <TableCell className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center font-bold ring-1 ring-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                                                    {patient.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{patient.name}</div>
                                                    <div className="text-xs text-muted-foreground font-bold font-mono opacity-60">{patient.phone}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {patient.tags.map(tag => (
                                                    <Badge key={tag} variant="secondary" className="capitalize px-2 py-0 text-[10px] font-bold rounded-lg bg-primary/5 text-primary/80 border-none">
                                                        {tag.replace('-', ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-muted-foreground font-medium text-sm">
                                            {patient.lastVisit ? format(new Date(patient.lastVisit), 'MMM d, yyyy') : <span className="text-muted-foreground/30">—</span>}
                                        </TableCell>
                                        <TableCell className="px-4 py-4">
                                            {patient.nextAppointment ? (
                                                <Badge variant="outline" className="gap-1.5 font-bold text-[10px] uppercase border-emerald-500/20 text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-lg">
                                                    <Calendar size={10} />
                                                    {format(new Date(patient.nextAppointment), 'MMM d')}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground/30 text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-4">
                                            <div className="flex items-center gap-1.5 text-muted-foreground font-bold tabular-nums">
                                                <Phone className="size-3.5 opacity-50" />
                                                {patient.totalCalls}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 transition-all">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
