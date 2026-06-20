import React from 'react';

interface DataTableProps {
    headers: string[];
    rows: Array<Record<string, any>>;
    emptyMessage?: string;
}

const DataTable: React.FC<DataTableProps> = ({ headers, rows, emptyMessage = "No records found" }) => {
    if (!rows || rows.length === 0) {
        return <div className="p-4 text-center text-slate-400 italic text-sm border border-dashed rounded-lg">{emptyMessage}</div>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        {headers.map((header) => (
                            <th key={header} className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-[11px]">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            {headers.map((header) => {
                                const key = header.toLowerCase().replace(/ /g, '_');
                                return (
                                    <td key={header} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                        {row[key] || row[header.toLowerCase()] || <span className="text-slate-300 dark:text-slate-700">—</span>}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
