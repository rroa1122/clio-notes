import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, parseISO, isValid, parse } from "date-fns"

import { cn } from "../../lib/utils"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

export interface DatePickerProps {
  date?: string | Date
  setDate: (date: string) => void
  placeholder?: string
  className?: string
  icon?: React.ReactNode
  mode?: "button" | "input"
}

export function DatePicker({ 
  date, 
  setDate, 
  placeholder = "MM/DD/YYYY", 
  className, 
  icon,
  mode = "button"
}: DatePickerProps) {
  // Store the actual date object for the calendar
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined
    if (date instanceof Date) return date
    const parsed = parseISO(date.toString())
    return isValid(parsed) ? parsed : undefined
  }, [date])

  // Track the raw text in the input
  const [inputValue, setInputValue] = React.useState("")

  // Update input text when date prop changes (e.g. from calendar selection)
  React.useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, "MM/dd/yyyy"))
    } else if (!date) {
      setInputValue("")
    }
  }, [selectedDate, date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Attempt to parse multiple formats
    const formats = ["MM/dd/yyyy", "MM-dd-yyyy", "yyyy-MM-dd", "MMddyyyy"]
    let parsedDate: Date | null = null

    for (const f of formats) {
      const p = parse(value, f, new Date())
      if (isValid(p) && p.getFullYear() > 1900) {
        parsedDate = p
        break
      }
    }

    // If we found a valid date, update the parent state
    if (parsedDate) {
      setDate(format(parsedDate, "yyyy-MM-dd"))
    }
  }

  // --- RENDERING MODES ---

  // Premium Button Mode (Default - Original look for Encounter Date, etc.)
  if (mode === "button") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-full w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold transition-all hover:bg-slate-100/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-900/50",
              !selectedDate && "text-slate-500",
              className
            )}
          >
            <span className={cn("truncate", !selectedDate && "opacity-60")}>
              {selectedDate ? format(selectedDate, "PPP") : (placeholder === "MM/DD/YYYY" ? "Select date..." : placeholder)}
            </span>
            {icon || <CalendarIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl" align="start">
          <Calendar
            selected={selectedDate}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(format(newDate, "yyyy-MM-dd"))
              }
            }}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Smart Input Mode (Unified look for Date of Birth typing)
  return (
    <div className={cn(
      "group relative flex items-center w-full h-full rounded-2xl transition-all duration-300",
      className
    )}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-5 text-[14px] font-bold text-slate-900 outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none placeholder:text-slate-400 placeholder:font-normal dark:text-slate-100 shadow-none hover:shadow-none"
      />
      
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-50 hover:text-indigo-500 transition-all dark:hover:bg-slate-900"
          >
            {icon || <CalendarIcon className="h-4 w-4" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl" align="end">
          <Calendar
            selected={selectedDate}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(format(newDate, "yyyy-MM-dd"))
                setInputValue(format(newDate, "MM/dd/yyyy"))
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
