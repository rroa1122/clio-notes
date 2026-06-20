import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CALLS, type CallOutcome } from '../../data';

export const RecentCalls: React.FC = () => {
    const navigate = useNavigate();
    const recentCalls = [...MOCK_CALLS].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 8);

    const getBadgeClass = (outcome: CallOutcome) => {
        switch (outcome) {
            case 'BOOKED': return 'badge-success';
            case 'ESCALATED': return 'badge-warning';
            case 'ERROR': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">Recent Calls</h3>
                <button className="btn-link" onClick={() => navigate('/calls')}>View All</button>
            </div>

            <div className="table-container">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-secondary border-b border-border">
                            <th className="pb-2 font-medium">Time</th>
                            <th className="pb-2 font-medium">Caller</th>
                            <th className="pb-2 font-medium">Outcome</th>
                            <th className="pb-2 font-medium">Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentCalls.map(call => (
                            <tr
                                key={call.call_id}
                                className="hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                onClick={() => navigate(`/calls/${call.call_id}`)}
                            >
                                <td className="py-3">
                                    {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3 font-medium">{call.caller_name}</td>
                                <td className="py-3">
                                    <span className={`badge ${getBadgeClass(call.outcome)}`}>
                                        {call.outcome}
                                    </span>
                                </td>
                                <td className="py-3 text-secondary">
                                    {Math.floor(call.duration_sec / 60)}m {call.duration_sec % 60}s
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
