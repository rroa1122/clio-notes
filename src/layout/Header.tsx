import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Phone,
    Users,
    LogOut,
    FileText,
    Mic,
    Settings,
    Menu,
    X
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Header() {
    const { signOut, user } = useAuth();
    const { pathname } = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const fullName = (user?.first_name && user?.last_name)
        ? `${user.first_name} ${user.last_name}`
        : user?.name || 'User';

    const isPrimaryAdmin = user?.email === 'reinier.roa2.0@gmail.com';

    // Combinar todos los enlaces en un solo menú principal
    const navItems = [
        { icon: Mic, label: 'New encounter', path: '/notes/new' },
        { icon: FileText, label: 'Clinical history', path: '/notes/history' },
        { icon: Users, label: 'Clients', path: '/patients' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full bg-[#0a0c16] border-b border-white/10 text-white shadow-sm">
            <div className="h-16 flex items-center justify-between px-4 md:px-8 max-w-[1600px] mx-auto">
                {/* 1. Logo Area */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center">
                        <svg 
                            viewBox="0 0 24 24" 
                            className="size-8"
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <linearGradient id="header-g4" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="50%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                            <style>{`
                                @keyframes header-spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                                @keyframes header-breathe {
                                    0%, 100% { transform: translateY(0); }
                                    50% { transform: translateY(-1.5px); }
                                }
                                .header-grp {
                                    transform-origin: 12px 12px;
                                    animation: header-spin 40s linear infinite;
                                }
                                .header-fnl {
                                    animation: header-breathe 3s ease-in-out infinite;
                                    transform-origin: 12px 12px;
                                    fill: url(#header-g4);
                                }
                            `}</style>
                            <g className="header-grp">
                                <g transform="rotate(0 12 12)">
                                    <path className="header-fnl" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                </g>
                                <g transform="rotate(180 12 12)">
                                    <path className="header-fnl" d="M12 2C10.5 2 9 3.5 8 5L12 12L16 5C15 3.5 13.5 2 12 2Z" />
                                </g>
                            </g>
                        </svg>
                    </div>
                    <span className="text-base font-black tracking-[0.25em] bg-gradient-to-r from-white via-slate-300 to-sky-400 bg-clip-text text-transparent hidden sm:block transition-all duration-300 hover:tracking-[0.3em]">CLIO NOTES</span>
                </div>

                {/* 2. Desktop Navigation (Center) */}
                <nav className="hidden md:flex items-center gap-2 justify-center flex-1 mx-8">
                    {navItems.map((item) => {
                        const isActive = item.path === '/notes/new' ? pathname === '/notes/new' : pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-2 px-4 h-9 rounded-full text-sm font-semibold transition-all duration-200",
                                    isActive
                                        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn("size-4", isActive ? "opacity-100" : "opacity-70")} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* 3. User Profile & Mobile Menu Toggle */}
                <div className="flex items-center gap-4 shrink-0">
                    
                    {/* User Avatar */}
                    <div className="hidden sm:flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-300 hidden lg:block">{fullName}</span>
                        <div className="h-9 w-9 rounded-full overflow-hidden border border-white/20 bg-white/5 shadow-md ring-1 ring-white/10">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&bold=true`}
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    <div className="w-px h-6 bg-white/10 hidden sm:block mx-1" />

                    <button
                        onClick={() => signOut()}
                        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 -mr-2 text-white/70 hover:text-white transition-colors"
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-white/10 bg-[#0a0c16]/95 backdrop-blur-md absolute top-16 left-0 w-full shadow-2xl">
                    <nav className="flex flex-col p-4 gap-2">
                        {navItems.map((item) => {
                            const isActive = item.path === '/notes/new' ? pathname === '/notes/new' : pathname.startsWith(item.path);
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold transition-all duration-200",
                                        isActive
                                            ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("size-5", isActive ? "opacity-100" : "opacity-70")} />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                        <div className="h-px bg-white/10 my-2" />
                        <button
                            onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                            className="flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <LogOut className="size-5" />
                            <span>Sign out</span>
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
}
