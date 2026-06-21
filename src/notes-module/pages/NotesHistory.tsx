import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Note } from '../lib/storage';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgendaWeeklyBoard } from '../components/AgendaWeeklyBoard';

interface AgendaFilters {
    search: string;
    status: string;
    provider: string;
}

const NotesHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced filters state
  const [filters, setFilters] = useState<AgendaFilters>({
    search: '',
    status: 'all',
    provider: 'all'
  });

  const fetchNotes = async () => {
    if (authLoading || !user) return;
    setIsLoading(true);
    try {
      const data = await storage.getNotes();
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotes();
    }
  }, [user, authLoading]);

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      provider: 'all'
    });
  };

  const filteredNotes = notes.filter((note: Note) => {
    // 1. Search Filter
    const pName = note.meta?.patientName || (note as any).patient?.full_name || 'Anonymous';
    const mrn = note.meta?.mrn || (note as any).patient?.account_number || '';
    const transcript = note.transcript || (note as any).hpi?.narrative || '';
    const query = filters.search.toLowerCase();

    const matchesSearch = pName.toLowerCase().includes(query) ||
      mrn.toLowerCase().includes(query) ||
      transcript.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 2. Status Filter
    if (filters.status !== 'all') {
       const isSigned = note.signature || (note as any).sign_off?.status === 'signed';
       if (filters.status === 'signed' && !isSigned) return false;
       if (filters.status === 'pending' && isSigned) return false;
    }

    return true;
  });

  const handleNewNoteForDate = (date: Date, hourStr?: string) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    let url = `/notes/new?date=${y}-${m}-${d}`;
    if (hourStr) {
        url += `&time=${encodeURIComponent(hourStr)}`;
    }
    if (filters.search) {
        url += `&patientName=${encodeURIComponent(filters.search)}`;
    }
    navigate(url);
  };

  const handleSelectNote = (note: Note) => {
    // Navigate to note detail or edit screen
    navigate(`/notes/new?id=${note.id}`, { state: { fromHistory: true } });
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-4 pt-4 lg:pt-8 h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] lg:h-[calc(100vh-9rem)]">
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 h-full">
            <div className="flex flex-col items-center gap-4 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Caseload...</span>
            </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden mt-2 mb-4">
          <div className="flex-1 min-w-0 h-full overflow-hidden rounded-[2rem]">
             <AgendaWeeklyBoard 
               notes={filteredNotes}
               onNewNoteForDate={handleNewNoteForDate}
               onSelectNote={handleSelectNote}
               searchQuery={filters.search}
               onSearchChange={(query) => setFilters(prev => ({ ...prev, search: query }))}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesHistory;
