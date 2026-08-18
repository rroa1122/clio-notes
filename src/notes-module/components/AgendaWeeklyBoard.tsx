import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Search, User, CalendarPlus, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { cn } from '../../lib/utils';
import { TiltCard } from '../../components/ui/tilt-card';
import type { Note } from '../lib/storage';
import { getNoteServiceDate } from '../lib/clioUtils';

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
import { useLanguage } from '../../context/LanguageContext';

export function AgendaWeeklyBoard({ notes, onNewNoteForDate, onSelectNote, searchQuery = '', onSearchChange }: AgendaWeeklyBoardProps) {
  const { t, language } = useLanguage();

  const getInitialDate = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get('date');
      if (urlDate && urlDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = urlDate.split('-');
        const parsed = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        if (!isNaN(parsed.getTime())) return parsed;
      }
      const saved = sessionStorage.getItem('clio_agenda_active_date');
      if (saved && saved.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = saved.split('-');
        const parsed = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        if (!isNaN(parsed.getTime())) return parsed;
      }
    } catch {
      // ignore
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState<Date>(getInitialDate);
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate);
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

  const previousWeek = () => {
    const nextDate = subWeeks(currentDate, 1);
    setCurrentDate(nextDate);
    setSelectedDate(subWeeks(selectedDate, 1));
    sessionStorage.setItem('clio_agenda_active_date', format(nextDate, 'yyyy-MM-dd'));
  };
  
  const nextWeek = () => {
    const nextDate = addWeeks(currentDate, 1);
    setCurrentDate(nextDate);
    setSelectedDate(addWeeks(selectedDate, 1));
    sessionStorage.setItem('clio_agenda_active_date', format(nextDate, 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    sessionStorage.setItem('clio_agenda_active_date', format(today, 'yyyy-MM-dd'));
  };

  const startDate = startOfWeek(currentDate);
  const endDate = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getNoteDate = (note: any) => {
    return getNoteServiceDate(note);
  };

  const notesByDate = notes.reduce((acc, note) => {
    const d = getNoteDate(note);
    if (!d) return acc;
    const dateStr = format(d, 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  // Extract events for selected date on mobile
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayNotes = notesByDate[selectedDateStr] || [];
  selectedDayNotes.sort((a, b) => {
      const tA = (a as any).encounter?.time_in || (a as any).appointment?.start_time || '';
      const tB = (b as any).encounter?.time_in || (b as any).appointment?.start_time || '';
      return parseTimeMins(tA) - parseTimeMins(tB);
  });

  return (
    <div className="flex flex-col overflow-hidden h-[100%] w-full">
      <div className="flex flex-col flex-1 bg-transparent lg:bg-surface rounded-[2rem] shadow-none lg:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border-0 lg:border border-border/60 overflow-hidden relative">
        
        {/* Desktop Header */}
        <div className="hidden lg:flex flex-none items-center justify-between gap-4 px-5 py-3 xl:px-8 xl:py-4 bg-surface z-20 shrink-0">
             {/* Nav Left - Date Controls */}
             <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'es' ? "Línea de Tiempo de Agenda" : "Agenda Timeline"}</span>
                 <div className="flex items-center gap-2 border border-slate-200/50 dark:border-slate-800/50 rounded-full p-0.5 h-10 bg-slate-50/30 dark:bg-slate-950/10 shadow-sm">
                     <button 
                         onClick={goToToday}
                         className="rounded-full h-8 px-3.5 font-black text-[9px] tracking-wider bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:shadow-sm transition-all cursor-pointer"
                     >
                         {language === 'es' ? "HOY" : "TODAY"}
                     </button>
                     <div className="text-[11px] font-bold tracking-tight text-slate-750 dark:text-slate-300 px-1">
                         {format(startDate, language === 'es' ? "d 'de' MMMM" : 'MMMM d', { locale: language === 'es' ? es : undefined })} - {format(endDate, language === 'es' ? "d 'de' MMMM, yyyy" : 'MMMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                     </div>
                     <div className="flex items-center gap-0.5 bg-white/60 dark:bg-slate-900/60 p-0.5 rounded-full border border-slate-200/50 dark:border-slate-800/80 h-8 ml-auto">
                         <button 
                             onClick={previousWeek} 
                             className="h-7 w-7 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all bg-transparent border-0 cursor-pointer flex items-center justify-center"
                         >
                             <ChevronLeft className="w-3.5 h-3.5" />
                         </button>
                         <button 
                             onClick={nextWeek} 
                             className="h-7 w-7 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all bg-transparent border-0 cursor-pointer flex items-center justify-center"
                         >
                             <ChevronRight className="w-3.5 h-3.5" />
                         </button>
                     </div>
                 </div>
            </div>

            {/* Nav Right - Search */}
             <div className="flex flex-col gap-1 flex-1 max-w-[420px]" ref={searchContainerRef}>
                 <div className="flex items-center justify-between px-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><SlidersHorizontal className="w-3 h-3 text-slate-400" /> {language === 'es' ? "Filtrar Pacientes" : "Filter Patients"}</span>
                     <Link to="/notes/new" className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-500 flex items-center gap-1.5 transition-colors">
                         <Plus className="w-3 h-3" />
                         {language === 'es' ? "Nuevo Registro" : "New Acquisition"}
                     </Link>
                 </div>
                 <div className="flex items-center border border-slate-200/80 dark:border-slate-800/80 rounded-full px-4 h-10 bg-slate-50/50 dark:bg-slate-950/20 shadow-sm relative group hover:border-slate-350 dark:hover:border-slate-700 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
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
                         placeholder={t('record.search_patient_placeholder', 'Search patient registry...')} 
                         className="flex-1 h-full bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent focus:border-transparent shadow-none text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-350 dark:placeholder:text-slate-600"
                      />
                      
                     {isSearchOpen && uniquePatients.length > 0 && searchQuery && (
                         <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[100] bg-popover rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.12)] border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                 {uniquePatients.map((name, idx) => (
                                     <button
                                         key={idx}
                                         className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors rounded-xl group/btn"
                                         onClick={() => {
                                             onSearchChange?.(name);
                                             setIsSearchOpen(false);
                                         }}
                                     >
                                         <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
                                             <User size={14} />
                                         </div>
                                         <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{name}</span>
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        </div>

        {/* Mobile Header (Highly compact, aligned left, no wasted space) */}
        <div className="flex lg:hidden flex-col gap-2.5 px-4 pt-4 pb-3 bg-transparent z-20 shrink-0">
            <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                        {language === 'es' ? "Historial" : "History"}
                    </h2>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                        {language === 'es' ? "Agenda Semanal" : "Weekly Agenda"}
                    </span>
                </div>
                
                {/* Compact Date Changer controls */}
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900 p-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
                    <Button variant="ghost" size="icon" onClick={previousWeek} className="size-7 rounded-full text-slate-500 hover:text-slate-900 bg-transparent">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <button onClick={goToToday} className="px-2 text-[9px] font-bold text-slate-650 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 uppercase tracking-widest bg-transparent border-0 cursor-pointer">
                        {language === 'es' ? "Hoy" : "Today"}
                    </button>
                    <Button variant="ghost" size="icon" onClick={nextWeek} className="size-7 rounded-full text-slate-500 hover:text-slate-900 bg-transparent">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            
            <div className="flex items-center justify-between w-full mt-0.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                    {format(startDate, language === 'es' ? "d 'de' MMM" : 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(endDate, language === 'es' ? "d 'de' MMM, yyyy" : 'MMM d, yyyy', { locale: language === 'es' ? es : undefined })}
                </span>
                
                {/* Search toggle trigger */}
                <button 
                    onClick={() => {
                        const newSearchState = !isSearchOpen;
                        setIsSearchOpen(newSearchState);
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-450 uppercase tracking-widest flex items-center gap-1 transition-colors bg-transparent border-0 cursor-pointer"
                >
                    <Search className="w-3.5 h-3.5" />
                    {language === 'es' ? "Buscar" : "Search"}
                </button>
            </div>

            {/* Mobile Search input expander */}
            {(isSearchOpen || searchQuery) && (
                <div className="w-full mt-1.5 animate-in slide-in-from-top-1 duration-200" ref={searchContainerRef}>
                    <div className="flex items-center border border-border/80 rounded-2xl px-3 h-[42px] bg-card shadow-sm relative group focus-within:border-indigo-500/40 transition-all">
                        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange?.(e.target.value);
                            }}
                            placeholder={t('record.search_patient_placeholder', 'Search patient registry...')} 
                            className="flex-1 h-full bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => onSearchChange?.('')}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-655 uppercase tracking-wider ml-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Mobile Weekly Strip Selector */}
        <div className="flex lg:hidden items-center justify-between gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 z-20">
            {days.map((day) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isTodayDate = isToday(day);
                return (
                    <button
                        key={day.toString()}
                        onClick={() => {
                            setSelectedDate(day);
                            sessionStorage.setItem('clio_agenda_active_date', format(day, 'yyyy-MM-dd'));
                        }}
                        className={cn(
                            "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition-all duration-300",
                            isSelected 
                                ? "bg-indigo-950 dark:bg-indigo-500 text-white shadow-md scale-105" 
                                : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        )}
                    >
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider",
                            isSelected 
                                ? "text-indigo-200 dark:text-white/80" 
                                : isTodayDate 
                                    ? "text-indigo-600 dark:text-indigo-400" 
                                    : "text-slate-400 dark:text-slate-500"
                        )}>
                            {format(day, 'E', { locale: language === 'es' ? es : undefined }).substring(0, 2)}
                        </span>
                        <span className={cn(
                            "text-[13px] font-bold tracking-tight",
                            isSelected 
                                ? "text-white" 
                                : isTodayDate 
                                    ? "text-indigo-750 dark:text-indigo-400" 
                                    : "text-slate-700 dark:text-slate-300"
                        )}>
                            {format(day, 'd')}
                        </span>
                        {isTodayDate && !isSelected && (
                            <span className="size-1 rounded-full bg-indigo-600 dark:bg-indigo-455 mt-0.5" />
                        )}
                    </button>
                );
            })}
        </div>

        {/* Mobile Sessions List for Selected Day */}
        <div className="flex-1 lg:hidden overflow-y-auto px-4 py-4 space-y-4 bg-transparent z-10">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {format(selectedDate, language === 'es' ? "EEEE, d 'de' MMMM" : 'EEEE, MMMM d', { locale: language === 'es' ? es : undefined })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {selectedDayNotes.length} {selectedDayNotes.length === 1 ? (language === 'es' ? 'sesión' : 'session') : (language === 'es' ? 'sesiones' : 'sessions')}
                </span>
            </div>

            {selectedDayNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center">
                    <CalendarPlus className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {language === 'es' ? 'Sin sesiones programadas' : 'No sessions scheduled'}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 max-w-[200px] mt-1.5 leading-normal">
                        {language === 'es' ? 'Registra un encuentro clínico para esta fecha.' : 'Record a clinical encounter for this date.'}
                    </p>
                    
                        <Popover open={openPopoverId === 'mobile-empty'} onOpenChange={(open) => setOpenPopoverId(open ? 'mobile-empty' : null)}>
                        <PopoverTrigger asChild>
                            <Button className="mt-4 px-5 h-9 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700/25 shadow-md cursor-pointer">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                {language === 'es' ? "Nueva Sesión" : "New Session"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] bg-popover/80 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                            <div className="flex flex-col items-center">
                                <div className="w-full pt-6 pb-3 text-center">
                                    <span className="font-semibold tracking-tight text-slate-850 dark:text-slate-100 text-base">{language === 'es' ? "Seleccionar Hora" : "Select Time"}</span>
                                </div>
                                <div className="px-5 pb-5 w-full">
                                    <TimeSpinner 
                                        onConfirm={(timeStr) => {
                                            setOpenPopoverId(null);
                                            onNewNoteForDate(selectedDate, timeStr);
                                        }} 
                                    />
                                </div>
                                <div className="w-full pb-3 flex justify-center">
                                    <Button 
                                        variant="ghost" 
                                        className="text-slate-400 hover:text-slate-600 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                        onClick={() => {
                                            setOpenPopoverId(null);
                                            onNewNoteForDate(selectedDate);
                                        }}
                                    >
                                       {language === 'es' ? "Omitir hora" : "Skip Time"}
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            ) : (
                <div className="space-y-3 pb-6">
                    {selectedDayNotes.map((note: any, i) => {
                        const title = note.meta?.title || note.encounter?.type || 'Session';
                        const pName = note.meta?.patientName || note.patient?.full_name || 'Anonymous';
                        
                        const formatTime = (t: string) => t.replace(':00', '').replace(' AM', 'am').replace(' PM', 'pm');
                        const rawStart = note.encounter?.time_in || note.appointment?.start_time || '';
                        const rawEnd = note.encounter?.time_out || note.appointment?.end_time || '';
                        const start = rawStart ? formatTime(rawStart) : '';
                        const end = rawEnd ? formatTime(rawEnd) : '';
                        const timeStr = start ? (end ? `${start} - ${end}` : start) : '';
                        
                        const isSigned = note.signature || (note as any).sign_off?.status === 'signed' || note.signature_status === 'signed';
                        const isPending = (note as any).sign_off?.status === 'pending' || note.signature_status === 'pending';

                        return (
                            <div 
                                key={note.id || i}
                                onClick={() => onSelectNote(note)}
                                className={cn(
                                    "p-3.5 rounded-2xl bg-card/90 dark:bg-card/70 backdrop-blur-sm border border-border/70 shadow-sm flex items-center justify-between group active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-soft hover:border-primary/40 transition-all duration-200 cursor-pointer"
                                )}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Clock className="w-4.5 h-4.5 opacity-80" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-foreground text-sm truncate leading-tight group-hover:text-primary transition-colors">
                                            {pName}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-muted-foreground">
                                            {timeStr ? (
                                                <span>{timeStr}</span>
                                            ) : (
                                                <span className="italic">{language === 'es' ? 'No programado' : 'Unscheduled'}</span>
                                            )}
                                            <span className="size-1 rounded-full bg-border" />
                                            <span className="truncate">{title}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                    {isSigned ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                                            {language === 'es' ? 'Firmado' : 'Signed'}
                                        </span>
                                    ) : isPending ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                                            {language === 'es' ? 'Pendiente' : 'Pending'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-secondary text-muted-foreground border border-border/60">
                                            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                                            {language === 'es' ? 'Borrador' : 'Draft'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    <div className="pt-2 flex justify-center">
                        <Popover open={openPopoverId === 'mobile-list'} onOpenChange={(open) => setOpenPopoverId(open ? 'mobile-list' : null)}>
                            <PopoverTrigger asChild>
                                <Button className="w-full h-11 rounded-full text-[11px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border border-indigo-700/25 gap-1.5 transition-all cursor-pointer">
                                    <Plus className="w-4 h-4 stroke-[3]" />
                                    {language === 'es' ? "Nueva Sesión" : "New Session"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] bg-popover/80 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                                <div className="flex flex-col items-center">
                                    <div className="w-full pt-6 pb-3 text-center">
                                        <span className="font-semibold tracking-tight text-slate-850 dark:text-slate-100 text-base">{language === 'es' ? "Seleccionar Hora" : "Select Time"}</span>
                                    </div>
                                    <div className="px-5 pb-5 w-full">
                                        <TimeSpinner 
                                            onConfirm={(timeStr) => {
                                                setOpenPopoverId(null);
                                                onNewNoteForDate(selectedDate, timeStr);
                                            }} 
                                        />
                                    </div>
                                    <div className="w-full pb-3 flex justify-center">
                                        <Button 
                                            variant="ghost" 
                                            className="text-slate-400 hover:text-slate-650 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                            onClick={() => {
                                                setOpenPopoverId(null);
                                                onNewNoteForDate(selectedDate);
                                            }}
                                        >
                                           {language === 'es' ? "Omitir hora" : "Skip Time"}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            )}
        </div>

        {/* Agenda Grid Compact View (Desktop only) */}
        <div className="hidden lg:flex flex-1 overflow-x-auto custom-scrollbar relative px-4 pb-3 xl:px-6 xl:pb-4 bg-surface border-t border-border/60 min-h-0">
            <div className="min-w-0 w-full h-full flex gap-2 xl:gap-2.5 pt-2.5 xl:pt-3">
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
                        <div key={dateStr} className={cn("flex-1 min-w-[100px] flex flex-col min-h-0 h-full transition-all duration-300 relative group/col rounded-2xl border overflow-hidden", isTodayDate ? "bg-white dark:bg-slate-900 border-indigo-500/35 shadow-[0_4px_24px_-8px_rgba(99,102,241,0.18)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-6px_rgba(99,102,241,0.28)]" : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-6px_rgba(99,102,241,0.1)] hover:border-indigo-200/80 dark:hover:border-indigo-900/60")}>
                            {/* Day Header */}
                            <div className={cn("py-2 px-1.5 text-center border-b flex flex-col items-center justify-center gap-0.5 transition-colors shrink-0", isTodayDate ? "bg-indigo-50/20 dark:bg-indigo-950/15 border-indigo-100/50 dark:border-indigo-900/40" : "bg-transparent border-slate-100 dark:border-slate-800/50")}>
                                <span className={cn("text-[9px] font-bold tracking-widest uppercase", isTodayDate ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400 dark:text-slate-350")}>
                                    {format(day, 'EEEE', { locale: language === 'es' ? es : undefined })}
                                </span>
                                <div className="flex items-center gap-1 flex-col mt-0.5">
                                    <span className={cn("text-lg xl:text-xl font-bold tracking-tight leading-none relative z-10", isTodayDate ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 font-semibold")}>
                                        {format(day, 'd')}
                                    </span>
                                    {isTodayDate && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-0.5 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                                </div>
                            </div>
                            
                            {/* Events Container */}
                            <div className="flex-1 p-2 flex flex-col gap-1.5 relative pb-2 min-h-0 overflow-y-auto custom-scrollbar">
                                {dayNotes.map((note: any, i) => {
                                    const pName = note.meta?.patientName || note.patient?.full_name || 'Anonymous';
                                    
                                    const formatTime = (t: string) => {
                                        if (!t) return '';
                                        const clean = t.trim();
                                        const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/i);
                                        if (match) {
                                            let [_, h, m, meridiem] = match;
                                            let hour = parseInt(h, 10);
                                            if (!meridiem) {
                                                meridiem = hour >= 12 ? 'PM' : 'AM';
                                                hour = hour % 12 || 12;
                                            } else {
                                                meridiem = meridiem.toUpperCase();
                                            }
                                            return `${hour}:${m} ${meridiem}`;
                                        }
                                        return clean.replace(/([ap]m)/i, (m) => ` ${m.toUpperCase()}`).trim();
                                    };

                                    const rawStart = note.encounter?.time_in || note.appointment?.start_time || '';
                                    const rawEnd = note.encounter?.time_out || note.appointment?.end_time || '';
                                    const start = rawStart ? formatTime(rawStart) : '';
                                    const end = rawEnd ? formatTime(rawEnd) : '';
                                    
                                    const rawD = note.encounter?.duration_minutes || note.encounter?.duration;
                                    const timeStr = start ? (end ? `${start} - ${end}` : start) : (rawD ? `${rawD} mins` : (language === 'es' ? 'No programado' : 'Unscheduled'));
                                    
                                    const isSigned = note.signature || (note as any).sign_off?.status === 'signed' || note.signature_status === 'signed';
                                    const isPending = (note as any).sign_off?.status === 'pending' || note.signature_status === 'pending';

                                    const serviceTitle = (
                                        note.subTemplate || 
                                        note._frontend_service_title || 
                                        note.services?.service_focus_title || 
                                        note.encounter?.primary_service_provided || 
                                        note.meta?.title || 
                                        (note.template_id ? note.template_id.replace(/^tcm_/, '').replace(/_note$/, '').replace(/_/g, ' ') : '') ||
                                        'TCM Service'
                                    );

                                    const isAssessment = String(note.template_id || '').includes('assessment');
                                    const isPlan = String(note.template_id || '').includes('plan');
                                    const isMhv = String(note.subTemplate || '').toLowerCase().includes('mhv');

                                    const accentBar = isAssessment
                                        ? 'bg-emerald-500'
                                        : isPlan
                                        ? 'bg-amber-500'
                                        : isMhv
                                        ? 'bg-sky-500'
                                        : 'bg-indigo-500';

                                    const categoryDot = isAssessment
                                        ? 'bg-emerald-400'
                                        : isPlan
                                        ? 'bg-amber-400'
                                        : isMhv
                                        ? 'bg-sky-400'
                                        : 'bg-indigo-400';

                                    return (
                                        <div 
                                            key={note.id || i}
                                            onClick={() => onSelectNote(note)}
                                            className="relative rounded-xl p-3 bg-[#0d1222] hover:bg-[#13192f] border border-slate-800/90 hover:border-slate-700 transition-all duration-150 cursor-pointer group/card shadow-sm"
                                        >
                                            <div className="flex flex-col gap-1.5 relative z-10 w-full min-w-0">
                                                {/* Row 1: Clean Time (No Clock Icon) + Status */}
                                                <div className="flex items-center justify-between w-full gap-1">
                                                    <span className="font-semibold text-slate-400 text-[11px] tracking-tight truncate">
                                                        {timeStr}
                                                    </span>

                                                    <div className="shrink-0 flex items-center">
                                                        {isSigned ? (
                                                            <span className="size-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400" title="Firmado">
                                                                <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="relative flex size-2" title="Pendiente">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                                                            </span>
                                                        ) : (
                                                            <span className="size-1.5 rounded-full bg-slate-600" title="Borrador" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Row 2: Patient Name */}
                                                <div className="w-full min-w-0">
                                                    <h3 
                                                        className="font-bold text-slate-100 text-[13px] tracking-tight leading-snug group-hover/card:text-white transition-colors line-clamp-2"
                                                        title={pName}
                                                    >
                                                        {pName}
                                                    </h3>
                                                </div>

                                                {/* Row 3: Subtitle of clinical note */}
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium min-w-0">
                                                    <span className={cn("size-1.5 rounded-full shrink-0", categoryDot)} />
                                                    <span className="truncate capitalize">{serviceTitle}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ADD NOTE POPOVER BUTTON */}
                                <div className="mt-auto pt-2 relative flex justify-center shrink-0">
                                    <Popover open={openPopoverId === dateStr} onOpenChange={(open) => setOpenPopoverId(open ? dateStr : null)}>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-transparent hover:border-indigo-100/50 dark:hover:border-indigo-900/40 gap-1 h-7 px-2 shadow-none font-bold text-[9px] uppercase tracking-wider rounded-full transition-all cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3 stroke-[3]" />
                                                {language === 'es' ? "Nueva Sesión" : "New Session"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 dark:ring-white/5 bg-popover/70 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                                            <div className="flex flex-col items-center">
                                                <div className="w-full pt-8 pb-4 text-center">
                                                    <span className="font-medium tracking-tight text-slate-880 dark:text-slate-100 text-[18px]">{language === 'es' ? "Seleccionar Hora" : "Select Time"}</span>
                                                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1 opacity-80">{format(day, language === 'es' ? "d 'de' MMMM, yyyy" : 'MMMM d, yyyy', { locale: language === 'es' ? es : undefined })}</div>
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
                                                        className="text-slate-400 hover:text-slate-660 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                                        onClick={() => {
                                                            setOpenPopoverId(null);
                                                            onNewNoteForDate(day);
                                                        }}
                                                    >
                                                       {language === 'es' ? "Omitir selección de hora" : "Skip Time Selection"}
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
  );
}
