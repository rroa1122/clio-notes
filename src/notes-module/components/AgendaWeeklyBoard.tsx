import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Search, User, CalendarPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { cn } from '../../lib/utils';
import { TiltCard } from '../../components/ui/tilt-card';
import type { Note } from '../lib/storage';

interface AgendaWeeklyBoardProps {
  notes: Note[];
  onNewNoteForDate: (date: Date, hourStr?: string) => void;
  onSelectNote: (note: Note) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const QUICK_HOURS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
  '04:00 PM', '05:00 PM', '06:00 PM'
];

const parseTimeMins = (timeStr: string) => {
    if (!timeStr) return 9999; 
    const cleanStart = timeStr.replace(/[^\d:A-Za-z]/g, '').trim();
    const match = cleanStart.match(/(\d+):?(\d+)?([ap]m)?/i);
    if (!match) return 0;
    let hv = parseInt(match[1]);
    let mv = parseInt(match[2] || '0');
    let p = (match[3] || '').toUpperCase();
    if (p === 'PM' && hv < 12) hv += 12;
    if (p === 'AM' && hv === 12) hv = 0;
    return (hv * 60) + mv;
};

import { TimeSpinner } from '../../components/ui/time-spinner';

export function AgendaWeeklyBoard({ notes, onNewNoteForDate, onSelectNote, searchQuery = '', onSearchChange }: AgendaWeeklyBoardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Track open popovers by date to close them when clicked
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
              setIsSearchOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique patient names from notes for the dropdown
  const uniquePatients = Array.from(
      new Set(notes.map((n: any) => n.meta?.patientName || n.patient?.full_name).filter(Boolean))
  ).filter((name: any) => name.toLowerCase().includes(searchQuery.toLowerCase()));

  const previousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const startDate = startOfWeek(currentDate);
  const endDate = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getNoteDate = (note: any) => {
    const rawDate = note.meta?.visitDate || note.appointment?.date_of_service || note.createdAt || note.created_at;
    if (!rawDate) return null;
    try {
      if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = rawDate.split('-');
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const notesByDate = notes.reduce((acc, note) => {
    const d = getNoteDate(note);
    if (!d) return acc;
    const dateStr = format(d, 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  return (
    <div className="flex flex-col overflow-hidden h-[100%] w-full">
      <div className="flex flex-col flex-1 bg-white rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-200/60 overflow-hidden relative">
        
        {/* Top Bar Navigation */}
        <div className="flex flex-none items-end justify-between gap-6 px-8 py-8 bg-white z-20 shrink-0">
            {/* Nav Left - Date Controls */}
            <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Agenda Timeline</span>
                 <div className="flex items-center gap-4 border border-slate-200/80 rounded-[1.5rem] p-2 h-[60px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                     <Button variant="outline" className="rounded-xl h-full px-5 font-bold bg-slate-50 border-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all" onClick={goToToday}>
                         TODAY
                     </Button>
                     <div className="text-[15px] font-medium tracking-tight text-slate-800 px-2 lg:px-4">
                         {format(startDate, 'MMMM d')} - {format(endDate, 'MMMM d, yyyy')}
                     </div>
                     <div className="flex items-center gap-0.5 bg-slate-50/80 p-1 rounded-xl h-full">
                         <Button variant="ghost" size="icon" onClick={previousWeek} className="h-full w-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all bg-transparent">
                             <ChevronLeft className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={nextWeek} className="h-full w-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all bg-transparent">
                             <ChevronRight className="w-4 h-4" />
                         </Button>
                     </div>
                 </div>
            </div>

            {/* Nav Right - Search */}
             <div className="flex flex-col gap-2 flex-1 max-w-[500px]" ref={searchContainerRef}>
                 <div className="flex items-center justify-between px-1">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Search className="w-3 h-3"/> Filter Patients</span>
                     <Link to="/notes/new" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary/80 flex items-center gap-1 transition-colors">
                         <Plus className="w-3 h-3" />
                         New Acquisition
                     </Link>
                 </div>
                 <div className="flex items-center border border-slate-200/80 rounded-2xl px-4 h-[52px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                     <div className="text-slate-400 mr-3 pointer-events-none flex-shrink-0">
                         <Search className="w-4 h-4" />
                     </div>
                     <Input 
                        value={searchQuery}
                        onChange={(e) => {
                            onSearchChange?.(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        placeholder="Search patient registry..." 
                        className="flex-1 h-full bg-transparent border-0 border-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent focus:border-transparent shadow-none text-[14px] font-medium text-slate-700 placeholder:text-slate-400"
                     />
                     
                    {isSearchOpen && uniquePatients.length > 0 && searchQuery && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[100] bg-white rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.12)] border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                {uniquePatients.map((name, idx) => (
                                    <button
                                        key={idx}
                                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors rounded-xl group/btn"
                                        onClick={() => {
                                            onSearchChange?.(name);
                                            setIsSearchOpen(false);
                                        }}
                                    >
                                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
                                            <User size={14} />
                                        </div>
                                        <span className="text-[13px] font-medium text-slate-700">{name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Agenda Grid Compact View */}
        <div className="flex-1 overflow-x-auto custom-scrollbar relative px-6 pb-6 bg-white border-t border-slate-100/60">
            <div className="min-w-[1100px] min-h-[500px] h-full flex gap-3 pt-6">
                {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayNotes = notesByDate[dateStr] || [];
                    const isTodayDate = isToday(day);

                    // Sort notes chronologically within the day
                    dayNotes.sort((a, b) => {
                        const tA = (a as any).encounter?.time_in || (a as any).appointment?.start_time || '';
                        const tB = (b as any).encounter?.time_in || (b as any).appointment?.start_time || '';
                        return parseTimeMins(tA) - parseTimeMins(tB);
                    });

                    return (
                        <div key={dateStr} className={cn("flex-1 flex flex-col min-h-full transition-colors relative group/col rounded-[1.5rem] border overflow-hidden", isTodayDate ? "bg-white border-primary/20 shadow-[0_4px_24px_-8px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/10" : "bg-slate-50/80 border-slate-200/60 ")}>
                            {/* Day Header */}
                            <div className={cn("py-4 px-4 text-center border-b flex flex-col items-center justify-center gap-1 transition-colors", isTodayDate ? "bg-primary/5 border-primary/10" : "bg-transparent border-slate-200/50")}>
                                <span className={cn("text-[10px] font-bold tracking-widest uppercase", isTodayDate ? "text-primary" : "text-slate-400")}>
                                    {format(day, 'EEEE')}
                                </span>
                                <div className="flex items-center gap-1.5 flex-col mt-0.5">
                                    <span className={cn("text-[28px] font-medium tracking-tight leading-none relative z-10", isTodayDate ? "text-primary" : "text-slate-700 font-normal")}>
                                        {format(day, 'd')}
                                    </span>
                                    {isTodayDate && <div className="w-1 h-1 bg-primary rounded-full mt-0.5 shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />}
                                </div>
                            </div>
                            
                            {/* Events Container */}
                            <div className="flex-1 p-2.5 flex flex-col gap-2.5 relative pb-6 h-full overflow-y-auto custom-scrollbar">
                                {dayNotes.map((note: any, i) => {
                                    const title = note.meta?.title || note.encounter?.type || 'Session';
                                    const pName = note.meta?.patientName || note.patient?.full_name || 'Anonymous';
                                    
                                    // Formatear tiempos para que ocupen menos
                                    const formatTime = (t: string) => t.replace(':00', '').replace(' AM', 'am').replace(' PM', 'pm');
                                    const rawStart = note.encounter?.time_in || note.appointment?.start_time || '';
                                    const rawEnd = note.encounter?.time_out || note.appointment?.end_time || '';
                                    const start = rawStart ? formatTime(rawStart) : '';
                                    const end = rawEnd ? formatTime(rawEnd) : '';
                                    
                                    const rawD = note.encounter?.duration_minutes || note.encounter?.duration;
                                    const timeStr = start ? (end ? `${start} - ${end}` : start) : (rawD ? `${rawD} mins` : 'Unscheduled');
                                    
                                    const isSigned = note.signature || (note as any).sign_off?.status === 'signed';

                                    return (
                                        <TiltCard intensity={6} scale={1.01}>
                                        <div 
                                            key={note.id || i}
                                            onClick={() => onSelectNote(note)}
                                            className={cn(
                                                "relative overflow-hidden rounded-2xl p-3 bg-white border border-slate-200/70 transition-all duration-300 cursor-pointer group/card",
                                                "shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]",
                                                "hover:shadow-[0_12px_24px_-10px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-[2px] hover:border-primary/30 hover:z-10",
                                                !isSigned && "bg-gradient-to-br from-white to-amber-50/10"
                                            )}
                                        >
                                            
                                            <div className="flex flex-col gap-1 relative z-10 w-full min-w-0">
                                                {/* Head: Time & Status Dot */}
                                                <div className="flex items-start justify-between w-full gap-2">
                                                    <span 
                                                        className={cn(
                                                            "font-semibold text-[10px] tracking-tight flex items-center gap-1.5 min-w-0",
                                                            start ? "text-slate-400" : "text-slate-300"
                                                        )}
                                                        title={start ? (end ? `${rawStart} - ${rawEnd}` : rawStart) : ''}
                                                    >
                                                        {start && <Clock className="w-3 h-3 opacity-60 shrink-0" />}
                                                        <span className="truncate">{timeStr}</span>
                                                    </span>
                                                    <span 
                                                        className="relative flex h-2 w-2 shrink-0"
                                                        title={isSigned ? "Signed" : "Draft"}
                                                    >
                                                        {!isSigned && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                                                        <span className={cn("relative inline-flex rounded-full h-2 w-2", isSigned ? "bg-emerald-500" : "bg-amber-500")}></span>
                                                    </span>
                                                </div>
                                                
                                                {/* Body: Patient Name */}
                                                <div className="min-w-0">
                                                    <h3 
                                                        className="font-medium text-slate-700 text-[12px] tracking-tight leading-tight group-hover/card:text-primary transition-colors truncate"
                                                        title={pName}
                                                    >
                                                        {pName}
                                                    </h3>
                                                </div>
                                            </div>
                                            
                                            {/* Subtle Decorative Gradient background on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                        </div>
                                        </TiltCard>
                                    )
                                })}

                                {/* ADD NOTE POPOVER BUTTON */}
                                <div className="mt-auto pt-4 relative flex justify-center">
                                    <Popover open={openPopoverId === dateStr} onOpenChange={(open) => setOpenPopoverId(open ? dateStr : null)}>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 gap-1.5 h-8 px-4 shadow-none font-semibold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                                            >
                                                <Plus className="w-3 h-3 stroke-[3]" />
                                                New Session
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 bg-white/70 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                                            <div className="flex flex-col items-center">
                                                <div className="w-full pt-8 pb-4 text-center">
                                                    <span className="font-medium tracking-tight text-slate-800 text-[18px]">Select Time</span>
                                                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1 opacity-80">{format(day, 'MMMM d, yyyy')}</div>
                                                </div>
                                                
                                                <div className="px-6 pb-6 w-full">
                                                    <TimeSpinner 
                                                        onConfirm={(timeStr) => {
                                                            setOpenPopoverId(null);
                                                            onNewNoteForDate(day, timeStr);
                                                        }} 
                                                    />
                                                </div>
                                                
                                                <div className="w-full pb-4 flex justify-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        className="text-slate-400 hover:text-slate-600 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                                        onClick={() => {
                                                            setOpenPopoverId(null);
                                                            onNewNoteForDate(day);
                                                        }}
                                                    >
                                                       Skip Time Selection
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      </div>
    </div>
  )

}
