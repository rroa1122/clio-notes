import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    LogOut,
    FileText,
    Mic,
    Settings,
    Menu,
    X,
    Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Header() {
    const { signOut, user } = useAuth();
    const { pathname } = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const fullName = (user?.first_name && user?.last_name)
        ? `${user.first_name} ${user.last_name}`
        : user?.name || 'User';

    const isAuthorized = user?.role === 'admin' || user?.email === 'reinier.roa2.0@gmail.com';

    // Desktop center navigation items (Only Encounters, History, Clients)
    const navItems = [
        { icon: Mic, label: 'New encounter', path: '/notes/new' },
        { icon: FileText, label: 'Clinical history', path: '/notes/history' },
        { icon: Users, label: 'Clients', path: '/patients' },
    ];

    useEffect(() => {
        if (!isDropdownOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('#user-dropdown-container')) {
                setIsDropdownOpen(false);
            }
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [isDropdownOpen]);

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 text-slate-800 shadow-sm">
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
                                    <stop offset="0%" stopColor="#00f2fe" />
                                    <stop offset="50%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#6366f1" />
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
                    <span className="text-base font-black tracking-[0.25em] bg-gradient-to-r from-slate-900 via-indigo-950 to-[#6366f1] bg-clip-text text-transparent hidden sm:block transition-all duration-300 hover:tracking-[0.3em]">CLIO NOTES</span>
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
                                    "flex items-center gap-2 px-4 h-9 rounded-full text-sm font-semibold transition-all duration-200 border border-transparent",
                                    isActive
                                        ? "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/20 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                                )}
                            >
                                <item.icon className={cn("size-4", isActive ? "opacity-100" : "opacity-75")} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* 3. User Profile Dropdown & Mobile Menu Toggle */}
                <div className="flex items-center gap-4 shrink-0">
                    
                    {/* User Profile Dropdown (Desktop) */}
                    <div className="hidden sm:block relative" id="user-dropdown-container">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all select-none border border-transparent hover:border-slate-200/50"
                        >
                            <span className="text-sm font-semibold text-slate-700 hidden lg:block">{fullName}</span>
                            <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shadow-sm ring-1 ring-slate-100 shrink-0">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&bold=true`}
                                    alt="User"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <svg className={cn("size-3.5 text-slate-400 transition-transform duration-200", isDropdownOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                                <div className="px-4 py-2 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-800 truncate">{fullName}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <div className="p-1.5 space-y-0.5">
                                    <NavLink
                                        to="/settings"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all"
                                    >
                                        <Settings size={14} className="opacity-75" />
                                        Settings
                                    </NavLink>
                                    
                                    {isAuthorized && (
                                        <NavLink
                                            to="/audit-logs"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all"
                                        >
                                            <Shield size={14} className="opacity-75" />
                                            Audit logs
                                        </NavLink>
                                    )}

                                    <div className="h-px bg-slate-100 my-1.5" />

                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            signOut();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all text-left"
                                    >
                                        <LogOut size={14} />
                                        Log out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 -mr-2 text-slate-600 hover:text-slate-900 transition-colors"
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md absolute top-16 left-0 w-full shadow-2xl">
                    <nav className="flex flex-col p-4 gap-2">
                        {navItems.map((item) => {
                            const isActive = item.path === '/notes/new' ? pathname === '/notes/new' : pathname.startsWith(item.path);
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent",
                                        isActive
                                            ? "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/10 shadow-sm"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <item.icon className={cn("size-5", isActive ? "opacity-100" : "opacity-75")} />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                        
                        <div className="h-px bg-slate-200 my-1" />
                        
                        <NavLink
                            to="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent",
                                pathname.startsWith('/settings') ? "bg-[#6366f1]/10 text-[#6366f1]" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Settings className="size-5" />
                            <span>Settings</span>
                        </NavLink>

                        {isAuthorized && (
                            <NavLink
                                to="/audit-logs"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent",
                                    pathname.startsWith('/audit-logs') ? "bg-[#6366f1]/10 text-[#6366f1]" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Shield className="size-5" />
                                <span>Audit logs</span>
                            </NavLink>
                        )}

                        <div className="h-px bg-slate-200 my-1" />

                        <button
                            onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                            className="flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
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
