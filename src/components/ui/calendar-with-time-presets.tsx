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

// Exact time field: keeps what the TCM is typing (hour first, then minutes) and only commits a complete time
function ExactTimeField({
  minutes,
  label,
  onCommit,
}: {
  minutes: number | null
  label: string
  onCommit: (value: string) => void
}) {
  const external = minutes !== null ? minsTo24hDisplay(minutes) : ""
  const [value, setValue] = React.useState(external)
  const focused = React.useRef(false)
  React.useEffect(() => {
    if (!focused.current) setValue(external)
  }, [external])

  return (
    <input
      type="time"
      aria-label={label}
      title={label}
      value={value}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setValue(external)
      }}
      onChange={(e) => {
        setValue(e.target.value)
        if (/^\d{2}:\d{2}$/.test(e.target.value)) onCommit(e.target.value)
      }}
      className="mt-1.5 w-full max-w-[115px] mx-auto block h-9 rounded-lg border border-slate-700 bg-slate-850 dark:bg-slate-800 px-2 text-center text-sm font-bold text-white select-text [color-scheme:dark] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
    />
  )
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

  // Time slots from 06:00 to 22:00 (65 slots, 15 min increments): TCM services can start early or run late
  const timeSlots = React.useMemo(() => {
    const slots: { display: string; formatted: string; minutes: number }[] = []
    const startHour = 6 // 6:00 AM
    const totalSlots = 65 // up to 22:00 (10:00 PM)
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

  // Exact time typed by the TCM (e.g. 07:07), not limited to the 15-minute slots
  const handleTypedTime = (value: string, which: "in" | "out") => {
    const m = value.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return
    const mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
    if (which === "in") handleSelectTimeIn(minsToFormattedTime(mins), mins)
    else handleSelectTimeOut(minsToFormattedTime(mins), mins)
  }

  const weekDayLabels = language === "es"
    ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const displayTimeIn = currentInMins !== null ? minsTo24hDisplay(currentInMins) : (timeIn || null)
  const displayTimeOut = currentOutMins !== null ? minsTo24hDisplay(currentOutMins) : (timeOut || null)

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden max-w-[560px] w-full font-sans select-none",
        className
      )}
    >
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* Left Side: Calendar */}
        <div className="p-5 flex-1 flex flex-col justify-between min-w-[285px] bg-slate-900">
          {/* Calendar Header: < Month Year > */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === "es" ? "Mes anterior" : "Previous month"}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-white capitalize tracking-wide">
              {format(currentMonth, "MMMM yyyy", { locale: language === "es" ? es : undefined })}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === "es" ? "Mes siguiente" : "Next month"}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 text-center mb-2.5">
            {weekDayLabels.map((day) => (
              <div key={day} className="text-xs text-slate-400 font-semibold py-1">
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
                    className="size-9 mx-auto flex items-center justify-center text-xs text-slate-600 pointer-events-none font-normal"
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
                    "relative size-9 mx-auto flex items-center justify-center text-sm font-semibold transition-colors cursor-pointer rounded-lg",
                    isSelected
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : isCurrentToday
                        ? "text-indigo-400 font-bold bg-indigo-950/50 border border-indigo-750/70 hover:bg-indigo-900/50"
                        : "text-slate-200 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  {format(day, "d")}
                  {isCurrentToday && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Side: Two Time Columns (START & END) */}
        <div className="flex-1 flex flex-col min-w-[250px] bg-slate-950">
          <div className="grid grid-cols-2 flex-1 divide-x divide-slate-800">
            {/* Column 1: START */}
            <div className="flex flex-col">
              <div className="p-3 text-center border-b border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {language === "es" ? "Inicio" : "Start"}
                </span>
                <ExactTimeField
                  minutes={currentInMins}
                  label={language === "es" ? "Hora de inicio exacta" : "Exact start time"}
                  onCommit={(v) => handleTypedTime(v, "in")}
                />
              </div>
              <div
                ref={inContainerRef}
                className="overflow-y-auto max-h-[290px] p-2.5 pb-4 space-y-1.5 custom-scrollbar text-center"
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
                        "w-full h-9 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center transition-colors cursor-pointer tracking-wide",
                        isSelected
                          ? "slot-active-in bg-indigo-600 border border-indigo-500 text-white font-bold shadow-sm"
                          : "bg-slate-800/90 border border-slate-700/80 hover:border-slate-500 hover:bg-slate-700 text-slate-100"
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
              <div className="p-3 text-center border-b border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {language === "es" ? "Fin" : "End"}
                </span>
                <ExactTimeField
                  minutes={currentOutMins}
                  label={language === "es" ? "Hora de fin exacta" : "Exact end time"}
                  onCommit={(v) => handleTypedTime(v, "out")}
                />
              </div>
              <div
                ref={outContainerRef}
                className="overflow-y-auto max-h-[290px] p-2.5 pb-4 space-y-1.5 custom-scrollbar text-center"
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
                        "w-full h-9 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center transition-colors cursor-pointer tracking-wide",
                        isSelected
                          ? "slot-active-out bg-indigo-600 border border-indigo-500 text-white font-bold shadow-sm"
                          : "bg-slate-800/90 border border-slate-700/80 hover:border-slate-500 hover:bg-slate-700 text-slate-100"
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

      {/* Footer in Crisp Palette */}
      <div className="border-t border-slate-800 bg-slate-950 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="text-slate-300 flex-1 min-w-0 text-left leading-relaxed flex items-center flex-wrap gap-2">
          <span className="font-bold text-white capitalize text-sm tracking-tight">
            {format(selectedDate, "EEEE, MMMM d", {
              locale: language === "es" ? es : undefined,
            })}
          </span>
          {(displayTimeIn || displayTimeOut) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-indigo-300 font-bold text-xs">
              <span>{displayTimeIn || "--:--"}</span>
              <span className="opacity-60">–</span>
              <span>{displayTimeOut || "--:--"}</span>
              {durationMin && (
                <span className="ml-1 opacity-75 font-normal text-[11px]">({durationMin}m)</span>
              )}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full sm:w-auto shrink-0 h-9 px-6 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg transition-all cursor-pointer ml-auto shadow-sm tracking-wide"
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
