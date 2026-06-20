import React from 'react';
import { Phone, CheckCircle, Calendar, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { MOCK_CALLS } from '../../data';

export const KPIGrid: React.FC = () => {
    const totalCalls = MOCK_CALLS.length;
    const resolvedCalls = MOCK_CALLS.filter(c => c.is_resolved).length;
    const bookedAppts = MOCK_CALLS.filter(c => c.outcome === 'BOOKED').length;
    const escalations = MOCK_CALLS.filter(c => c.outcome === 'ESCALATED').length;
    const lowConfidence = MOCK_CALLS.filter(c => c.confidence === 'Low').length;
    const avgDuration = Math.round(MOCK_CALLS.reduce((acc: number, c) => acc + c.duration_sec, 0) / totalCalls);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s}s`;
    };

    const metrics = [
        { label: 'Total Calls', value: totalCalls, icon: Phone, color: 'text-primary' },
        { label: 'Resolved by CLIO', value: `${Math.round((resolvedCalls / totalCalls) * 100)}%`, icon: CheckCircle, color: 'text-success' },
        { label: 'Appointments', value: bookedAppts, icon: Calendar, color: 'text-primary' },
        { label: 'Escalations', value: escalations, icon: AlertTriangle, color: 'text-warning' },
        { label: 'Low Confidence', value: lowConfidence, icon: HelpCircle, color: 'text-danger' },
        { label: 'Avg Duration', value: formatDuration(avgDuration), icon: Clock, color: 'text-secondary' },
    ];

    return (
        <div className="kpi-grid">
            {metrics.map((m, i) => (
                <div key={i} className="card kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">{m.label}</span>
                        <m.icon size={20} className={m.color} style={{ color: `var(--color-${m.color.split('-')[1]})` }} />
                    </div>
                    <div className="kpi-value">{m.value}</div>
                </div>
            ))}
        </div>
    );
};
