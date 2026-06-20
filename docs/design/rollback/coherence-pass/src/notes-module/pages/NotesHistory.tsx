
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Note } from '../lib/storage';
import { Search, Plus, Filter, FileText, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/page-header';
import { EmptyState } from '../../components/ui/empty-state';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

const NotesHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      const data = await storage.getNotes();
      setNotes(data);
      setIsLoading(false);
    };
    fetchNotes();
  }, []);

  const filteredNotes = notes.filter((note: Note) => {
    const pName = note.meta?.patientName || (note as any).patient?.full_name || 'Anonymous';
    const mrn = note.meta?.mrn || (note as any).patient?.account_number || '';
    const transcript = note.transcript || (note as any).hpi?.narrative || '';
    const query = searchQuery.toLowerCase();

    return pName.toLowerCase().includes(query) ||
      mrn.toLowerCase().includes(query) ||
      transcript.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Clinical Notes History"
        subtitle="Secure registry of all patient encounters, clinical documentation, and signed acquisitions."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl font-bold tracking-tight gap-2 h-10 border-slate-200/60 hover:bg-slate-50">
              <Filter className="h-4 w-4 text-slate-500" />
              Archived
            </Button>
            <Link to="/notes/new">
              <Button className="rounded-xl font-bold tracking-tight gap-2 h-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                New Acquisition
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="border border-slate-200/60 shadow-[0_18px_60px_rgba(15,23,42,0.10)] rounded-2xl overflow-hidden mb-12 bg-white">
        <CardHeader className="pb-6 pt-8 px-8 border-b border-slate-100/80 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Validated Registry</CardTitle>
              <CardDescription className="text-[13px] font-medium text-slate-500">
                Total documented assets: {notes.length}
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
              <Input
                type="text"
                placeholder="Filter by name, MRN or keywords..."
                className="pl-10 h-10 rounded-xl bg-white border-slate-200/60 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-[13px] font-medium placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-100">
                <TableHead className="px-8 py-4 font-bold uppercase tracking-widest text-[9px] text-slate-400 w-[180px]">Acquisition Date</TableHead>
                <TableHead className="px-4 py-4 font-bold uppercase tracking-widest text-[9px] text-slate-400">Patient Entity</TableHead>
                <TableHead className="px-4 py-4 font-bold uppercase tracking-widest text-[9px] text-slate-400">Medical Executive</TableHead>
                <TableHead className="px-4 py-4 font-bold uppercase tracking-widest text-[9px] text-slate-400">Validation</TableHead>
                <TableHead className="px-8 py-4 font-bold uppercase tracking-widest text-[9px] text-slate-400 text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="px-8 py-8 animate-pulse">
                      <div className="h-12 bg-muted rounded-2xl w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-8 py-12">
                    <EmptyState
                      icon={searchQuery ? Search : FileText}
                      title={searchQuery ? "No records found" : "Registry empty"}
                      description={searchQuery ? `We couldn't find any medical records matching "${searchQuery}".` : "No patient documentation has been initiated. Start your first session to begin."}
                      action={searchQuery ? {
                        label: "Reset Search",
                        onClick: () => setSearchQuery('')
                      } : {
                        label: "Start Acquisition",
                        onClick: () => { }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note: any) => {
                  const visitDate = note.meta?.visitDate || (note.appointment?.date_of_service) || (note as any).createdAt || note.created_at;
                  const patientName = note.meta?.patientName || note.patient?.full_name || 'Anonymous Patient';
                  const mrn = note.meta?.mrn || note.patient?.account_number || 'REG-HIST';
                  const provider = note.meta?.provider || note.provider?.provider_name || note.doctor_name || 'Clinical Staff';
                  const isSigned = note.signature || note.sign_off?.status === 'signed';

                  return (
                    <TableRow
                      key={note.id}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer border-b border-slate-50 last:border-0"
                      onClick={() => { }} // Handle navigation via Link wrap if needed or use navigate
                    >
                      <TableCell className="px-8 py-5">
                        <div className="text-[11px] text-slate-500 font-bold tabular-nums tracking-tight">
                          {visitDate ? new Date(visitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-5">
                        <div className="font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight pr-4 truncate max-w-[200px]">{patientName}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider uppercase">REF: {mrn}</div>
                      </TableCell>
                      <TableCell className="px-4 py-5 font-bold text-slate-600 text-[12px] tracking-tight">
                        {provider}
                      </TableCell>
                      <TableCell className="px-4 py-5">
                        <Badge variant={isSigned ? "default" : "outline"} className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-none ${isSigned ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {isSigned ? 'Authenticated' : 'Draft Protocol'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <Link to={`/notes/new?id=${note.id}`} state={{ fromHistory: true }}>
                          <Button variant="ghost" className="h-8 group-hover:bg-primary/5 text-primary/60 group-hover:text-primary font-bold tracking-tight text-[11px] gap-2 rounded-lg border border-transparent hover:border-primary/10">
                            Access Record
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotesHistory;
