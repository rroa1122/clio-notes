import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogoIcon, SunIcon, MoonIcon, LogOutIcon, UserCircleIcon } from './Icons';
import UnsavedChangesModal from './UnsavedChangesModal';

interface LayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, headerActions }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Dictate' },
    { path: '/templates', label: 'Templates' },
    { path: '/history', label: 'History' },
  ];

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigationAttempt = (path: string, e?: React.MouseEvent) => {
    const isDirty = (window as any).__CLIO_DIRTY;

    // If staying on the same page (/), check if we just want a reset
    if (isDirty && (location.pathname !== path || path === '/')) {
      if (e) e.preventDefault();
      setPendingPath(path);
      setIsGuardModalOpen(true);
      return;
    }

    // Normal navigation
    if (path === '/') {
      window.dispatchEvent(new CustomEvent('clio-reset-workspace'));
    }
  };

  const handleSaveAndExit = async () => {
    const saveFn = (window as any).__CLIO_SAVE_FUNCTION;
    if (saveFn) {
      setIsSaving(true);
      const success = await saveFn();
      setIsSaving(false);
      if (success) {
        setIsGuardModalOpen(false);
        if (pendingPath === 'LOGOUT') {
          logout();
          setIsMenuOpen(false);
        } else if (pendingPath) {
          navigate(pendingPath);
          if (pendingPath === '/') {
            window.dispatchEvent(new CustomEvent('clio-reset-workspace'));
          }
        }
      }
    } else {
      // Fallback if save function is missing (e.g. component unmounted)
      handleDiscardAndExit();
    }
  };

  const handleDiscardAndExit = () => {
    setIsGuardModalOpen(false);
    if (pendingPath === 'LOGOUT') {
      logout();
      setIsMenuOpen(false);
    } else if (pendingPath) {
      navigate(pendingPath);
      if (pendingPath === '/') {
        window.dispatchEvent(new CustomEvent('clio-reset-workspace'));
      }
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background font-inter overflow-x-hidden group/design-root transition-colors duration-300 selection:bg-teal-100 selection:text-teal-900">
      <div className="layout-container flex h-auto min-h-full grow flex-col">
        {/* Unified Modern Header */}
        <header className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 md:px-8 print:hidden transition-all duration-300">
          <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">

            {/* Left: Branding */}
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-3 group"
                onClick={(e) => handleNavigationAttempt('/', e)}
              >
                <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white transition-all duration-500 group-hover:rotate-6 shadow-lg shadow-teal-500/20">
                  <LogoIcon size={22} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white font-display uppercase leading-none">
                    Clio<span className="text-primary"> Notes</span>
                  </h2>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Clinical Workspace</span>
                </div>
              </Link>
            </div>

            {/* Center: Clinical Pill Navigation */}
            <nav className="hidden lg:flex items-center p-1.5 bg-slate-100/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {navItems
                  .filter(item => item.label !== 'Templates' || user?.email === 'reinier.roa2.0@gmail.com')
                  .map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={(e) => handleNavigationAttempt(item.path, e)}
                        className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${isActive
                          ? 'bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </nav>

            {/* Right: Actions & User Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {headerActions}

                <button
                  onClick={toggleTheme}
                  className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-300"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
                </button>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block mx-2"></div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 pl-3 pr-1.5 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl group transition-all hover:border-primary/30"
                >
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">
                      {(user?.name || 'Account').split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-bold text-primary uppercase tracking-tighter opacity-80">Physician</span>
                  </div>
                  <div
                    className={`size-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden transition-all duration-500 ring-2 ${isMenuOpen ? 'ring-primary' : 'ring-transparent'}`}
                    style={user?.avatar ? { backgroundImage: `url("${user.avatar}")`, backgroundSize: 'cover' } : {}}
                  >
                    {!user?.avatar && (
                      <span className="text-[11px] font-black text-primary tracking-widest">
                        {(user?.name?.[0] || 'D').toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>

                {/* Premium Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-4 w-72 glass-effect rounded-2xl shadow-2xl py-2 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Session Active</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">{user?.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary rounded-xl transition-all font-bold"
                      >
                        <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                          <UserCircleIcon size={18} />
                        </div>
                        Account Settings
                      </button>

                      <button
                        onClick={() => {
                          const isDirty = (window as any).__CLIO_DIRTY;
                          if (isDirty) {
                            setPendingPath('LOGOUT');
                            setIsGuardModalOpen(true);
                          } else {
                            logout();
                            setIsMenuOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold"
                      >
                        <div className="size-8 rounded-lg bg-red-50 dark:bg-red-500/5 flex items-center justify-center">
                          <LogOutIcon size={18} />
                        </div>
                        Sign out session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full pb-20 max-w-7xl mx-auto px-6 md:px-8 lg:px-10">
          {children}
        </main>
      </div>

      <UnsavedChangesModal
        isOpen={isGuardModalOpen}
        onClose={() => setIsGuardModalOpen(false)}
        onDiscard={handleDiscardAndExit}
        onSaveAndExit={handleSaveAndExit}
        isSaving={isSaving}
      />
    </div>
  );
};

export default Layout;
