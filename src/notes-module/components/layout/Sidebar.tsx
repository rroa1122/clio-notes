import { NavLink } from "react-router-dom";
import {
    Home,
    PhoneCall,
    Calendar,
    ShieldCheck,
    Settings,
    Mic
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Call Logs", href: "/calls", icon: PhoneCall },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Quality Assurance", href: "/quality", icon: ShieldCheck },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "New Note", href: "/notes/new", icon: Mic },
];

export function Sidebar() {
    return (
        <div className="flex flex-col w-64 border-r bg-muted/30 h-screen">
            <div className="flex items-center h-16 px-6 border-b">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <PhoneCall className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span>MedVoice AI</span>
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-background text-foreground shadow-sm border border-border"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-[10px] font-bold text-muted-foreground">SJ</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">Dr. Sarah Jenkins</span>
                        <span className="text-[10px] text-muted-foreground">Green Valley Medical</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
