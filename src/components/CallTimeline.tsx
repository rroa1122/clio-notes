import type { CallTimelineEvent } from '../data/mockData';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Phone, BrainCircuit, CalendarCheck, User } from 'lucide-react';

interface CallTimelineProps {
    events: CallTimelineEvent[];
}

export function CallTimeline({ events }: CallTimelineProps) {
    const getIcon = (type: CallTimelineEvent['type']) => {
        switch (type) {
            case 'start': return <Phone size={14} className="text-blue-500" />;
            case 'intent_detect': return <BrainCircuit size={14} className="text-purple-500" />;
            case 'availability_check': return <CalendarCheck size={14} className="text-teal-500" />;
            case 'booking': return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'escalation': return <User size={14} className="text-amber-500" />;
            case 'end': return <Circle size={14} className="text-slate-400" />;
            default: return <Circle size={14} className="text-slate-400" />;
        }
    };

    const getStatusColor = (status: CallTimelineEvent['status']) => {
        switch (status) {
            case 'success': return 'bg-emerald-50 border-emerald-100';
            case 'warning': return 'bg-amber-50 border-amber-100';
            case 'error': return 'bg-red-50 border-red-100';
            default: return 'bg-white border-slate-100';
        }
    };

    return (
        <div className="card">
            <h3 className="font-semibold text-lg mb-4 text-slate-800">Call Timeline</h3>
            <div className="relative pl-2">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

                <div className="space-y-4">
                    {(events || []).map((event) => (
                        <div key={event.id} className="relative flex gap-4 items-start">
                            <div className="relative z-10 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm mt-0.5">
                                {getIcon(event.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-sm font-semibold text-slate-700 capitalize">{event.type.replace('_', ' ')}</span>
                                    <span className="text-xs text-slate-400 font-mono">
                                        {(() => {
                                            try {
                                                return format(new Date(event.timestamp), 'h:mm:ss a');
                                            } catch (e) {
                                                return '--:--';
                                            }
                                        })()}
                                    </span>
                                </div>
                                <div className={`text-sm text-slate-600 p-2 rounded-md border ${getStatusColor(event.status)}`}>
                                    {event.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
