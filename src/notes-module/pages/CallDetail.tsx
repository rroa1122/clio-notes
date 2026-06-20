import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Play,
    Share2,
    CheckCircle2,
    Clock,
    DollarSign
} from "lucide-react";
import { format, isValid } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { mockCallsClinic1 } from "@/notes-module/lib/mock-data";

export function CallDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const call = mockCallsClinic1.find((c) => c.id === id);

    const safeFormat = (dateStr: string, formatStr: string) => {
        const d = new Date(dateStr);
        if (!isValid(d)) return "Invalid Date";
        return format(d, formatStr);
    };

    if (!call) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground italic">Call record not found.</p>
                <Button variant="outline" onClick={() => navigate("/calls")}>Return to Logs</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/calls")} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-foreground">{call.caller_masked}</h1>
                            <Badge variant="secondary" className="font-normal">{call.intent}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {safeFormat(call.start_time, "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                        <Share2 className="h-3 w-3" />
                        Share
                    </Button>
                    <Button variant="default" size="sm" className="gap-2 h-8 text-xs font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Mark Reviewed
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border shadow-none overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Play className="h-3 w-3" />
                                    Recording
                                </CardTitle>
                                <span className="text-[10px] text-muted-foreground font-mono">304s</span>
                            </div>
                        </CardHeader>
                        <CardContent className="py-8 bg-background">
                            <div className="w-full bg-muted/30 h-12 rounded-lg border border-border flex items-center px-4 gap-4">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                                    <Play className="h-4 w-4 fill-current" />
                                </Button>
                                <div className="flex-1 bg-muted h-1.5 rounded-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/20 w-1/3" />
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground underline cursor-pointer">Download Audio</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="transcript" className="w-full">
                        <TabsList className="bg-muted/50 p-1 border border-border">
                            <TabsTrigger value="transcript" className="text-xs font-medium px-4">Transcript</TabsTrigger>
                            <TabsTrigger value="summary" className="text-xs font-medium px-4">Summary</TabsTrigger>
                            <TabsTrigger value="extracted" className="text-xs font-medium px-4">Extracted Data</TabsTrigger>
                            <TabsTrigger value="tools" className="text-xs font-medium px-4">Tool Actions</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 border rounded-lg bg-card shadow-none">
                            <TabsContent value="transcript" className="p-0 m-0">
                                <div className="p-6 h-[400px] overflow-y-auto space-y-4">
                                    <div className="flex flex-col gap-1 max-w-[80%]">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">AI Agent</span>
                                        <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-none text-sm text-foreground border border-border/50">
                                            Hello! This is CLIO from Green Valley Medical. How can I assist you today?
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 max-w-[80%] ml-auto items-end">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Caller</span>
                                        <div className="bg-primary px-4 py-3 rounded-2xl rounded-tr-none text-sm text-primary-foreground border-none">
                                            Hi, I'd like to check if you accept Blue Shield insurance.
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <Separator className="my-4" />
                                        <span className="text-[10px] bg-background px-3 -mt-6 text-muted-foreground font-medium border rounded-full">TRANSCRIPT CONTINUES...</span>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="summary" className="p-6 m-0">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Call Summary</h3>
                                    <ul className="space-y-3">
                                        {call.summary_bullets.map((bullet, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-foreground">
                                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </TabsContent>

                            <TabsContent value="extracted" className="p-6 m-0">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Client Name</span>
                                        <p className="text-sm font-medium">{call.extracted.patient_name || "Unknown"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Reason</span>
                                        <p className="text-sm font-medium">{call.extracted.reason}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Provider</span>
                                        <p className="text-sm font-medium">{call.extracted.provider || "General"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Requested Time</span>
                                        <p className="text-sm font-medium">{call.extracted.requested_date_time || "N/A"}</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="tools" className="p-6 m-0">
                                <div className="space-y-4">
                                    {call.tool_calls.map((tool, i) => (
                                        <div key={i} className="p-4 border rounded-lg bg-muted/10 space-y-2 border-border/80">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[10px] font-mono shadow-none">{tool.tool_name}</Badge>
                                                <span className="text-[10px] text-muted-foreground font-mono">{tool.ts}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Payload</span>
                                                    <pre className="text-[10px] bg-background p-2 rounded border border-border/50 text-muted-foreground overflow-x-auto">
                                                        {tool.payload_preview}
                                                    </pre>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Result</span>
                                                    <pre className="text-[10px] bg-background p-2 rounded border border-border/50 text-muted-foreground overflow-x-auto">
                                                        {tool.result_preview}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card className="border-border shadow-none overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call Info</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-border pt-0">
                            <div className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="text-xs">Duration</span>
                                </div>
                                <span className="text-xs font-medium font-mono">{call.minutes}m {call.duration_sec % 60}s</span>
                            </div>
                            <div className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    <span className="text-xs">Est. Cost</span>
                                </div>
                                <span className="text-xs font-medium font-mono">${call.cost_usd.toFixed(2)}</span>
                            </div>
                            <div className="py-4 flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Outcome</span>
                                <p className="text-xs font-semibold text-foreground">{call.outcome}</p>
                            </div>
                            <div className="py-4 flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Flags</span>
                                <div className="flex gap-2">
                                    {call.flags.map(f => (
                                        <Badge key={f} variant={f === 'ok' ? 'success' : 'warning'} className="text-[10px] shadow-none">{f}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-none overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviewer Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <textarea
                                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Add internal notes about this call..."
                            />
                            <Button className="w-full text-xs h-9 font-semibold">Update Notes</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
