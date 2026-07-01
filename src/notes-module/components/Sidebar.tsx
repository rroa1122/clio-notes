import { NavLink } from 'react-router-dom';
import { Mic, History, ClipboardList, Settings, X, Users2 } from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onNavClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onNavClick }) => {
  const menuItems = [
    { icon: <Mic size={20} />, label: 'Record', path: '/record' },
    { icon: <History size={20} />, label: 'History', path: '/history' },
    { icon: <ClipboardList size={20} />, label: 'Templates', path: '/templates' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className={`sidebar no-print ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-icon">
            <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4Z" fill="url(#logo-gradient)" />
            <path d="M8 17.5H11.5L13.5 12L18.5 22L20.5 17.5H24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logo-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00f2fe" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="logo-brand">
            <span className="brand-clio">Clio</span>
            <span className="brand-notes">Notes</span>
          </div>
        </div>
        {isMobileOpen && (
          <button className="icon-btn-small mobile-only" onClick={onNavClick} style={{ marginLeft: 'auto' }}>
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <div className="nav-indicator"></div>
            <div className="nav-icon-wrapper">
              {item.icon}
            </div>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
