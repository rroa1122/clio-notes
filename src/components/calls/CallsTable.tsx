import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import { MOCK_CALLS, type CallOutcome } from '../../data';

export const CallsTable: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'ALL'>('ALL');

    const filteredCalls = MOCK_CALLS.filter(call => {
        const matchesSearch =
            call.caller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            call.caller_phone.includes(searchTerm) ||
            call.extracted_fields.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOutcome = outcomeFilter === 'ALL' || call.outcome === outcomeFilter;

        return matchesSearch && matchesOutcome;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const getBadgeClass = (outcome: CallOutcome) => {
        switch (outcome) {
            case 'BOOKED': return 'badge-success';
            case 'ESCALATED': return 'badge-warning';
            case 'ERROR': return 'badge-danger';
            case 'FAQ': return 'badge-neutral'; // Using neutral for FAQ as it's informational
            default: return 'badge-neutral';
        }
    };

    return (
        <div className="card">
            <div className="calls-toolbar">
                <div className="search-wrapper">
                    <Search size={18} className="search-icon-small" />
                    <input
                        type="text"
                        placeholder="Search caller name or phone..."
                        className="table-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-wrapper">
                    <Filter size={18} className="text-secondary" />
                    <select
                        className="filter-select"
                        value={outcomeFilter}
                        onChange={(e) => setOutcomeFilter(e.target.value as CallOutcome | 'ALL')}
                    >
                        <option value="ALL">All Outcomes</option>
                        <option value="BOOKED">Booked</option>
                        <option value="RESCHEDULED">Rescheduled</option>
                        <option value="CANCELED">Canceled</option>
                        <option value="FAQ">FAQ</option>
                        <option value="ESCALATED">Escalated</option>
                        <option value="ERROR">Error</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-secondary border-b border-border">
                            <th className="pb-3 pl-4 font-medium">Time</th>
                            <th className="pb-3 font-medium">Caller</th>
                            <th className="pb-3 font-medium">Outcome</th>
                            <th className="pb-3 font-medium">Provider</th>
                            <th className="pb-3 font-medium">Confidence</th>
                            <th className="pb-3 font-medium">Duration</th>
                            <th className="pb-3 pr-4 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCalls.map(call => (
                            <tr
                                key={call.call_id}
                                className="hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                            >
                                <td className="py-3 pl-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-xs text-secondary">
                                            {new Date(call.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{call.caller_name}</span>
                                        <span className="text-xs text-secondary">{call.caller_phone}</span>
                                    </div>
                                </td>
                                <td className="py-3">
                                    <span className={`badge ${getBadgeClass(call.outcome)}`}>
                                        {call.outcome}
                                    </span>
                                </td>
                                <td className="py-3 text-secondary">
                                    {call.requested_provider || '-'}
                                </td>
                                <td className="py-3">
                                    <span className={`text-xs font-medium ${call.confidence === 'High' ? 'text-success' :
                                        call.confidence === 'Med' ? 'text-warning' : 'text-danger'
                                        }`}>
                                        {call.confidence}
                                    </span>
                                </td>
                                <td className="py-3 text-secondary">
                                    {Math.floor(call.duration_sec / 60)}m {call.duration_sec % 60}s
                                </td>
                                <td className="py-3 pr-4 text-right">
                                    <button
                                        className="btn-icon"
                                        onClick={() => navigate(`/calls/${call.call_id}`)}
                                        title="View Details"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredCalls.length === 0 && (
                    <div className="p-8 text-center text-secondary">
                        No calls found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
};
