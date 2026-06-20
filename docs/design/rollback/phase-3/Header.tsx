
import { Bell, Search, Menu, RefreshCw, Command } from 'lucide-react';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import { useCalls } from '../context/CallsContext';
import { useLocation } from 'react-router-dom';

export function Header() {
    const { isPolling } = useCalls();
    const location = useLocation();

    // Ultra Minimal Canvas: Hide global top bar on Overview and New Note
    if (location.pathname === '/' || location.pathname === '/notes/new') return null;

    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-background/80 px-4 md:px-8 backdrop-blur-md border-b border-border/60 transition-all duration-200 shadow-sm">
            {/* Left Section: Context Indicator */}
            <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-slate-500">
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50/50 rounded-xl border border-slate-200/60 shadow-none group cursor-default">
                    <Command className="h-3 w-3 text-primary/60 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80">
                        Clio OS <span className="mx-1.5 opacity-30">/</span> v2.4.0
                    </span>
                </div>
            </div>

            {/* Center: Search (Minimalist) */}
            <div className="hidden lg:flex items-center relative w-96 max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search records, patients..."
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/50 pl-11 pr-4 text-sm font-medium ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-white transition-all shadow-none"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
                {/* Sync Status Badge */}
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 shadow-none",
                    isPolling
                        ? "bg-primary/5 border-primary/20 text-primary animate-pulse"
                        : "bg-slate-50/50 border-slate-200/60 text-slate-500"
                )}>
                    {isPolling ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    <span className="hidden sm:inline">
                        {isPolling ? "Syncing" : "Live"}
                    </span>
                </div>

                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-slate-500">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                </Button>
            </div>
        </header>
    );
}
