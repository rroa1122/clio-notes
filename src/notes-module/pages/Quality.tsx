import { format } from "date-fns";
import {
    ShieldCheck,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    CheckCircle2,
    PhoneForwarded,
    Undo2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { mockCallsClinic1 } from "@/notes-module/lib/mock-data";

export function Quality() {
    const reviewQueue = mockCallsClinic1.filter(c => c.flags.includes("needs_review") || c.flags.includes("fallback"));

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quality Assurance</h1>
                <p className="text-sm text-muted-foreground">Monitor AI performance and review flagged calls.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="shadow-none border-border overflow-hidden">
                    <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Automation Success Rate</CardTitle>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold">92.4%</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium tracking-tight">VS 88% TARGET</p>
                    </CardContent>
                </Card>

                <Card className="shadow-none border-border overflow-hidden">
                    <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <PhoneForwarded className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transfer Rate</CardTitle>
                        </div>
                        <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold">6.1%</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium tracking-tight text-emerald-600">LOWER IS BETTER</p>
                    </CardContent>
                </Card>

                <Card className="shadow-none border-border overflow-hidden">
                    <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Undo2 className="h-4 w-4 text-rose-500" />
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fallback Rate</CardTitle>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold">1.5%</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium tracking-tight text-rose-600">CALLS NEEDING HUMAN HELP</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-none border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4">
                    <div>
                        <CardTitle className="text-sm font-semibold">REVIEW QUEUE ({reviewQueue.length})</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8 underline underline-offset-4">Mark all as reviewed</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="h-10 py-0 text-xs font-bold w-[250px]">Call Identification</TableHead>
                                <TableHead className="h-10 py-0 text-xs font-bold">Reason for Flag</TableHead>
                                <TableHead className="h-10 py-0 text-xs font-bold">Time</TableHead>
                                <TableHead className="h-10 py-0 text-xs font-bold">Status</TableHead>
                                <TableHead className="text-right h-10 py-0"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviewQueue.map((call) => (
                                <TableRow key={call.id} className="hover:bg-muted/20">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{call.caller_masked}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{call.intent}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                                            <span className="text-xs font-medium text-rose-600">Ambiguous Intent</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-xs text-muted-foreground">
                                        {format(new Date(call.start_time), "MMM d, h:mm a")}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="warning" className="text-[10px] font-bold tracking-tight">Needs Review</Badge>
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <Button variant="outline" size="sm" className="h-8 text-[11px] font-semibold gap-1.5" asChild>
                                            <a href={`/calls/${call.id}`}>Review <ShieldCheck className="h-3 w-3" /></a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
