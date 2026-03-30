'use client';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { systemAPI } from '../../services/api';

// --- Icons (inline SVG helpers) ---
const Icon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const navConfig = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['all'] },
    ]
  },
  {
    group: 'HR',
    items: [
      { label: 'Employees', href: '/employees', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0', roles: ['superadmin', 'admin', 'hr', 'manager'] },
      { label: 'Attendance', href: '/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', roles: ['all'] },
      { label: 'Leaves', href: '/leaves', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['all'] },
      { label: 'Payroll', href: '/payroll', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', roles: ['superadmin', 'admin', 'hr', 'accountant'] },
    ]
  },
  {
    group: 'Projects',
    items: [
      { label: 'Projects', href: '/projects', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', roles: ['all'] },
      { label: 'Tasks', href: '/tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', roles: ['all'] },
    ]
  },
  {
    group: 'ERP',
    items: [
      { label: 'Clients', href: '/clients', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', roles: ['superadmin', 'admin', 'accountant'] },
      { label: 'Vendors', href: '/vendors', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', roles: ['superadmin', 'admin', 'accountant'] },
      { label: 'Invoices', href: '/invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['superadmin', 'admin', 'accountant'] },
      { label: 'Expenses', href: '/expenses', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['superadmin', 'admin', 'accountant', 'employee'] },
      { label: 'Inventory', href: '/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', roles: ['superadmin', 'admin'] },
      { label: 'Sales', href: '/sales', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', roles: ['superadmin', 'admin', 'accountant'] },
    ]
  },
  {
    group: 'Reports',
    items: [
      { label: 'Reports', href: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: ['superadmin', 'admin', 'hr', 'accountant', 'manager'] },
    ]
  },
  {
    group: 'System',
    items: [
      { label: 'Announcements', href: '/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', roles: ['all'] },
      { label: 'Tickets', href: '/tickets', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', roles: ['all'] },
      { label: 'Settings', href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', roles: ['superadmin', 'admin'] },
    ]
  }
];

function Sidebar({ collapsed, mobileOpen }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || 'employee';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">E</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <h1>EMS ERP</h1>
            <span>Management System</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navConfig.map((group) => {
          const visibleItems = group.items.filter(item =>
            item.roles.includes('all') || item.roles.includes(role)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div className="nav-group" key={group.group}>
              <div className="nav-group-label">{group.group}</div>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon path={item.icon} size={18} />
                    <span className="nav-item-text">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Navbar({ onToggleSidebar, collapsed }) {
  const { user, logout, token } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [activeNotif, setActiveNotif] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && token) {
      const socket = io('http://localhost:5000', {
        auth: { token: localStorage.getItem('ems_token') }
      });
      socketRef.current = socket;

      socket.on('notification:new', (notif) => {
        setNotifications(prev => [notif, ...prev]);
        setUnread(prev => prev + 1);
        setActiveNotif(notif);
      });

      return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }
  }, [user, token]);

  useEffect(() => {
    systemAPI.getNotifications().then(res => {
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    }).catch(() => { });
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await systemAPI.markAsRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllRead = async () => {
    try {
      await systemAPI.markAsRead('all');
      setNotifications([]);
      setUnread(0);
    } catch { }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'U';

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <nav className={`navbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        <button className="icon-btn" onClick={onToggleSidebar}>
          <Icon path="M4 6h16M4 12h16M4 18h16" size={20} />
        </button>
        <div className="navbar-search">
          <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" size={16} />
          <input type="text" placeholder="Search..." />
        </div>
      </div>

      <div className="navbar-right">
        <button className="icon-btn" onClick={toggleTheme} title={darkMode ? 'Light Mode' : 'Dark Mode'}>
          <Icon path={darkMode ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'} size={18} />
        </button>

        <div className="dropdown">
          <button className="icon-btn" onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}>
            <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={18} />
            {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {showNotif && (
            <div className="notification-panel">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkAllRead} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Mark all read
                  </button>
                )}
              </div>
              {unreadNotifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications</div>
              ) : unreadNotifications.slice(0, 8).map(n => (
                <div key={n._id} className="notification-item unread" style={{ cursor: 'pointer' }} onClick={() => handleMarkRead(n._id)}>
                  <div className="notification-icon bg-primary-soft" style={{ color: 'var(--primary)' }}>
                    <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={16} />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {n.title}
                      <span style={{ fontSize: 8, background: 'var(--primary)', width: 6, height: 6, borderRadius: '50%', marginTop: 4 }}></span>
                    </div>
                    <div className="notification-msg">{n.message}</div>
                    <div className="notification-time">{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dropdown">
          <div className="avatar" onClick={() => { setShowUser(!showUser); setShowNotif(false); }}>
            {initials}
          </div>
          {showUser && (
            <div className="dropdown-menu">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.firstName} {user?.lastName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.role}</div>
              </div>
              <Link href="/profile" className="dropdown-item" onClick={() => setShowUser(false)}>
                <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" size={16} />
                My Profile
              </Link>
              <Link href="/settings" className="dropdown-item" onClick={() => setShowUser(false)}>
                <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" size={16} />
                Settings
              </Link>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item danger" onClick={handleLogout}>
                <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={16} />
                Logout
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Notification Popup */}
      {activeNotif && (
        <div className="modal-overlay" style={{ zIndex: 20000 }}>
          <div className="modal modal-sm" style={{ padding: 24, textAlign: 'center', maxWidth: 400 }}>
            <div style={{ width: 64, height: 64, background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{activeNotif.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>{activeNotif.message}</p>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>From: <strong>{activeNotif.sender}</strong></div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { if (activeNotif._id) handleMarkRead(activeNotif._id); setActiveNotif(null); }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        const { target } = e;
        // Ignore if focus is in a TEXTAREA (need Enter for new line) or if it's a BUTTON/SUBMIT
        if (target.tagName === 'TEXTAREA') return;
        if (target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && target.type === 'submit')) return;

        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
          e.preventDefault(); // Stop form submission

          // Find all focusable elements in the document
          const focusable = Array.from(document.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.disabled && el.offsetParent !== null); // Only visible and enabled

          const index = focusable.indexOf(target);
          if (index > -1 && index < focusable.length - 1) {
            focusable[index + 1].focus();
            if (focusable[index + 1].tagName === 'INPUT' && focusable[index + 1].type !== 'file') {
              focusable[index + 1].select?.(); // Auto-select text for easier editing
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} />
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar onToggleSidebar={() => setCollapsed(!collapsed)} collapsed={collapsed} />
        <main className="page-content">
          {children}
        </main>
      </div>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
        />
      )}
    </div>
  );
}

export default function DashboardLayoutWrapper({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </ThemeProvider>
    </AuthProvider>
  );
}
