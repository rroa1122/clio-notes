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
  isToday,
  eachDayOfInterval,
  parseISO,
  isValid,
} from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { useLanguage } from "../../context/LanguageContext"

export interface CalendarWithTimePresetsProps {
  date?: string | Date
  onDateChange?: (dateStr: string) => void
  timeIn?: string
  onTimeInChange?: (timeStr: string) => void
  timeOut?: string
  onTimeOutChange?: (timeStr: string) => void
  durationMin?: string | number
  onDurationChange?: (mins: string) => void
  onConfirm?: () => void
  className?: string
}

// Convert "10:00 AM", "10:00", "14:30" or minutes into comparable total minutes from midnight
const parseTimeToMins = (t?: string): number | null => {
  if (!t) return null
  const match = t.trim().match(/^(\d{1,2}):(\d{1,2})\s*(am|pm)?$/i)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const mins = parseInt(match[2], 10)
  const ampm = match[3]?.toLowerCase()
  if (ampm === "pm" && hours < 12) hours += 12
  if (ampm === "am" && hours === 12) hours = 0
  return hours * 60 + mins
}

// Format minutes from midnight to "hh:mm AM/PM"
const minsToFormattedTime = (minutes: number): string => {
  let m = minutes % (24 * 60)
  if (m < 0) m += 24 * 60
  let hours = Math.floor(m / 60)
  const mins = m % 60
  const period = hours >= 12 ? "PM" : "AM"
  if (hours > 12) hours -= 12
  if (hours === 0) hours = 12
  const padHours = hours.toString().padStart(2, "0")
  const padMins = mins.toString().padStart(2, "0")
  return `${padHours}:${padMins} ${period}`
}

