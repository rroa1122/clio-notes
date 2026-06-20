
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    CheckCircle,
    ArrowUpRight,
    XCircle,
    MoreHorizontal,
    User,
    Sparkles,
    Search,
    Filter,
    PhoneOff,
    Download
} from 'lucide-react';
import { useCalls } from '../context/CallsContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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

export function Calls() {
    const navigate = useNavigate();
    const { calls, loading: isLoading } = useCalls();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCalls = calls.filter(call =>
        (call.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (call.extractedData.reason?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
            <PageHeader
                title="Call History"
                subtitle="Review and manage all voice interactions handled by the CLIO AI Infrastructure."
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-xl font-bold uppercase tracking-tighter gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
                        <Button className="rounded-xl font-bold uppercase tracking-tighter gap-2 shadow-lg shadow-primary/20">
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                }
            />

            <Card className="border-none shadow-sm ring-1 ring-black/[0.03] rounded-3xl overflow-hidden">
                <CardHeader className="pb-6 pt-8 px-8 border-b border-border/50 bg-muted/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black tracking-tight">Recent Interactions</CardTitle>
                            <CardDescription className="text-sm font-medium">
                                Real-time feed of automated call outcomes and clinical extraction logs.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                                type="text"
                                placeholder="Search by name, phone or reason..."
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
                                <TableHead className="px-8 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground w-[300px]">Caller Identity</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Reason for Contact</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Date & Precision</TableHead>
                                <TableHead className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Duration</TableHead>
                                <TableHead className="px-8 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5} className="px-8 py-8 animate-pulse">
                                            <div className="h-12 bg-muted rounded-2xl w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredCalls.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-8 py-12">
                                        <EmptyState
                                            icon={searchTerm ? Search : PhoneOff}
                                            title={searchTerm ? "No matches found" : "No recent calls"}
                                            description={searchTerm ? `We couldn't find any calls matching "${searchTerm}". Try a different search term.` : "Your call history is currently empty as no interactions have been processed."}
                                            action={searchTerm ? {
                                                label: "Clear Search",
                                                onClick: () => setSearchTerm('')
                                            } : undefined}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCalls.map((call) => (
                                    <TableRow
                                        key={call.id}
                                        onClick={() => navigate(`/calls/${call.id}`)}
                                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                                    >
                                        <TableCell className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all ring-1 ring-primary/10">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{call.patientName || 'Anonymous Interaction'}</div>
                                                    <div className="text-xs text-muted-foreground font-bold font-mono opacity-60">{call.patientPhone}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 font-medium text-foreground/80">
                                            {call.extractedData.reason || <span className="text-muted-foreground/40 italic">Not extracted</span>}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-muted-foreground font-medium">
                                            {(() => {
                                                try {
                                                    return format(new Date(call.timestamp), 'MMM d, h:mm a');
                                                } catch (e) {
                                                    return 'Invalid timestamp';
                                                }
                                            })()}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 text-muted-foreground font-bold tabular-nums">
                                            {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                                        </TableCell>
                                        <TableCell className="px-8 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
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
