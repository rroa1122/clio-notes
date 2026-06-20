import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCalls, type Call } from '../data/mockData';
import { format } from 'date-fns';
import { CheckCircle, ArrowUpRight, XCircle, MoreHorizontal, User, Sparkles } from 'lucide-react';

interface CallsTableProps {
    filterStatus?: string;
    onSelectionChange?: (selectedIds: string[]) => void;
}

export function CallsTable({ filterStatus, onSelectionChange }: CallsTableProps) {
    const navigate = useNavigate();
    const [calls, setCalls] = useState<Call[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        getCalls().then((data) => {
            if (filterStatus) {
                // rough implementation of filtering for now
                setCalls(data); // In real app, we'd filter here or in the API
            } else {
                setCalls(data);
            }
        });
    }, [filterStatus]);

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
        onSelectionChange?.(Array.from(newSelection));
    };

    const toggleAll = () => {
        if (selectedIds.size === calls.length) {
            setSelectedIds(new Set());
            onSelectionChange?.([]);
        } else {
            const allIds = new Set(calls.map(c => c.id));
            setSelectedIds(allIds);
            onSelectionChange?.(Array.from(allIds));
        }
    };

    const getOutcomeBadge = (outcome: Call['outcome']) => {
        switch (outcome) {
            case 'appointment_booked':
                return <span className="badge badge-success gap-1"><CheckCircle size={12} /> Booked</span>;
            case 'escalated_human':
                return <span className="badge badge-warning gap-1"><ArrowUpRight size={12} /> Escalated</span>;
            case 'inquiry_answered':
                return <span className="badge badge-neutral gap-1"><Sparkles size={12} /> Answered</span>;
            case 'spam':
                return <span className="badge badge-error gap-1"><XCircle size={12} /> Spam</span>;
            default:
                return <span className="badge badge-neutral">{outcome.replace('_', ' ')}</span>;
        }
    };

    return (
        <div className="card p-0 overflow-hidden border border-slate-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="w-10 px-4 py-3">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                checked={calls.length > 0 && selectedIds.size === calls.length}
                                onChange={toggleAll}
                            />
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Caller</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Outcome</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Date & Time</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Duration</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Confidence</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Tags</th>
                        <th className="px-4 py-3 font-semibold text-slate-500 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {calls.map((call) => (
                        <tr
                            key={call.id}
                            onClick={() => navigate(`/calls/${call.id}`)}
                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedIds.has(call.id) ? 'bg-teal-50/30' : ''}`}
                        >
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    checked={selectedIds.has(call.id)}
                                    onChange={() => toggleSelection(call.id)}
                                />
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <User size={14} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{call.patientName || 'Unknown Caller'}</div>
                                        <div className="text-xs text-slate-500 font-mono">{call.patientPhone}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                {getOutcomeBadge(call.outcome)}
                            </td>
                            <td className="px-4 py-4 text-slate-500">
                                {format(new Date(call.timestamp), 'MMM d, h:mm a')}
                            </td>
                            <td className="px-4 py-4 text-slate-500">
                                {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${call.confidenceScore > 80 ? "bg-emerald-500" :
                                                call.confidenceScore > 60 ? "bg-amber-500" : "bg-red-500"
                                                }`}
                                            style={{ width: `${call.confidenceScore}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500">{call.confidenceScore}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1">
                                    {call.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs border border-slate-200">
                                            {tag}
                                        </span>
                                    ))}
                                    {call.tags.length > 2 && (
                                        <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full text-xs border border-slate-200">
                                            +{call.tags.length - 2}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <button className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                                    <MoreHorizontal size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
