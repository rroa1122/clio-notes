
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

            <Card className="bg-surface border border-border/60 shadow-soft rounded-card overflow-hidden">
                <CardHeader className="pb-6 pt-8 px-8 border-b border-border/60">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-semibold text-slate-900 tracking-tight">Recent Interactions</CardTitle>
                            <CardDescription className="text-sm font-medium text-slate-500 tracking-tight">
                                Real-time feed of automated call outcomes and clinical extraction logs.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-80 group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 group-focus-within/search:text-primary transition-colors" />
                            <Input
                                type="text"
                                placeholder="Search by name, phone or reason..."
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
                                    <TableHead className="px-8 w-[300px]">Caller Identity</TableHead>
                                    <TableHead>Reason for Contact</TableHead>
                                    <TableHead>Date & Precision</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="px-8 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5} className="px-8 py-4">
                                                <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full opacity-50" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredCalls.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-8 py-16">
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
                                            className="cursor-pointer group h-16"
                                        >
                                            <TableCell className="px-8 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200 border border-slate-200/50">
                                                        <User className="h-4.5 w-4.5" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="font-semibold text-slate-900 text-sm truncate group-hover:text-primary transition-colors">
                                                            {call.patientName || 'Anonymous Interaction'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-bold font-mono tracking-tight uppercase">
                                                            {call.patientPhone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 font-medium text-slate-600 text-sm">
                                                <div className="line-clamp-1 max-w-[200px]">
                                                    {call.extractedData.reason || <span className="text-slate-300 italic font-normal">Not extracted</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-slate-500 font-semibold text-xs tabular-nums">
                                                {(() => {
                                                    try {
                                                        return format(new Date(call.timestamp), 'MMM d, h:mm a');
                                                    } catch (e) {
                                                        return 'Invalid timestamp';
                                                    }
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-3 text-slate-500 font-bold text-xs tabular-nums tracking-tight">
                                                {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                                            </TableCell>
                                            <TableCell className="px-8 py-3 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover:opacity-100 duration-200">
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
