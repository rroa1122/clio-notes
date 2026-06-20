import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { MOCK_CALLS } from '../../data';

export const ActionInbox: React.FC = () => {
    const navigate = useNavigate();
    // Filter for calls that need action: Escalated, Error, or Low Confidence
    const actionItems = MOCK_CALLS.filter(
        c => !c.is_resolved && (c.outcome === 'ESCALATED' || c.outcome === 'ERROR' || c.confidence === 'Low')
    ).slice(0, 5);

    return (
        <div className="card h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="card-title flex items-center gap-2">
                    <AlertCircle size={20} className="text-warning" style={{ color: 'var(--color-warning)' }} />
                    Action Inbox
                </h3>
                <span className="badge badge-warning">{actionItems.length} Pending</span>
            </div>

            <div className="action-list">
                {actionItems.length === 0 ? (
                    <div className="empty-state">No items needing attention. Great job!</div>
                ) : (
                    actionItems.map(item => (
                        <div key={item.call_id} className="action-item" onClick={() => navigate(`/calls/${item.call_id}`)}>
                            <div className="action-info">
                                <div className="action-title">
                                    {item.outcome === 'ESCALATED' ? 'Escalation Request' :
                                        item.outcome === 'ERROR' ? 'System Error' : 'Low Confidence'}
                                </div>
                                <div className="action-meta">
                                    {item.caller_name} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-secondary" />
                        </div>
                    ))
                )}
            </div>

            <button className="btn-link mt-auto" onClick={() => navigate('/calls?filter=action')}>
                View All Actions
            </button>
        </div>
    );
};
