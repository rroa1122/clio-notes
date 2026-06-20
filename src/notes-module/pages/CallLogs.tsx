import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Search, Filter, ChevronRight, FileDown } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockCallsClinic1 } from "@/notes-module/lib/mock-data";
import type { CallFlag } from "@/notes-module/types";

export function CallLogs() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCalls = mockCallsClinic1.filter(call =>
        call.caller_masked.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.intent.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getFlagBadge = (flags: CallFlag[]) => {
        if (flags.includes("needs_review")) return <Badge variant="warning">Review</Badge>;
        if (flags.includes("transfer")) return <Badge variant="secondary">Transfer</Badge>;
        if (flags.includes("fallback")) return <Badge variant="destructive">Fallback</Badge>;
        return <Badge variant="success">OK</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Call Logs</h1>
                    <p className="text-sm text-muted-foreground">Detailed history of all AI-handled calls.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-muted-foreground">
                    <FileDown className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-lg border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by caller or intent..."
                        className="pl-9 bg-background h-9 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="sm" className="gap-2 h-9">
                    <Filter className="h-4 w-4" />
                    More Filters
                </Button>
            </div>

            <div className="border rounded-lg bg-card shadow-none overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[180px] h-10 py-0">Start Time</TableHead>
                            <TableHead className="h-10 py-0">Caller</TableHead>
                            <TableHead className="h-10 py-0">Intent</TableHead>
                            <TableHead className="h-10 py-0">Outcome</TableHead>
                            <TableHead className="h-10 py-0">Duration</TableHead>
                            <TableHead className="h-10 py-0">Cost</TableHead>
                            <TableHead className="h-10 py-0">Flags</TableHead>
                            <TableHead className="text-right h-10 py-0"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCalls.map((call) => (
                            <TableRow
                                key={call.id}
                                className="cursor-pointer group hover:bg-muted/30 transition-colors"
                                onClick={() => navigate(`/calls/${call.id}`)}
                            >
                                <TableCell className="font-medium text-foreground py-3">
                                    {format(new Date(call.start_time), "MMM d, h:mm a")}
                                </TableCell>
                                <TableCell className="text-muted-foreground font-mono text-xs py-3">
                                    {call.caller_masked}
                                </TableCell>
                                <TableCell className="py-3">{call.intent}</TableCell>
                                <TableCell className="py-3">
                                    <span className="text-xs font-medium text-foreground">{call.outcome}</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground py-3 font-mono text-xs">
                                    {call.minutes}m {call.duration_sec % 60}s
                                </TableCell>
                                <TableCell className="text-foreground font-medium py-3">
                                    ${call.cost_usd.toFixed(2)}
                                </TableCell>
                                <TableCell className="py-3">
                                    {getFlagBadge(call.flags)}
                                </TableCell>
                                <TableCell className="text-right py-3">
                                    <ChevronRight className="h-4 w-4 text-border group-hover:text-muted-foreground transition-colors inline-block" />
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredCalls.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">
                                    No calls found matching your search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
