import { Bell, User, Moon, Sun, LogOut, ChevronDown, UserCircle, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync with system or saved preference
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    setIsDark(isDarkTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

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
      <header className="navbar no-print">
        <button
          className="icon-btn mobile-menu-toggle mobile-only"
          onClick={onMenuClick}
          aria-label="Toggle Menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1"></div>
        <div className="navbar-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
            {isDark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
          </button>

          <button className="icon-btn" title="Notifications">
            <Bell size={20} strokeWidth={2} />
            {user && <span className="notification-badge"></span>}
          </button>

          <div className="navbar-divider"></div>

          <div className="user-profile" ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="user-profile-trigger"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="avatar">
                <User size={18} strokeWidth={2.5} />
              </div>
              <div className="user-info hidden-mobile-text">
                <span className="user-name">{user?.name}</span>
              </div>
              <ChevronDown size={14} className="hidden-mobile" style={{ opacity: 0.5, transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Premium User Dropdown Menu */}
            {isMenuOpen && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <p className="dropdown-header-label">Active Session</p>
                  <p className="dropdown-header-email">{user?.email}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button className="dropdown-item">
                    <UserCircle size={18} />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    onClick={() => logout()}
                    className="dropdown-item danger"
                  >
                    <LogOut size={18} />
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
