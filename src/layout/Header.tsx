import { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../notes-module/context/ThemeContext';
import {
    Users,
    LogOut,
    FileText,
    Mic,
    Settings,
    Menu,
    X,
    Shield,
    Globe,
    Sun,
    Moon,
    Terminal,
    RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Header() {
    const { signOut, user } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const { pathname } = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const fullName = (user?.first_name && user?.last_name)
        ? `${user.first_name} ${user.last_name}`
        : user?.name || 'User';

    const firstLastName = user?.last_name ? user.last_name.trim().split(/\s+/)[0] : '';
    const displayName = (user?.first_name && firstLastName)
        ? `${user.first_name} ${firstLastName}`
        : user?.name ? user.name.trim().split(/\s+/).slice(0, 2).join(' ') : 'User';

    const isAuthorized = user?.role === 'admin' || user?.email === 'reinier.roa2.0@gmail.com';

    // Desktop center navigation items (Only Encounters, History, Clients, Sync)
    const navItems = [
        { icon: Mic, label: language === 'es' ? 'Nuevo encuentro' : 'New encounter', path: '/notes/new' },
        { icon: FileText, label: language === 'es' ? 'Historial clínico' : 'Clinical history', path: '/notes/history' },
        { icon: Users, label: language === 'es' ? 'Clientes' : 'Clients', path: '/patients' },
        { icon: RefreshCw, label: language === 'es' ? 'Sincronización' : 'Amexzone Sync', path: '/sync' },
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
        <>
            <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 shadow-sm print:hidden">
            <div className="h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 w-full">
                {/* 1. Logo Area */}
                <Link
                    to="/notes/new"
                    onClick={() => {
                        sessionStorage.removeItem('clio_encounter_draft');
                        window.dispatchEvent(new CustomEvent('clio-reset-workspace'));
                    }}
                    className="flex items-center gap-3 shrink-0 group cursor-pointer"
                >
                    <div className="flex h-9 w-9 items-center justify-center">
                        <svg 
                            viewBox="0 0 24 24" 
                            className="size-8"
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <linearGradient id="header-g4" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#4338ca" />
                                    <stop offset="50%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#818cf8" />
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
                    <div className="flex items-center gap-1.5 font-black text-[15px] tracking-[0.22em] uppercase hidden sm:flex select-none">
                        <span className="text-slate-900 dark:text-white transition-colors">CLIO</span>
                        <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent drop-shadow-sm">NOTES</span>
                    </div>
                </Link>

                {/* 2. Navigation (Center) - Always visible with icons */}
                <nav className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 justify-center flex-1 mx-1 sm:mx-4 xl:mx-8 min-w-0">
                    {navItems.map((item) => {
                        const isActive = item.path === '/notes/new' ? pathname === '/notes/new' : pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => {
                                    if (item.path === '/notes/new') {
                                        sessionStorage.removeItem('clio_encounter_draft');
                                        window.dispatchEvent(new CustomEvent('clio-reset-workspace'));
                                    }
                                }}
                                title={item.label}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-2 sm:px-2.5 xl:px-4 h-8 sm:h-9 rounded-full text-sm font-semibold transition-all duration-200 border border-transparent shrink-0",
                                    isActive
                                        ? "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/20 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60"
                                )}
                            >
                                <item.icon className={cn("size-4 shrink-0", isActive ? "opacity-100" : "opacity-75")} />
                                <span className="hidden xl:inline whitespace-nowrap">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* 3. User Profile Dropdown & Theme Toggle */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 shrink-0">
                    
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="size-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                        title={theme === 'dark' ? (language === 'es' ? "Modo claro" : "Light mode") : (language === 'es' ? "Modo oscuro" : "Dark mode")}
                    >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>

                    {/* User Profile Dropdown */}
                    <div className="relative" id="user-dropdown-container">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 md:px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all select-none border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50"
                        >
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 hidden xl:block whitespace-nowrap">{displayName}</span>
                            <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shadow-sm ring-1 ring-slate-100 shrink-0">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&bold=true`}
                                    alt="User"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <svg className={cn("size-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 hidden sm:block", isDropdownOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{fullName}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">{user?.email}</p>
                                </div>

                                <div className="p-1.5 space-y-0.5">
                                    {user?.email === 'reinier.roa2.0@gmail.com' && (
                                        <NavLink
                                            to="/platform-admin"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all"
                                        >
                                            <Terminal size={14} className="opacity-75" />
                                            {t('nav.platform_admin', 'Platform Admin')}
                                        </NavLink>
                                    )}

                                    <NavLink
                                        to="/settings"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all"
                                    >
                                        <Settings size={14} className="opacity-75" />
                                        {t('nav.settings', 'Settings')}
                                    </NavLink>
                                    
                                    {isAuthorized && (
                                        <NavLink
                                            to="/audit-logs"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all"
                                        >
                                            <Shield size={14} className="opacity-75" />
                                            {t('nav.audit_logs', 'Audit logs')}
                                        </NavLink>
                                    )}

                                    {/* Language Switcher */}
                                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center gap-2.5">
                                            <Globe size={14} className="opacity-75" />
                                            <span>{language === 'es' ? 'Idioma' : 'Language'}</span>
                                        </div>
                                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-full border border-slate-200/50 dark:border-slate-800/50">
                                            <button
                                                onClick={() => setLanguage('en')}
                                                className={cn(
                                                    "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full transition-all duration-300",
                                                    language === 'en'
                                                        ? "bg-white dark:bg-slate-800 text-[#6366f1] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                                                        : "text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
                                                )}
                                            >
                                                EN
                                            </button>
                                            <button
                                                onClick={() => setLanguage('es')}
                                                className={cn(
                                                    "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full transition-all duration-300",
                                                    language === 'es'
                                                        ? "bg-white dark:bg-slate-800 text-[#6366f1] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                                                        : "text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
                                                )}
                                            >
                                                ES
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5" />

                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            signOut();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-left"
                                    >
                                        <LogOut size={14} />
                                        {t('nav.logout', 'Sign out')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
        </>
    );
}
