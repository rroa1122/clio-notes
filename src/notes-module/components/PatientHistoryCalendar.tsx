import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import type { Note } from '../lib/storage';

interface PatientHistoryCalendarProps {
  notes: Note[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onNewNoteForDate: (date: Date) => void;
}

export function PatientHistoryCalendar({
  notes,
  selectedDate,
  onSelectDate,
  onNewNoteForDate
}: PatientHistoryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Extract dates from notes and group them
  const getNoteDate = (note: any) => {
    const rawDate = note.meta?.visitDate || note.appointment?.date_of_service || note.createdAt || note.created_at;
    if (!rawDate) return null;
    try {
      // Handle YYYY-MM-DD vs ISO strings properly
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="flex flex-col bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 text-slate-100 relative overflow-hidden group/calendar">
      {/* Premium Glassmorphism decorations */}
      <div className="absolute top-0 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 opacity-50 group-hover/calendar:opacity-100" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 opacity-50 group-hover/calendar:opacity-100" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Caseload
            </h2>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
              Active Schedule Heatmap
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm border border-slate-700/50">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              onClick={previousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[13px] font-bold min-w-[100px] text-center tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-4 gap-x-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-[10px] font-black tracking-widest text-slate-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayNotes = notesByDate[dateStr] || [];
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isTodayDate = isToday(day);
            const isCurrentMonthDay = isSameMonth(day, currentMonth);
            
            const hasNotes = dayNotes.length > 0;
            const allSigned = hasNotes && dayNotes.every((n: any) => n.signature || n.sign_off?.status === 'signed');
            
            // Calculate total duration roughly if available
            const totalMins = dayNotes.reduce((acc, n: any) => {
               const rawDuration = n.encounter?.duration_minutes || n.encounter?.duration;
               return acc + (parseInt(rawDuration) || 0);
            }, 0);

            return (
              <div 
                key={day.toString()} 
                className="relative aspect-square group/day"
              >
                <div
                  onClick={() => {
                    if (hasNotes) {
                      onSelectDate(isSelected ? null : day);
                    }
                  }}
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center p-1 rounded-2xl transition-all duration-300 border border-transparent",
                    !isCurrentMonthDay ? "opacity-30" : "opacity-100",
                    isTodayDate && !isSelected ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-slate-900" : "",
                    isSelected ? "bg-primary text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] scale-105 z-20 border-primary" : 
                    hasNotes ? "bg-slate-800/80 hover:bg-slate-700/80 cursor-pointer border-slate-700/50" : 
                    "hover:bg-slate-800/50",
                    !hasNotes && isCurrentMonthDay && "border-slate-800 border-dashed"
                  )}
                >
                  <span className={cn(
                    "text-[13px] font-bold tracking-tight mb-1",
                    !isSelected && !hasNotes && isCurrentMonthDay ? "text-slate-400" : "",
                    !isCurrentMonthDay ? "text-slate-600" : ""
                  )}>
                    {format(day, 'd')}
                  </span>

                  {/* Status Dots */}
                  {hasNotes && (
                    <div className="flex gap-1">
                      {dayNotes.slice(0, 3).map((note: any, i) => {
                        const signed = note.signature || note.sign_off?.status === 'signed';
                        return (
                          <div 
                            key={i} 
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-white" :
                              signed ? "bg-emerald-400" : "bg-amber-400"
                            )} 
                          />
                        );
                      })}
                      {dayNotes.length > 3 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      )}
                    </div>
                  )}

                  {/* Hover Add Button for Empty Days */}
                  {!hasNotes && isCurrentMonthDay && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewNoteForDate(day);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-md rounded-2xl opacity-0 group-hover/day:opacity-100 cursor-pointer transition-opacity border border-primary/50"
                    >
                      <Plus className="w-5 h-5 text-primary-foreground drop-shadow-md" />
                    </div>
                  )}
                </div>

                {/* Rich Tooltip (Glassmorphism) */}
                {hasNotes && isCurrentMonthDay && (
                  <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all duration-200 transform translate-y-2 group-hover/day:translate-y-0">
                    <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/80 rounded-xl p-3 shadow-2xl w-48 text-left">
                       <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/50">
                         <FileText className="w-3.5 h-3.5 text-primary" />
                         <span className="text-[11px] font-bold text-slate-200">{format(day, 'MMM d, yyyy')}</span>
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] text-slate-400 font-medium">Sessions</span>
                           <span className="text-[11px] font-bold text-white">{dayNotes.length}</span>
                         </div>
                         {totalMins > 0 && (
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-1">
                               <Clock className="w-3 h-3 text-slate-400" />
                               <span className="text-[10px] text-slate-400 font-medium">Time Logged</span>
                             </div>
                             <span className="text-[11px] font-bold text-white">{Math.round(totalMins/60)}h {totalMins%60}m</span>
                           </div>
                         )}
                         <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-700/50">
                           <span className="text-[10px] text-slate-400 font-medium">Status</span>
                           <div className="flex items-center gap-1">
                             {allSigned ? (
                               <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">Completed</span></>
                             ) : (
                               <><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[10px] font-bold text-amber-400 uppercase tracking-tight">Pending</span></>
                             )}
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-800/50 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-dashed border-slate-600 flex items-center justify-center pb-0.5">
               <span className="text-[10px] text-slate-500 font-bold">+</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empty</span>
          </div>
        </div>
        
        {selectedDate && (
           <Button 
             variant="ghost" 
             className="w-full mt-4 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary font-bold rounded-xl h-10 border border-primary/20"
             onClick={() => onSelectDate(null)}
           >
             Clear Date Filter
           </Button>
        )}
      </div>
    </div>
  );
}
