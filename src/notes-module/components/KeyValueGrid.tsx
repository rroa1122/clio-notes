import React from 'react';

interface KeyValueGridProps {
    data: Record<string, any>;
    columns?: number;
}

const KeyValueGrid: React.FC<KeyValueGridProps> = ({ data, columns = 2 }) => {
    const formatKey = (key: string) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (!data || typeof data !== 'object') return <p className="text-slate-400 italic text-sm">No data available</p>;

    const validEntries = Object.entries(data).filter(([_, value]) => value !== null && value !== undefined && value !== '');

    if (validEntries.length === 0) return <p className="text-slate-400 italic text-sm">No details recorded</p>;

    return (
        <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
            {validEntries.map(([key, value]) => (
                <div key={key} className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {formatKey(key)}
                    </label>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {value.map((item, idx) => (
                                    <span key={idx} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            String(value)
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KeyValueGrid;
