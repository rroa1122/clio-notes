import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MOCK_CALLS, type CallOutcome } from '../../data';

export const OutcomeChart: React.FC = () => {
    const data = MOCK_CALLS.reduce((acc, call) => {
        const existing = acc.find(d => d.name === call.outcome);
        if (existing) {
            existing.value++;
        } else {
            acc.push({ name: call.outcome, value: 1 });
        }
        return acc;
    }, [] as { name: CallOutcome; value: number }[]);

    const COLORS: Record<string, string> = {
        BOOKED: '#10b981', // success
        RESCHEDULED: '#3b82f6', // primary
        CANCELED: '#9ca3af', // gray
        FAQ: '#8b5cf6', // purple
        ESCALATED: '#f59e0b', // warning
        ERROR: '#ef4444', // danger
    };

    return (
        <div className="card h-full">
            <h3 className="card-title">Call Outcomes</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#ccc'} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