// Format minutes to 24h display "HH:mm" (e.g. 06:00, 09:15)
const minsTo24hDisplay = (minutes: number): string => {
  let m = minutes % (24 * 60)
  if (m < 0) m += 24 * 60
  const hours = Math.floor(m / 60)
  const mins = m % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

export function CalendarWithTimePresets({
  date,
  onDateChange,
  timeIn,
  onTimeInChange,
  timeOut,
  onTimeOutChange,
  durationMin,
  onDurationChange,
  onConfirm,
  className,
}: CalendarWithTimePresetsProps) {
  const { language } = useLanguage()

  // Parse the selected date
  const parsedDate = React.useMemo(() => {
    if (!date) return new Date()
    if (date instanceof Date) return date
    const d = parseISO(date.toString())
    return isValid(d) ? d : new Date()
  }, [date])

  const [selectedDate, setSelectedDate] = React.useState<Date>(parsedDate)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(parsedDate)

  React.useEffect(() => {
    if (date) {
      const d = date instanceof Date ? date : parseISO(date.toString())
      if (isValid(d)) {
        setSelectedDate(d)
        setCurrentMonth(d)
      }
    }
  }, [date])

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Time slots from 06:00 to 21:00 (61 slots, 15 min increments)
  const timeSlots = React.useMemo(() => {
    const slots: { display: string; formatted: string; minutes: number }[] = []
    const startHour = 6 // 6:00 AM
    const totalSlots = 61 // up to 21:00 (9:00 PM)
    for (let i = 0; i < totalSlots; i++) {
      const totalMinutes = startHour * 60 + i * 15
      slots.push({
        display: minsTo24hDisplay(totalMinutes),
        formatted: minsToFormattedTime(totalMinutes),
        minutes: totalMinutes,
      })
    }
    return slots
  }, [])

  const currentInMins = parseTimeToMins(timeIn)
  const currentOutMins = parseTimeToMins(timeOut)

  // Scroll active slots into view
  const inContainerRef = React.useRef<HTMLDivElement>(null)
  const outContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const scrollSlotIntoCenter = (container: HTMLDivElement | null, activeClass: string) => {
      if (!container) return
      const activeEl = container.querySelector(`.${activeClass}`) as HTMLElement | null
      if (activeEl) {
        container.scrollTo({
          top: activeEl.offsetTop - container.offsetHeight / 2 + activeEl.offsetHeight / 2,
          behavior: "smooth",
        })
      }
    }

    const t = setTimeout(() => {
      scrollSlotIntoCenter(inContainerRef.current, "slot-active-in")
      scrollSlotIntoCenter(outContainerRef.current, "slot-active-out")
    }, 60)
    return () => clearTimeout(t)
  }, [timeIn, timeOut])

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d)
    if (onDateChange) {
      onDateChange(format(d, "yyyy-MM-dd"))
    }
  }

  const handleSelectTimeIn = (formattedTime: string, slotMinutes: number) => {
    onTimeInChange?.(formattedTime)

    // Keep duration if already present, or default to 45 min
    const currentDur = durationMin ? parseInt(durationMin.toString(), 10) : 45
    const validDur = !isNaN(currentDur) && currentDur > 0 ? currentDur : 45
    const newOutMins = slotMinutes + validDur
    const newOutFormatted = minsToFormattedTime(newOutMins)
    onTimeOutChange?.(newOutFormatted)
    onDurationChange?.(validDur.toString())
  }

  const handleSelectTimeOut = (formattedTime: string, slotMinutes: number) => {
    onTimeOutChange?.(formattedTime)
    if (currentInMins !== null) {
      let diff = slotMinutes - currentInMins
      if (diff < 0) diff += 24 * 60
      onDurationChange?.(diff.toString())
    }
  }

  const weekDayLabels = language === "es"
    ? ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]
    : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  const displayTimeIn = currentInMins !== null ? minsTo24hDisplay(currentInMins) : (timeIn || null)
  const displayTimeOut = currentOutMins !== null ? minsTo24hDisplay(currentOutMins) : (timeOut || null)

  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c111d]/95 backdrop-blur-2xl text-slate-900 dark:text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-w-[570px] w-full font-sans select-none transition-all",
        className
      )}
    >
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/80">
        {/* Left Side: Calendar */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between min-w-[285px] bg-transparent">
          {/* Calendar Header: < Month Year > */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
              title={language === "es" ? "Mes anterior" : "Previous month"}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white capitalize tracking-wide">
              {format(currentMonth, "MMMM yyyy", { locale: language === "es" ? es : undefined })}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
              title={language === "es" ? "Mes siguiente" : "Next month"}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 text-center mb-3">
            {weekDayLabels.map((day) => (
              <div key={day} className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center">
            {calendarDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentMonthDay = isSameMonth(day, currentMonth)
              const isCurrentToday = isToday(day)

              if (!isCurrentMonthDay) {
                return (
                  <div
                    key={day.toISOString()}
                    className="size-8 sm:size-8.5 mx-auto flex items-center justify-center text-xs text-slate-300 dark:text-slate-700 pointer-events-none font-normal"
                  >
                    {format(day, "d")}
                  </div>
                )
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={cn(
                    "relative size-8 sm:size-8.5 mx-auto flex items-center justify-center text-xs sm:text-[13px] font-semibold transition-all cursor-pointer rounded-full",
                    isSelected
                      ? "bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-500 text-white font-bold shadow-lg shadow-indigo-500/35 scale-105 rounded-full ring-2 ring-indigo-400/30"
                      : isCurrentToday
                        ? "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {format(day, "d")}
                  {isCurrentToday && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Side: Two Time Columns (START & END) */}
        <div className="flex-1 flex flex-col min-w-[250px] bg-slate-50/40 dark:bg-slate-950/40">
          <div className="grid grid-cols-2 flex-1 divide-x divide-slate-100 dark:divide-slate-800/80">
            {/* Column 1: START */}
            <div className="flex flex-col">
              <div className="p-3 text-center border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-400">
                  {language === "es" ? "Inicio" : "Start"}
                </span>
                <div className="mt-1.5 h-9 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 flex items-center justify-center px-2.5 shadow-xs transition-all">
                  <span className={cn(
                    "text-xs sm:text-[13px] font-bold tracking-wider",
                    displayTimeIn ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-400"
                  )}>
                    {displayTimeIn || "--:--"}
                  </span>
                </div>
              </div>
              <div
                ref={inContainerRef}
                className="overflow-y-auto max-h-[290px] p-2.5 pb-6 space-y-2 custom-scrollbar text-center"
                style={{
                  maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                }}
              >
                {timeSlots.map((slot) => {
                  const isSelected =
                    currentInMins !== null && Math.abs(currentInMins - slot.minutes) < 1
                  return (
                    <button
                      key={`in-${slot.display}`}
                      type="button"
                      onClick={() => handleSelectTimeIn(slot.formatted, slot.minutes)}
                      className={cn(
                        "w-full h-10 text-xs sm:text-[13px] font-semibold rounded-2xl flex items-center justify-center transition-all cursor-pointer tracking-wide",
                        isSelected
                          ? "slot-active-in bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-[1.02] ring-1 ring-white/20"
                          : "bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/90 active:scale-[0.98]"
                      )}
                    >
                      {slot.display}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Column 2: END */}
            <div className="flex flex-col">
              <div className="p-3 text-center border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-400">
                  {language === "es" ? "Fin" : "End"}
                </span>
                <div className="mt-1.5 h-9 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 flex items-center justify-center px-2.5 shadow-xs transition-all">
                  <span className={cn(
                    "text-xs sm:text-[13px] font-bold tracking-wider",
                    displayTimeOut ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-400"
                  )}>
                    {displayTimeOut || "--:--"}
                  </span>
                </div>
              </div>
              <div
                ref={outContainerRef}
                className="overflow-y-auto max-h-[290px] p-2.5 pb-6 space-y-2 custom-scrollbar text-center"
                style={{
                  maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                }}
              >
                {timeSlots.map((slot) => {
                  const isSelected =
                    currentOutMins !== null && Math.abs(currentOutMins - slot.minutes) < 1
                  return (
                    <button
                      key={`out-${slot.display}`}
                      type="button"
                      onClick={() => handleSelectTimeOut(slot.formatted, slot.minutes)}
                      className={cn(
                        "w-full h-10 text-xs sm:text-[13px] font-semibold rounded-2xl flex items-center justify-center transition-all cursor-pointer tracking-wide",
                        isSelected
                          ? "slot-active-out bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-[1.02] ring-1 ring-white/20"
                          : "bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/90 active:scale-[0.98]"
                      )}
                    >
                      {slot.display}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer in Clio Obsidian Palette */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/70 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="text-slate-600 dark:text-slate-300 flex-1 min-w-0 text-left leading-relaxed flex items-center flex-wrap gap-2">
          <span className="font-extrabold text-slate-900 dark:text-white capitalize text-xs sm:text-[13px] tracking-tight">
            {format(selectedDate, "EEEE, MMMM d", {
              locale: language === "es" ? es : undefined,
            })}
          </span>
          {(displayTimeIn || displayTimeOut) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] sm:text-xs">
              <span>{displayTimeIn || "--:--"}</span>
              <span className="opacity-60">–</span>
              <span>{displayTimeOut || "--:--"}</span>
              {durationMin && (
                <span className="ml-1 opacity-75 font-medium text-[10px]">({durationMin}m)</span>
              )}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full sm:w-auto shrink-0 h-10 px-6 text-xs sm:text-[13px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white rounded-2xl transition-all cursor-pointer ml-auto shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/40 tracking-wide"
        >
          {language === "es" ? "Continuar" : "Continue"}
        </button>
      </div>
    </div>
  )
}

// Default export / Component alias
export const Component = CalendarWithTimePresets
export default CalendarWithTimePresets
