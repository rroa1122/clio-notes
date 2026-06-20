import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Filter, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

export interface AgendaFilters {
  search: string;
  status: string;
  provider: string;
}

interface Props {
  filters: AgendaFilters;
  setFilters: (f: AgendaFilters) => void;
  onClear: () => void;
}

export function AgendaFilterPanel({ filters, setFilters, onClear }: Props) {
  return (
    <div className="flex flex-col h-full w-full bg-slate-50/30">
      <div className="px-6 h-[72px] border-b border-slate-100/80 sticky top-0 z-10 flex items-center justify-between bg-slate-50/30 shrink-0">
        <span className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2 uppercase">
          <Filter className="w-4 h-4 text-slate-400" />
          FILTERS
        </span>
        <Button variant="ghost" size="icon" onClick={onClear} className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Patient</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Search patient or MRN..." 
              className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus:border-primary/40 focus:ring-primary/10 text-xs font-semibold"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Status</Label>
          <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
             <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
               <SelectValue placeholder="All" />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-slate-200 shadow-xl">
               <SelectItem value="all" className="text-xs font-semibold">All</SelectItem>
               <SelectItem value="signed" className="text-xs font-semibold">Authenticated (Signed)</SelectItem>
               <SelectItem value="pending" className="text-xs font-semibold">Draft / Pending Sup</SelectItem>
             </SelectContent>
          </Select>
        </div>

        {/* Mock inputs to match the user's screenshot layout precisely */}
        <div className="space-y-3 opacity-60 pointer-events-none mt-8">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Format</Label>
          <Input placeholder="All" className="h-10 rounded-xl bg-slate-50/50 border-slate-200/50 text-xs italic" readOnly />
        </div>
        <div className="space-y-3 opacity-60 pointer-events-none">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Code</Label>
          <Input placeholder="Search code..." className="h-10 rounded-xl bg-slate-50/50 border-slate-200/50 text-xs italic" readOnly />
        </div>
        <div className="space-y-3 opacity-60 pointer-events-none">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Appointment Type</Label>
          <Input placeholder="All" className="h-10 rounded-xl bg-slate-50/50 border-slate-200/50 text-xs italic" readOnly />
        </div>
        <div className="space-y-3 opacity-60 pointer-events-none">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">TCM Service Type</Label>
          <Select defaultValue="all" disabled>
             <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-200/50 text-xs italic">
               <SelectValue placeholder="All" />
             </SelectTrigger>
             <SelectContent />
          </Select>
        </div>

      </div>
    </div>
  )
}
