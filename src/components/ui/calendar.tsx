import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday
} from "date-fns"

import { cn } from "../../lib/utils"
import { TiltCard } from "./tilt-card"

export interface CalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const rows: Date[][] = []
  let days: Date[] = []

  calendarDays.forEach((day, i) => {
    days.push(day)
    if ((i + 1) % 7 === 0) {
      rows.push(days)
      days = []
    }
  })

  return (
    <TiltCard intensity={3} scale={1.005}>
      <div className={cn("p-4 bg-white dark:bg-slate-950", className)}>
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
          <select
            className="bg-transparent text-[13px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
            value={format(currentMonth, "M")}
            onChange={(e) => {
              const newMonth = parseInt(e.target.value) - 1;
              const next = new Date(currentMonth);
              next.setMonth(newMonth);
              setCurrentMonth(next);
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {format(new Date(2024, i, 1), "MMMM")}
              </option>
            ))}
          </select>
          <select
            className="bg-transparent text-[13px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
            value={format(currentMonth, "yyyy")}
            onChange={(e) => {
              const newYear = parseInt(e.target.value);
              const next = new Date(currentMonth);
              next.setFullYear(newYear);
              setCurrentMonth(next);
            }}
          >
            {Array.from({ length: 120 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-7">
            {row.map((day) => {
              const isSelected = selected && isSameDay(day, selected)
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isTodayDay = isToday(day)

              return (
                <button
                  type="button"
                  key={day.toString()}
                  onClick={() => onSelect?.(day)}
                  className={cn(
                    "h-9 w-9 text-xs font-semibold rounded-2xl transition-all relative group flex items-center justify-center",
                    !isCurrentMonth && "text-slate-300 dark:text-slate-700",
                    isCurrentMonth && "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-600",
                    isSelected && "bg-indigo-600 !text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700",
                    isTodayDay && !isSelected && "text-indigo-600"
                  )}
                >
                  {format(day, "d")}
                  {isTodayDay && !isSelected && (
                    <div className="absolute bottom-1 right-1 size-1 rounded-full bg-indigo-500" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
    </TiltCard>
  )
}
