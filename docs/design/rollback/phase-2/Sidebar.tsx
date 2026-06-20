import { useLocation, NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Phone,
    Users,
    LogOut,
    Sparkles,
    FileText,
    Mic
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
    const { signOut, user } = useAuth();
    const { pathname } = useLocation();
    const displayName = user?.name || 'User';
    const displayRole = user?.role || 'Clinician';

    const assistantItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/' },
        { icon: Phone, label: 'Calls registry', path: '/calls' },
        { icon: Users, label: 'Patients directory', path: '/patients' },
    ];

    const notesItems = [
        { icon: FileText, label: 'Clinical history', path: '/notes' },
        { icon: Mic, label: 'New encounter', path: '/notes/new' },
        { icon: Sparkles, label: 'Templates', path: '/notes/templates' },
    ];

    const notesPaths = notesItems.map(i => i.path);
    const activeApp = notesPaths.some(p => pathname.startsWith(p)) ? 'notes' : 'assistant';

    const activeItems = activeApp === 'assistant' ? assistantItems : notesItems;
    const activeTitle = activeApp === 'assistant' ? 'Clio Assistant' : 'Clinical Notes';

    return (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-[#0a0c16] text-white transition-all duration-300 md:flex border-r border-white/5 overflow-hidden">
            {/* Header / Brand Area */}
            <div className="relative z-10 flex h-[56px] items-center px-3 border-b border-white/5">
                <div className="flex items-center gap-3 px-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20 ring-1 ring-white/10">
                        <Sparkles className="size-[16px]" />
                    </div>
                    <span className="text-[14px] font-bold tracking-[0.02em] text-slate-100">Clio</span>
                </div>
            </div>

            {/* App Switcher (OS Segmented Control) */}
            <div className="p-4 relative z-10">
                <div className="flex flex-col gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5">
                    <NavLink
                        to="/"
                        className={({ isActive }) => cn(
                            "flex items-center justify-center h-9 px-4 rounded-xl text-[13px] transition-all duration-200",
                            activeApp === 'assistant'
                                ? "bg-white/10 text-white font-semibold shadow-sm ring-1 ring-white/5 h-8.5"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200 font-medium"
                        )}
                    >
                        Clio Assistant
                    </NavLink>
                    <NavLink
                        to="/notes"
                        className={({ isActive }) => cn(
                            "flex items-center justify-center h-9 px-4 rounded-xl text-[13px] transition-all duration-200",
                            activeApp === 'notes'
                                ? "bg-white/10 text-white font-semibold shadow-sm ring-1 ring-white/5 h-8.5"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200 font-medium"
                        )}
                    >
                        Clinical Notes
                    </NavLink>
                </div>
            </div>

            {/* Navigation Scroll Area */}
            <div className="relative z-10 flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-4">
                <div className="space-y-1 relative">
                    <nav className="flex flex-col gap-0.5">
                        {activeItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/notes' || item.path === '/'}
                                className={({ isActive }) =>
                                    cn(
                                        "group relative flex items-center h-9 px-3 gap-3 rounded-xl transition-all duration-150 outline-none",
                                        isActive
                                            ? "bg-white/8 text-white font-semibold shadow-sm ring-1 ring-white/5"
                                            : "text-slate-500 hover:bg-white/5 hover:text-slate-200 font-medium"
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                            <item.icon className={cn("size-[14.5px] transition-all duration-150", isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100")} />
                                        </div>
                                        <span className="text-[13px] tracking-tight leading-none mb-[-0.5px]">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Sticky Footer Area */}
            <div className="relative mt-auto flex flex-col gap-4 p-4 border-t border-white/5">
                {/* User Profile */}
                <div className="flex items-center gap-3 px-1">
                    <div className="h-9 w-9 overflow-hidden rounded-xl border border-white/10 bg-white/5 shrink-0 shadow-inner">
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&bold=true`}
                            alt="User"
                            className="w-full h-full opacity-90"
                        />
                    </div>
                    <div className="flex-1 overflow-hidden ml-0.5">
                        <p className="truncate text-slate-100 font-bold text-[13px] tracking-tight leading-none mb-1.5">{displayName}</p>
                        <p className="truncate text-slate-500 text-[10px] font-bold tracking-[0.06em] leading-none uppercase">{displayRole}</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); signOut(); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/20 hover:text-white/60 transition-all shrink-0"
                        title="Sign out"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
