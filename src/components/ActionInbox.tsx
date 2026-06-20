import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, UserX, PhoneMissed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCalls, type Call } from '../data/mockData';

export function ActionInbox() {
    const [actionItems, setActionItems] = useState<Call[]>([]);

    useEffect(() => {
        getCalls().then(calls => {
            const filtered = calls.filter(c => c.status === 'action_required').slice(0, 5);
            setActionItems(filtered);
        });
    }, []);

    const getIcon = (item: Call) => {
        if (item.outcome === 'escalated_human') return PhoneMissed;
        if (item.confidenceScore < 70) return UserX;
        return AlertCircle;
    };

    const getColor = (item: Call) => {
        if (item.outcome === 'escalated_human') return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    const getTitle = (item: Call) => {
        if (item.outcome === 'escalated_human') return 'Escalated Call';
        if (item.confidenceScore < 70) return 'Low Confidence Flag';
        return 'Review Needed';
    };

    return (
        <div className="card flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-800">Action Inbox</h3>
                {actionItems.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{actionItems.length} New</span>
                )}
            </div>

            <div className="flex-1 space-y-3">
                {actionItems.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-8">
                        No items need attention. Great job!
                    </div>
                ) : (
                    actionItems.map((item) => {
                        const Icon = getIcon(item);
                        return (
                            <Link key={item.id} to={`/calls/${item.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className={`p-2 rounded-full ${getColor(item)}`}>
                                    <Icon size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-medium text-slate-900 truncate">{getTitle(item)}</div>
                                    <div className="text-xs text-slate-500 truncate">{item.flagReason || item.summary || 'Caller requested assistance'}</div>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
                            </Link>
                        );
                    })
                )}
            </div>

            <Link to="/calls?filter=action_required" className="mt-4 text-sm text-teal-700 font-medium hover:text-teal-800 text-center block">
                View all items
            </Link>
        </div>
    );
}
