import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
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
  eachDayOfInterval,
  isToday
} from "date-fns"
import { es } from "date-fns/locale"
import { useLanguage } from "../../context/LanguageContext"
import { cn } from "../../lib/utils"

export interface CalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const { language } = useLanguage()
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())
  const [showPicker, setShowPicker] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (selected) {
      setCurrentMonth(selected)
    }
  }, [selected])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  const handleSelectToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    onSelect?.(today)
  }

  const handleSelectYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    setCurrentMonth(yesterday)
    onSelect?.(yesterday)
  }

  return (
    <div ref={containerRef} className={cn("p-2 select-none relative w-full text-slate-800 dark:text-slate-200", className)}>
      {/* Unified Month & Year Header */}
      <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800/60">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer capitalize"
          >
            <span>{format(currentMonth, "MMMM yyyy", { locale: language === 'es' ? es : undefined })}</span>
            <ChevronDown size={13} className="text-slate-400 dark:text-slate-500" />
          </button>

          {/* Quick Month / Year Selector Dropdown */}
          {showPicker && (
            <div className="absolute top-full left-0 mt-1 w-44 max-h-56 overflow-y-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 backdrop-blur-xl flex flex-col gap-1 custom-scrollbar">
              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 uppercase tracking-wider">
                {language === 'es' ? "Mes" : "Month"}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(2024, i, 1)
                  const name = format(date, "MMM", { locale: language === 'es' ? es : undefined })
                  const isCurrent = currentMonth.getMonth() === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const next = new Date(currentMonth)
                        next.setMonth(i)
                        setCurrentMonth(next)
                        setShowPicker(false)
                      }}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md text-left capitalize transition-colors cursor-pointer",
                        isCurrent 
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium" 
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Prev / Next Arrows */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="size-7 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="size-7 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {(language === 'es' ? ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"] : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]).map((day) => (
          <div key={day} className="text-[11px] font-medium text-slate-400 dark:text-slate-500 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="space-y-0.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-0.5 text-center">
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
                    "size-7.5 mx-auto text-xs rounded-full transition-all relative flex items-center justify-center cursor-pointer",
                    !isCurrentMonth && "text-slate-300 dark:text-slate-700 pointer-events-none",
                    isCurrentMonth && !isSelected && "text-slate-700 dark:text-slate-300 font-normal hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100",
                    isSelected && "bg-indigo-600 dark:bg-indigo-500 text-white font-medium shadow-xs hover:bg-indigo-700",
                    isTodayDay && !isSelected && "text-indigo-600 dark:text-indigo-400 font-medium ring-1 ring-indigo-500/40"
                  )}
                >
                  {format(day, "d")}
                  {isTodayDay && !isSelected && (
                    <div className="absolute bottom-0.5 size-0.5 rounded-full bg-indigo-500" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Subtle Bottom Quick Presets */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/60 px-1 text-[11px]">
        <button
          type="button"
          onClick={handleSelectToday}
          className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
        >
          {language === 'es' ? 'Hoy' : 'Today'}
        </button>
        <button
          type="button"
          onClick={handleSelectYesterday}
          className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
        >
          {language === 'es' ? 'Ayer' : 'Yesterday'}
        </button>
      </div>
    </div>
  )
}
