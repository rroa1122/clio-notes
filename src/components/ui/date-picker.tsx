import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, parseISO, isValid, parse } from "date-fns"
import { es } from "date-fns/locale"
import { useLanguage } from "../../context/LanguageContext"

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
  dateFormat?: string
}

export function DatePicker({ 
  date, 
  setDate, 
  placeholder = "MM/DD/YYYY", 
  className, 
  icon,
  mode = "button",
  dateFormat
}: DatePickerProps) {
  const { language } = useLanguage();
  // Store the actual date object for the calendar
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined
    if (date instanceof Date) return date
    const parsed = parseISO(date.toString())
    return isValid(parsed) ? parsed : undefined
  }, [date])

  // Track the raw text in the input
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  // Update input text when date prop changes (e.g. from calendar selection)
  React.useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, "MM/dd/yyyy", { locale: language === 'es' ? es : undefined }))
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
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-full w-full items-center justify-between px-3 text-xs font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer bg-transparent border-0 shadow-none",
              !selectedDate && "text-muted-foreground",
              className
            )}
          >
            <span className={cn("truncate", !selectedDate && "opacity-70")}>
              {selectedDate ? format(selectedDate, dateFormat || "PPP", { locale: language === 'es' ? es : undefined }) : (placeholder === "MM/DD/YYYY" ? (language === 'es' ? "Seleccionar fecha..." : "Select date...") : placeholder)}
            </span>
            {icon || <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[270px] p-2.5 rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card/98 backdrop-blur-xl" align="start" sideOffset={8}>
          <Calendar
            selected={selectedDate}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(format(newDate, "yyyy-MM-dd"))
                setIsOpen(false)
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
        className="h-full w-full bg-transparent px-5 text-[14px] font-bold text-foreground outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none placeholder:text-muted-foreground placeholder:font-normal shadow-none hover:shadow-none"
      />
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition-all cursor-pointer"
          >
            {icon || <CalendarIcon className="h-4 w-4" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[270px] p-2.5 rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card/98 backdrop-blur-xl" align="end" sideOffset={8}>
          <Calendar
            selected={selectedDate}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(format(newDate, "yyyy-MM-dd"))
                setIsOpen(false)
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
