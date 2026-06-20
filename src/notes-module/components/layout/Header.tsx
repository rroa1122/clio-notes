import { Search, Calendar as CalendarIcon, Bell, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/notes-module/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clinics, mockStatsClinic1 } from "@/notes-module/lib/mock-data";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export function Header() {
    return (
        <header className="flex items-center justify-between h-16 px-8 border-b bg-background">
            <div className="flex items-center gap-4 flex-1">
                <Select defaultValue="clinic-1">
                    <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0 font-medium h-8">
                        <SelectValue placeholder="Select Clinic" />
                    </SelectTrigger>
                    <SelectContent>
                        {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                                {clinic.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="h-4 w-px bg-border mx-2" />
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search calls or patients..."
                        className="pl-9 bg-muted/50 border-none shadow-none h-9 text-xs focus-visible:ring-1"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="gap-2 text-muted-foreground font-normal h-8">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="text-[13px]">Dec 01, 2025 - Dec 22, 2025</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
                    <Bell className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
