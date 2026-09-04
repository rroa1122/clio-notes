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
import { ChevronLeft, ChevronRight, Plus, Search, User, SlidersHorizontal, Clock, CalendarPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { cn } from '../../lib/utils';
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
    setSelectedDate(prev => subWeeks(prev, 1));
    sessionStorage.setItem('clio_agenda_active_date', format(nextDate, 'yyyy-MM-dd'));
  };
  
  const nextWeek = () => {
    const nextDate = addWeeks(currentDate, 1);
    setCurrentDate(nextDate);
    setSelectedDate(prev => addWeeks(prev, 1));
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

  // Selected day notes for mobile view
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayNotes = (notesByDate[selectedDateStr] || []).slice();
  selectedDayNotes.sort((a, b) => {
      const tA = (a as any).encounter?.time_in || (a as any).appointment?.start_time || '';
      const tB = (b as any).encounter?.time_in || (b as any).appointment?.start_time || '';
      return parseTimeMins(tA) - parseTimeMins(tB);
  });

  return (
    <div className="flex flex-col overflow-hidden h-[100%] w-full">
      <div className="flex flex-col flex-1 bg-surface rounded-2xl md:rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-border/60 overflow-hidden relative">
        
        {/* Header */}
        {/* ===================== 1. DESKTOP HEADER (MD and up) ===================== */}
        <div className="hidden md:flex flex-none items-center justify-between gap-2.5 md:gap-4 px-3 py-2.5 md:px-5 md:py-3 xl:px-8 xl:py-4 bg-surface z-20 shrink-0 border-b border-border/40">
             {/* Nav Left - Date Controls */}
             <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === 'es' ? "Línea de Tiempo de Agenda" : "Agenda Timeline"}</span>
                 <div className="flex items-center gap-1.5 md:gap-2 border border-slate-200/50 dark:border-slate-800/50 rounded-full p-0.5 h-9 md:h-10 bg-slate-50/30 dark:bg-slate-950/10 shadow-sm">
                     <button 
                         onClick={goToToday}
                         className="rounded-full h-7 md:h-8 px-2.5 md:px-3.5 font-black text-[9px] tracking-wider bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:shadow-sm transition-all cursor-pointer"
                     >
                         {language === 'es' ? "HOY" : "TODAY"}
                     </button>
                     <div className="text-[10px] xl:text-[11px] font-bold tracking-tight text-slate-750 dark:text-slate-300 px-1 whitespace-nowrap">
                         <span className="hidden xl:inline">{format(startDate, language === 'es' ? "d 'de' MMMM" : 'MMMM d', { locale: language === 'es' ? es : undefined })} - {format(endDate, language === 'es' ? "d 'de' MMMM, yyyy" : 'MMMM d, yyyy', { locale: language === 'es' ? es : undefined })}</span>
                         <span className="xl:hidden">{format(startDate, language === 'es' ? "d MMM" : 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(endDate, language === 'es' ? "d MMM" : 'MMM d', { locale: language === 'es' ? es : undefined })}</span>
                     </div>
                     <div className="flex items-center gap-0.5 bg-white/60 dark:bg-slate-900/60 p-0.5 rounded-full border border-slate-200/50 dark:border-slate-800/80 h-7 md:h-8 ml-auto">
                         <button 
                             onClick={previousWeek} 
                             className="h-6 w-6 md:h-7 md:w-7 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all bg-transparent border-0 cursor-pointer flex items-center justify-center"
                         >
                             <ChevronLeft className="w-3.5 h-3.5" />
                         </button>
                         <button 
                             onClick={nextWeek} 
                             className="h-6 w-6 md:h-7 md:w-7 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all bg-transparent border-0 cursor-pointer flex items-center justify-center"
                         >
                             <ChevronRight className="w-3.5 h-3.5" />
                         </button>
                     </div>
                 </div>
            </div>

            {/* Nav Right - Search */}
             <div className="flex flex-col gap-1 flex-1 max-w-[240px] lg:max-w-[340px] xl:max-w-[420px]" ref={searchContainerRef}>
                 <div className="flex items-center justify-between px-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><SlidersHorizontal className="w-3 h-3 text-slate-400 shrink-0" /> {language === 'es' ? "Filtrar Pacientes" : "Filter Patients"}</span>
                     <Link to="/notes/new" className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-500 flex items-center gap-1.5 transition-colors shrink-0">
                         <Plus className="w-3 h-3" />
                         <span className="hidden xl:inline">{language === 'es' ? "Nuevo Registro" : "New Acquisition"}</span>
                         <span className="xl:hidden">{language === 'es' ? "Nuevo" : "New"}</span>
                     </Link>
                 </div>
                 <div className="flex items-center border border-slate-200/80 dark:border-slate-800/80 rounded-full px-3 md:px-4 h-9 md:h-10 bg-slate-50/50 dark:bg-slate-950/20 shadow-sm relative group hover:border-slate-350 dark:hover:border-slate-700 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
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
                      {searchQuery && (
                          <button 
                             onClick={() => onSearchChange?.('')}
                             className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider ml-1"
                          >
                             Clear
                          </button>
                      )}
                      
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

        {/* ===================== 2. MOBILE HEADER & WEEK STRIP (Phone only: md:hidden) ===================== */}
        <div className="flex md:hidden flex-col gap-2 px-3 pt-3 pb-2.5 bg-surface z-20 shrink-0 border-b border-border/40">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={goToToday}
                        className="rounded-full h-7 px-2.5 font-black text-[9px] tracking-wider bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
                    >
                        {language === 'es' ? "HOY" : "TODAY"}
                    </button>
                    <span className="text-[11px] font-bold text-slate-750 dark:text-slate-200 tracking-tight">
                        {format(startDate, language === 'es' ? "d MMM" : 'MMM d', { locale: language === 'es' ? es : undefined })} - {format(endDate, language === 'es' ? "d MMM" : 'MMM d', { locale: language === 'es' ? es : undefined })}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={cn(
                            "size-7 rounded-full flex items-center justify-center transition-all border border-border/60",
                            isSearchOpen || searchQuery ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 bg-white dark:bg-slate-900"
                        )}
                        title={language === 'es' ? "Buscar" : "Search"}
                    >
                        <Search className="size-3.5" />
                    </button>
                    <div className="flex items-center gap-0.5 bg-white/60 dark:bg-slate-900/60 p-0.5 rounded-full border border-slate-200/50 dark:border-slate-800/80 h-7">
                        <button 
                            onClick={previousWeek} 
                            className="size-6 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={nextWeek} 
                            className="size-6 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Search input expander */}
            {(isSearchOpen || searchQuery) && (
                <div className="w-full mt-1 animate-in slide-in-from-top-1 duration-150" ref={searchContainerRef}>
                    <div className="flex items-center border border-border/80 rounded-full px-3 h-8 bg-slate-50/50 dark:bg-slate-950/30 relative">
                        <Search className="size-3.5 text-slate-400 mr-2 shrink-0" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder={t('record.search_patient_placeholder', 'Search patient registry...')} 
                            className="flex-1 h-full bg-transparent border-0 p-0 text-xs font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => onSearchChange?.('')}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider ml-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 7-Day Strip: perfectly fits 100% width on phone */}
            <div className="grid grid-cols-7 gap-1 pt-1 w-full">
                {days.map((day) => {
                    const dStr = format(day, 'yyyy-MM-dd');
                    const isSelected = dStr === selectedDateStr;
                    const isTodayDate = isToday(day);
                    const dayNotesCount = (notesByDate[dStr] || []).length;

                    return (
                        <button
                            key={dStr}
                            onClick={() => {
                                setSelectedDate(day);
                                sessionStorage.setItem('clio_agenda_active_date', dStr);
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative",
                                isSelected 
                                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30" 
                                    : isTodayDate
                                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                            )}
                        >
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider",
                                isSelected ? "text-indigo-100" : isTodayDate ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                            )}>
                                {format(day, 'EEE', { locale: language === 'es' ? es : undefined }).substring(0, 3)}
                            </span>
                            <span className="text-sm font-bold tracking-tight mt-0.5 leading-none">
                                {format(day, 'd')}
                            </span>
                            {/* Dot indicator if has sessions */}
                            <div className="h-1 flex items-center justify-center mt-1">
                                {dayNotesCount > 0 && (
                                    <span className={cn(
                                        "size-1.5 rounded-full",
                                        isSelected ? "bg-white" : "bg-indigo-500"
                                    )} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* ===================== 3. MOBILE SESSIONS VERTICAL FEED (Phone only: md:hidden) ===================== */}
        <div className="flex-1 md:hidden overflow-y-auto px-3.5 py-3 space-y-3 bg-surface/50 z-10 custom-scrollbar">
            <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {format(selectedDate, language === 'es' ? "EEEE, d 'de' MMMM" : 'EEEE, MMMM d', { locale: language === 'es' ? es : undefined })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {selectedDayNotes.length} {selectedDayNotes.length === 1 ? (language === 'es' ? 'sesión' : 'session') : (language === 'es' ? 'sesiones' : 'sessions')}
                </span>
            </div>

            {selectedDayNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 text-center">
                    <CalendarPlus className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2.5" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {language === 'es' ? 'Sin sesiones programadas' : 'No sessions scheduled'}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 max-w-[220px] mt-1 leading-normal">
                        {language === 'es' ? 'Registra un encuentro clínico para esta fecha.' : 'Record a clinical encounter for this date.'}
                    </p>
                    
                    <Popover open={openPopoverId === 'mobile-empty'} onOpenChange={(open) => setOpenPopoverId(open ? 'mobile-empty' : null)}>
                        <PopoverTrigger asChild>
                            <Button className="mt-3.5 px-4 h-8 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700/25 shadow-sm cursor-pointer">
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
            ) : (
                <div className="space-y-2.5 pb-4">
                    {selectedDayNotes.map((note: any, i) => {
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
                        
                        const syncStatus = (note as any).sync_status || (note as any).amexzone_status || (note.signature_status === 'signed' ? 'completed' : 'pending');

                        const serviceTitle = (
                            note.subTemplate || 
                            note._frontend_service_title || 
                            note.services?.service_focus_title || 
                            note.encounter?.primary_service_provided || 
                            note.meta?.title || 
                            (note.template_id ? note.template_id.replace(/^tcm_/, '').replace(/_note$/, '').replace(/_/g, ' ') : '') ||
                            'TCM Service'
                        );

                        const cardSyncStyles = 
                            syncStatus === 'completed' || syncStatus === 'synced'
                                 ? "bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border-emerald-200/90 dark:border-emerald-500/25"
                                 : syncStatus === 'failed' || syncStatus === 'error'
                                 ? "bg-rose-50/80 hover:bg-rose-100/90 dark:bg-rose-950/25 dark:hover:bg-rose-950/35 border-rose-200/90 dark:border-rose-500/30"
                                 : "bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/15 dark:hover:bg-amber-950/25 border-amber-200/90 dark:border-amber-500/20";

                        const isSigned = note.signature || (note as any).sign_off?.status === 'signed' || note.signature_status === 'signed';

                        return (
                            <div 
                                key={note.id || i}
                                onClick={() => onSelectNote(note)}
                                className={cn(
                                    "p-3 rounded-xl border shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99]",
                                    cardSyncStyles
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Clock className="size-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                            {pName}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                            <span>{timeStr}</span>
                                            <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            <span className="truncate capitalize">{serviceTitle}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    {isSigned ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <span className="size-1.5 rounded-full bg-emerald-500" />
                                            {language === 'es' ? 'Firmado' : 'Signed'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                            {language === 'es' ? 'Pendiente' : 'Pending'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <div className="pt-2 flex justify-center">
                        <Popover open={openPopoverId === 'mobile-list'} onOpenChange={(open) => setOpenPopoverId(open ? 'mobile-list' : null)}>
                            <PopoverTrigger asChild>
                                <Button className="w-full h-9 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm border border-indigo-700/25 gap-1 transition-all cursor-pointer">
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
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

        {/* ===================== 4. DESKTOP 7-DAY BOARD (MD and up) ===================== */}
        <div className="hidden md:flex flex-1 overflow-x-auto custom-scrollbar relative px-2.5 md:px-3 lg:px-4 pb-2.5 xl:px-6 xl:pb-4 bg-surface border-t border-border/60 min-h-0">
            <div className="min-w-fit md:min-w-0 w-full h-full flex gap-1.5 md:gap-2 xl:gap-2.5 pt-2 xl:pt-3">
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
                        <div key={dateStr} className={cn("flex-1 min-w-[105px] sm:min-w-[95px] xl:min-w-[100px] flex flex-col min-h-0 h-full transition-all duration-300 relative group/col rounded-xl md:rounded-2xl border overflow-hidden", isTodayDate ? "bg-white dark:bg-slate-900 border-indigo-500/35 shadow-[0_4px_24px_-8px_rgba(99,102,241,0.18)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-6px_rgba(99,102,241,0.28)]" : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-6px_rgba(99,102,241,0.1)] hover:border-indigo-200/80 dark:hover:border-indigo-900/60")}>
                            {/* Day Header */}
                            <div className={cn("py-1.5 xl:py-2 px-1 text-center border-b flex flex-col items-center justify-center gap-0.5 transition-colors shrink-0", isTodayDate ? "bg-indigo-50/20 dark:bg-indigo-950/15 border-indigo-100/50 dark:border-indigo-900/40" : "bg-transparent border-slate-100 dark:border-slate-800/50")}>
                                <span className={cn("text-[9px] font-bold tracking-widest uppercase truncate max-w-full px-0.5", isTodayDate ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400 dark:text-slate-350")}>
                                    <span className="hidden xl:inline">{format(day, 'EEEE', { locale: language === 'es' ? es : undefined })}</span>
                                    <span className="xl:hidden">{format(day, 'EEE', { locale: language === 'es' ? es : undefined })}</span>
                                </span>
                                <div className="flex items-center gap-1 flex-col mt-0.5">
                                    <span className={cn("text-base xl:text-xl font-bold tracking-tight leading-none relative z-10", isTodayDate ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 font-semibold")}>
                                        {format(day, 'd')}
                                    </span>
                                    {isTodayDate && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-0.5 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                                </div>
                            </div>
                            
                            {/* Events Container */}
                            <div className="flex-1 p-1.5 xl:p-2 flex flex-col gap-1.5 relative pb-2 min-h-0 overflow-y-auto custom-scrollbar">
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
                                    
                                    const syncStatus = (note as any).sync_status || (note as any).amexzone_status || (note.signature_status === 'signed' ? 'completed' : 'pending');

                                    const serviceTitle = (
                                        note.subTemplate || 
                                        note._frontend_service_title || 
                                        note.services?.service_focus_title || 
                                        note.encounter?.primary_service_provided || 
                                        note.meta?.title || 
                                        (note.template_id ? note.template_id.replace(/^tcm_/, '').replace(/_note$/, '').replace(/_/g, ' ') : '') ||
                                        'TCM Service'
                                    );

                                    // Subtle, elegant tint depending on sync status
                                    const cardSyncStyles = 
                                        syncStatus === 'completed' || syncStatus === 'synced'
                                             ? "bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border-emerald-200/90 dark:border-emerald-500/25 hover:border-emerald-300 dark:hover:border-emerald-500/40"
                                            : syncStatus === 'failed' || syncStatus === 'error'
                                            ? "bg-rose-50/80 hover:bg-rose-100/90 dark:bg-rose-950/25 dark:hover:bg-rose-950/35 border-rose-200/90 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-500/50"
                                            : "bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/15 dark:hover:bg-amber-950/25 border-amber-200/90 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/35";

                                    return (
                                        <div 
                                            key={note.id || i}
                                            onClick={() => onSelectNote(note)}
                                            className={cn(
                                                "relative rounded-xl p-2 xl:p-3 border transition-all duration-150 cursor-pointer group/card shadow-sm",
                                                cardSyncStyles
                                            )}
                                        >
                                            <div className="flex flex-col gap-1.5 relative z-10 w-full min-w-0">
                                                {/* Row 1: Clean Time (No Dot) */}
                                                <div className="flex items-center justify-between w-full gap-1">
                                                    <span className="font-semibold text-slate-500 dark:text-slate-400 text-[10px] xl:text-[11px] tracking-tight truncate">
                                                        {timeStr}
                                                    </span>
                                                </div>

                                                {/* Row 2: Patient Name */}
                                                <div className="w-full min-w-0">
                                                    <h3 
                                                        className="font-bold text-slate-900 dark:text-slate-100 text-xs xl:text-[13px] tracking-tight leading-snug group-hover/card:text-indigo-600 dark:group-hover/card:text-white transition-colors line-clamp-2"
                                                        title={pName}
                                                    >
                                                        {pName}
                                                    </h3>
                                                </div>

                                                {/* Row 3: Subtitle of clinical note */}
                                                <div className="text-[10px] xl:text-[11px] text-slate-500 dark:text-slate-400 font-medium min-w-0 truncate capitalize">
                                                    {serviceTitle}
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
                                                className="w-full text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-transparent hover:border-indigo-100/50 dark:hover:border-indigo-900/40 gap-1 h-7 px-1 xl:px-2 shadow-none font-bold text-[8px] xl:text-[9px] uppercase tracking-wider rounded-full transition-all cursor-pointer truncate"
                                            >
                                                <Plus className="w-3 h-3 stroke-[3] shrink-0" />
                                                <span className="hidden 2xl:inline">{language === 'es' ? "Nueva Sesión" : "New Session"}</span>
                                                <span className="2xl:hidden">{language === 'es' ? "Sesión" : "Session"}</span>
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
