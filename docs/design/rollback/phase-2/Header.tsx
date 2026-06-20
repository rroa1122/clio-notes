
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
        <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between bg-background/40 px-8 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 border-b border-border/40">
            {/* Left Section: Context Indicator */}
            <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-muted-foreground">
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-muted/20 rounded-2xl border border-border/30 shadow-inner group cursor-default">
                    <Command className="h-3.5 w-3.5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Clio OS <span className="mx-2 opacity-20">/</span> v2.4.0
                    </span>
                </div>
            </div>

            {/* Center: Search (Minimalist) */}
            <div className="hidden lg:flex items-center relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <input
                    type="text"
                    placeholder="Search clinical records, patients, or voice logs..."
                    className="flex h-11 w-full rounded-2xl border border-border/40 bg-muted/10 pl-11 pr-4 text-[11px] font-bold uppercase tracking-tight ring-offset-background placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:bg-background/80 transition-all shadow-sm"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Sync Status Badge */}
                <div className={cn(
                    "flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all duration-700 shadow-sm",
                    isPolling
                        ? "bg-primary/5 border-primary/20 text-primary animate-pulse"
                        : "bg-muted/30 border-border/40 text-muted-foreground/50"
                )}>
                    {isPolling ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/40" />
                    )}
                    <span className="hidden sm:inline">
                        {isPolling ? "Synchronizing" : "Live Node"}
                    </span>
                </div>

                <div className="h-6 w-px bg-border/40 mx-1 hidden sm:block"></div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-2xl hover:bg-muted/30 border border-transparent hover:border-border/40 hover:shadow-sm transition-all text-muted-foreground/60">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                </Button>

                {/* Mobile Search/Profile triggers */}
                <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground/60">
                    <Search className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
