import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, CheckCircle2, AlertCircle, Share2, MoreHorizontal, Tag } from 'lucide-react';
import { useCalls } from '../context/CallsContext';
import { AudioPlayer } from '../components/AudioPlayer';
import { Transcript } from '../components/Transcript';
import { CallTimeline } from '../components/CallTimeline';
import { ActionPanel } from '../components/ActionPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';

export function CallDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { calls, loading } = useCalls();
    const call = calls.find(c => c.id === id) || null;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    if (!call) return (
        <div className="container max-w-7xl mx-auto py-12 px-4 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Call not found</h2>
            <p className="text-slate-500 mb-8">The call record you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/calls')} variant="outline" className="rounded-xl px-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Calls
            </Button>
        </div>
    );

    return (
        <div className="container max-w-7xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/calls')}
                        className="group flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-all"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Registry
                    </button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{call.patientName}</h1>
                        <Badge variant={call.status === 'resolved' ? 'success' : 'warning'} className="h-6 px-3 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            {call.status}
                        </Badge>
                        {call.extractedData?.urgency && call.extractedData.urgency !== 'low' && (
                            <Badge variant={call.extractedData.urgency === 'emergency' || call.extractedData.urgency === 'high' ? 'destructive' : 'secondary'} className="h-6 px-3 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                {call.extractedData.urgency}
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(call.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <Separator orientation="vertical" className="hidden md:block h-4 bg-slate-200" />
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(call.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <Separator orientation="vertical" className="hidden md:block h-4 bg-slate-200" />
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-tight bg-slate-100/50 px-2 py-0.5 rounded-md border border-slate-200/50">
                            ID: {call.id.slice(0, 8)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-10 rounded-xl px-4 font-bold text-xs uppercase tracking-widest bg-white shadow-soft">
                        <Share2 className="mr-2 h-3.5 w-3.5" />
                        Share
                    </Button>
                    <Button className="h-10 rounded-xl px-6 font-bold text-xs uppercase tracking-widest shadow-md">
                        {call.status === 'resolved' ? (
                            <>
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                Reopen Case
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                Mark Resolved
                            </>
                        )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400">
                        <MoreHorizontal size={20} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Recording & Transcript */}
                <div className="lg:col-span-2 space-y-8">
                    <AudioPlayer />
                    <Transcript segments={call.transcript} callerName={call.patientName} />
                </div>

                {/* Right Column: Insights & Timeline */}
                <div className="space-y-8">
                    {/* Summary Card */}
                    <Card className="rounded-card border-border/60 shadow-soft overflow-hidden">
                        <CardHeader className="bg-secondary/30 pb-4 border-b border-border/40">
                            <CardTitle className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Call Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-slate-600 font-medium">
                                    {call.summary}
                                </p>
                            </div>

                            <Separator className="bg-slate-100" />

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Extracted Information</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                                        <span className="text-xs font-semibold text-slate-500">Reason</span>
                                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 shadow-sm">{call.outcome.replace('_', ' ')}</Badge>
                                    </div>
                                    {call.extractedData?.requestedDate && (
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                                            <span className="text-xs font-semibold text-slate-500">Requested Date</span>
                                            <span className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">{call.extractedData.requestedDate}</span>
                                        </div>
                                    )}
                                    {call.extractedData?.missingInformation && call.extractedData.missingInformation.length > 0 && (
                                        <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                                            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                                                <AlertCircle size={14} /> Missing Information
                                            </span>
                                            <ul className="text-xs text-amber-900 list-disc pl-4 space-y-1">
                                                {call.extractedData.missingInformation.map((info, idx) => (
                                                    <li key={idx}>{info}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {call.extractedData?.recommendedAction && (
                                        <div className="flex flex-col gap-2 p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                                            <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                                <CheckCircle2 size={14} /> Recommended Next Action
                                            </span>
                                            <span className="text-xs font-medium text-blue-900">{call.extractedData.recommendedAction}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                                    <Tag size={16} className="text-slate-400 mt-1" />
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Tags</div>
                                        <div className="flex flex-wrap gap-1">
                                            {(call.tags || []).map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                                                    {tag}
                                                </span>
                                            ))}
                                            <button className="text-xs text-teal-600 hover:underline px-1">+ Add</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <ActionPanel />
                    <CallTimeline events={call.timeline} />
                </div>
            </div>
        </div>
    );
}
