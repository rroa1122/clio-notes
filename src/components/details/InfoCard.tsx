import React from 'react';

interface InfoCardProps {
    title: string;
    data: Record<string, string | undefined>;
    icon?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, data, icon }) => {
    return (
        <div className="card mb-6">
            <h3 className="card-title flex items-center gap-2">
                {icon}
                {title}
            </h3>
            <div className="info-grid">
                {Object.entries(data).map(([key, value]) => (
                    value ? (
                        <div key={key} className="info-item">
                            <span className="info-label">{key.replace(/_/g, ' ')}</span>
                            <span className="info-value">{value}</span>
                        </div>
                    ) : null
                ))}
                {Object.keys(data).length === 0 && (
                    <div className="text-secondary text-sm italic">No data available</div>
                )}
            </div>
        </div>
    );
};
