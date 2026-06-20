
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useCalls } from '../context/CallsContext';

export function OutcomeChart() {
    const { calls } = useCalls();

    const distribution = [
        { name: 'Engaged', value: calls.filter(c => c.outcome === 'appointment_booked').length, color: '#6366f1' },
        { name: 'Redirected', value: calls.filter(c => c.outcome === 'inquiry_answered').length, color: '#a855f7' },
        { name: 'Escalated', value: calls.filter(c => c.outcome === 'escalated_human').length, color: '#f59e0b' },
        { name: 'Filtered', value: calls.filter(c => c.outcome === 'spam').length, color: '#94a3b8' },
    ].filter(d => d.value > 0);

    if (calls.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/40 space-y-2">
                <div className="size-1 w-full bg-border/20 rounded-full animate-pulse"></div>
                <p className="text-[9px] font-black uppercase tracking-widest italic">Operational Silence</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={distribution}
                        cx="50%"
                        cy="45%"
                        innerRadius="65%"
                        outerRadius="90%"
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        layout="horizontal"
                        iconType="circle"
                        iconSize={5}
                        wrapperStyle={{
                            color: 'hsl(var(--muted-foreground))',
                            fontSize: '8px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            paddingTop: '20px'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
