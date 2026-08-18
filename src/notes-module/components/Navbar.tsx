import { Bell, User, Moon, Sun, LogOut, ChevronDown, UserCircle, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <header className="sticky top-0 z-50 h-16 w-full px-6 md:px-8 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-border/60 no-print transition-colors duration-300">
        <button
          className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-white/5 border border-transparent hover:border-border/60 transition-all md:hidden cursor-pointer"
          onClick={onMenuClick}
          aria-label="Toggle Menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <button
            className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-white/5 border border-transparent hover:border-border/60 transition-all duration-200 cursor-pointer"
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>

          <button
            className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-white/5 border border-transparent hover:border-border/60 transition-all duration-200 relative cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} strokeWidth={2} />
            {user && (
              <span className="absolute top-2 right-2 size-2 bg-primary rounded-full ring-2 ring-background"></span>
            )}
          </button>

          <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block"></div>

          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 bg-card/60 dark:bg-card/40 hover:bg-card border border-border/60 rounded-2xl group transition-all duration-200 hover:border-primary/40 hover:shadow-soft cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div
                className={`size-8 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold text-xs ring-2 ${isMenuOpen ? 'ring-primary' : 'ring-transparent'} group-hover:ring-primary/40 transition-all duration-300 overflow-hidden`}
              >
                {user?.name ? (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <User size={16} strokeWidth={2.5} />
                )}
              </div>
              <div className="flex flex-col items-start hidden sm:flex leading-none">
                <span className="text-xs font-bold text-foreground tracking-tight">
                  {user?.name || 'Physician'}
                </span>
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider mt-0.5 opacity-80">
                  Clinical User
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 group-hover:text-foreground ml-0.5 ${isMenuOpen ? 'rotate-180 text-primary' : ''}`}
              />
            </button>

            {/* Premium Frosted Glassmorphism Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-3 w-72 backdrop-blur-xl bg-card/95 border border-border/60 shadow-elevated rounded-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-200 origin-top-right">
                <div className="px-4 py-3 bg-secondary/50 dark:bg-secondary/30 rounded-xl mb-1 border border-border/40">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Active Session</p>
                  <p className="text-xs font-bold text-foreground truncate mt-0.5">{user?.email}</p>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-foreground/80 hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-150 group cursor-pointer"
                  >
                    <div className="size-8 rounded-lg bg-background/80 border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <UserCircle size={18} />
                    </div>
                    <span>Profile Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-150 group cursor-pointer"
                  >
                    <div className="size-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform">
                      <LogOut size={18} />
                    </div>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
