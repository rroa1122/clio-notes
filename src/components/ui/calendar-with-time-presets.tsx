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

// Format minutes to 24h display "HH:mm" (e.g. 09:00, 10:15)
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
  timeIn = "09:00 AM",
  onTimeInChange,
  timeOut = "09:45 AM",
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

  // Time slots from 08:00 to 18:00 (41 slots, 15 min increments)
  const timeSlots = React.useMemo(() => {
    const slots: { display: string; formatted: string; minutes: number }[] = []
    const startHour = 8 // 8:00 AM
    const totalSlots = 41 // up to 18:00 (6:00 PM)
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
    ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const displayTimeIn = currentInMins !== null ? minsTo24hDisplay(currentInMins) : timeIn
  const displayTimeOut = currentOutMins !== null ? minsTo24hDisplay(currentOutMins) : timeOut

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-700 ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden max-w-[560px] w-full font-sans select-none",
        className
      )}
    >
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
        {/* Left Side: Calendar (Slate palette) */}
        <div className="p-5 flex-1 flex flex-col justify-between min-w-[280px] bg-white dark:bg-slate-900">
          {/* Calendar Header: < Month Year > */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="size-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize tracking-wide">
              {format(currentMonth, "MMMM yyyy", { locale: language === "es" ? es : undefined })}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="size-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 text-center mb-2">
            {weekDayLabels.map((day) => (
              <div key={day} className="text-xs text-slate-400 dark:text-slate-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
            {calendarDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentMonthDay = isSameMonth(day, currentMonth)

              if (!isCurrentMonthDay) {
                return (
                  <div
                    key={day.toISOString()}
                    className="size-8 mx-auto flex items-center justify-center text-xs text-slate-300 dark:text-slate-700 pointer-events-none"
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
                    "size-8 mx-auto flex items-center justify-center text-xs sm:text-sm font-medium transition-all cursor-pointer",
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold rounded-xl shadow-md"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg"
                  )}
                >
                  {format(day, "d")}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Side: Two Time Columns (Inicio & Fin) */}
        <div className="flex-1 flex flex-col min-w-[240px] bg-slate-50 dark:bg-slate-950">
          <div className="grid grid-cols-2 flex-1 divide-x divide-slate-100 dark:divide-slate-800">
            {/* Column 1: Inicio (Start) */}
            <div className="flex flex-col">
              <div className="p-2.5 text-center border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {language === "es" ? "Inicio" : "Start"}
                </span>
                {timeIn && (
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {displayTimeIn}
                  </div>
                )}
              </div>
              <div
                ref={inContainerRef}
                className="overflow-y-auto max-h-[290px] p-2 space-y-2 custom-scrollbar text-center"
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
                        "w-full h-10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center transition-all cursor-pointer",
                        isSelected
                          ? "slot-active-in bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-md"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      )}
                    >
                      {slot.display}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Column 2: Fin (End) */}
            <div className="flex flex-col">
              <div className="p-2.5 text-center border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {language === "es" ? "Fin" : "End"}
                </span>
                {timeOut && (
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {displayTimeOut}
                  </div>
                )}
              </div>
              <div
                ref={outContainerRef}
                className="overflow-y-auto max-h-[290px] p-2 space-y-2 custom-scrollbar text-center"
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
                        "w-full h-10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center transition-all cursor-pointer",
                        isSelected
                          ? "slot-active-out bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-md"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
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

      {/* Footer in Slate Palette */}
      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="text-slate-600 dark:text-slate-300 flex-1 min-w-0 text-left leading-relaxed flex items-center flex-wrap gap-y-1">
          <span className="font-bold text-slate-900 dark:text-white capitalize">
            {format(selectedDate, "EEEE, MMMM d", {
              locale: language === "es" ? es : undefined,
            })}
          </span>
          {displayTimeIn && (
            <>
              <span className="mx-1.5 text-slate-400 dark:text-slate-500">•</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {displayTimeIn}
                {displayTimeOut ? ` – ${displayTimeOut}` : ""}
              </span>
            </>
          )}
          {durationMin && (
            <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-medium">({durationMin} min)</span>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full sm:w-auto shrink-0 h-9 px-5 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 rounded-xl transition-all cursor-pointer ml-auto shadow-xs"
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
