import React, { useState, useEffect } from 'react';
import '../Admin/admin.css';
import UserDashboard from './UserDashboard';
import UserResources from './UserResources';
import UserSessions from './UserSessions';
import UserSettings from './UserSettings';

function UserLayout({ currentUser, onExitUserPanel, onSwitchPortal, onLogout }) {
  const getInitialTab = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const search = new URLSearchParams(window.location.search);
    const tabParam = search.get('tab');
    if (tabParam) return tabParam;
    if (path.includes('/user/resources') || path.includes('/tools')) return 'resources';
    if (path.includes('/user/sessions') || path.includes('/devices')) return 'sessions';
    if (path.includes('/user/settings') || path.includes('/profile')) return 'settings';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    const targetUrl = tab === 'dashboard' ? '/dashboard' : `/user/${tab}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ userTab: tab }, '', targetUrl);
    }
  };

  useEffect(() => {
    const handlePop = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('ccna_auth_token');
      const res = await fetch(`${API_BASE}/user/dashboard`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.user || data.sharedAccountsCount !== undefined) {
        setDashboardData(data);
      }
    } catch (e) {
      console.warn('User dashboard API notice:', e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return '⚡ User Dashboard';
      case 'resources': return '🚀 Shared Tools & Accounts';
      case 'sessions': return '💻 Connected Devices';
      case 'settings': return '👤 My Account Profile';
      default: return 'User Portal';
    }
  };

  return (
    <div className="admin-portal-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand-block">
            <div className="admin-brand-icon">⚡</div>
            <div>
              <div className="admin-brand-title">ToolsByDcx</div>
              <div className="admin-brand-subtitle">User Portal</div>
            </div>
          </div>
          {mobileOpen && (
            <button
              type="button"
              className="admin-mobile-toggle"
              onClick={() => setMobileOpen(false)}
            >
              ✕
            </button>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section-title">Overview</div>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => switchTab('dashboard')}
          >
            <span className="admin-nav-icon">📊</span>
            <span>Dashboard</span>
          </button>

          <div className="admin-nav-section-title">Resources</div>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => switchTab('resources')}
          >
            <span className="admin-nav-icon">🚀</span>
            <span>Shared Tools</span>
          </button>

          <div className="admin-nav-section-title">Account</div>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => switchTab('sessions')}
          >
            <span className="admin-nav-icon">💻</span>
            <span>Connected Devices</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => switchTab('settings')}
          >
            <span className="admin-nav-icon">👤</span>
            <span>My Profile</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          {currentUser?.role === 'admin' && onSwitchPortal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn-admin-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onSwitchPortal('admin')}
              >
                ⚙️ Switch to Admin Portal
              </button>
              <button
                type="button"
                className="btn-admin-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onSwitchPortal('reseller')}
              >
                🤝 Reseller Portal View
              </button>
            </div>
          )}
          {currentUser?.role === 'admin' ? (
            <button
              type="button"
              className="btn-admin-back"
              onClick={onExitUserPanel}
            >
              <span>⬅️</span>
              <span>Back to Admin</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-admin-back"
              onClick={onLogout}
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="admin-viewport">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              ☰
            </button>
            <h1 className="admin-page-title">{getPageTitle()}</h1>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-server-badge">
              <span className="admin-pulse-dot"></span>
              <span>Account Active</span>
            </div>

            <div className="admin-user-capsule">
              <div className="admin-user-avatar">
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="admin-user-name">
                {currentUser?.name || 'User'}
              </span>
              {onLogout && (
                <button
                  type="button"
                  title="Sign out"
                  onClick={onLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="admin-content-area">
          {activeTab === 'dashboard' && (
            <UserDashboard
              dashboardData={dashboardData}
              onNavigate={(tab) => switchTab(tab)}
              onLaunchResource={(acc) => {
                const url = acc?.target_url || 'https://labs.google/fx/tools/flow';
                window.dispatchEvent(new CustomEvent('__flow_launch_account__', {
                  detail: { accountId: acc?.id, service: acc?.service, targetUrl: url }
                }));
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            />
          )}

          {activeTab === 'resources' && <UserResources />}

          {activeTab === 'sessions' && <UserSessions />}

          {activeTab === 'settings' && (
            <UserSettings
              currentUser={currentUser}
              onProfileUpdated={() => {
                fetchDashboard();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default UserLayout;
