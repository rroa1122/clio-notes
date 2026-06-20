import { Filter, ChevronDown, Download } from 'lucide-react';

export function CallsFilter() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Filter size={16} />
                    All Outcomes
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
                <div className="h-6 w-px bg-slate-200"></div>
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Date Range
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    More Filters
                    <ChevronDown size={14} className="text-slate-400" />
                </button>
            </div>

            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Download size={16} />
                    Export CSV
                </button>
            </div>
        </div>
    );
}
