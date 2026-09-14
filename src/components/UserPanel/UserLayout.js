import React, { useState, useEffect } from 'react';
import '../Admin/admin.css';
import UserDashboard from './UserDashboard';
import UserResources from './UserResources';
import UserSessions from './UserSessions';
import UserProjects from './UserProjects';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function UserLayout({ currentUser, onExitUserPanel, onSwitchPortal, onLogout }) {
  const getInitialTab = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const search = new URLSearchParams(window.location.search);
    const tabParam = search.get('tab');
    if (tabParam) return tabParam;
    if (path.includes('/user/projects') || path.includes('/projects')) return 'projects';
    if (path.includes('/user/sessions') || path.includes('/devices')) return 'sessions';
    if (path.includes('/user/account-')) {
      const match = path.match(/\/user\/(account-[a-z0-9_-]+)/);
      if (match) return match[1];
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [accountTypes, setAccountTypes] = useState([]);
  const [selectedAccountType, setSelectedAccountType] = useState(null);

  const switchTab = (tab, accType = null) => {
    setActiveTab(tab);
    if (accType) setSelectedAccountType(accType);
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

  const fetchAccountTypes = async () => {
    try {
      const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
      const res = await fetch(`${API_BASE}/user/account-types`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.account_types)) {
        setAccountTypes(data.account_types);
      }
    } catch (e) {
      console.warn('User account types notice:', e);
    }
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
      const res = await authFetch(`${API_BASE}/user/dashboard`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (handleAuthError(res, data)) {
        if (onLogout) onLogout();
        return;
      }
      if (data.user || data.sharedAccountsCount !== undefined) {
        setDashboardData(data);
        if (data.accountTypes && Array.isArray(data.accountTypes)) {
          setAccountTypes(data.accountTypes);
        }
      }
    } catch (e) {
      console.warn('User dashboard API notice:', e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAccountTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getPageTitle = () => {
    if (activeTab === 'dashboard') return '⚡ User Dashboard';
    if (activeTab === 'projects') return '🎬 My Saved Projects';
    if (activeTab === 'sessions') return '💻 Connected Devices';
    if (activeTab.startsWith('account-')) {
      const slug = activeTab.replace('account-', '');
      const matched = accountTypes.find(at => at.slug === slug) || selectedAccountType;
      return `${matched?.icon || '🚀'} ${matched?.name || 'Account'}`;
    }
    return 'User Portal';
  };

  return (
    <div className="admin-portal-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand-block">
            <div className="admin-brand-icon">
              <img
                src="/logo.png"
                alt="Logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'block';
                }}
              />
              <span style={{ display: 'none', fontSize: '18px', color: '#22c55e' }}>⚡</span>
            </div>
            <div>
              <div className="admin-brand-title">ToolsBy<span>Dcx</span></div>
              <div className="admin-brand-subtitle">User Panel</div>
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

          <div className="admin-nav-section-title">Projects</div>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => switchTab('projects')}
          >
            <span className="admin-nav-icon">🎬</span>
            <span>My Projects</span>
            {dashboardData?.projectsCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                {dashboardData.projectsCount}
              </span>
            )}
          </button>

          <div className="admin-nav-section-title">Tools & Accounts</div>
          {accountTypes.map((at) => {
            const isTabActive = activeTab === `account-${at.slug}`;
            return (
              <button
                type="button"
                key={at.id}
                className={`admin-nav-item ${isTabActive ? 'active' : ''}`}
                onClick={() => switchTab(`account-${at.slug}`, at)}
              >
                <span className="admin-nav-icon">{at.icon || '🚀'}</span>
                <span>{at.name}</span>
                {at.accounts_count > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: isTabActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.15)',
                    color: isTabActive ? '#4ade80' : '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {at.accounts_count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="admin-nav-section-title">Devices</div>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => switchTab('sessions')}
          >
            <span className="admin-nav-icon">💻</span>
            <span>Connected Devices</span>
          </button>

          <div className="admin-nav-section-title">Tools Access</div>
          <button
            type="button"
            className="admin-nav-item"
            style={{ color: '#4ade80' }}
            onClick={() => {
              const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
              window.open(`${API_BASE}/extension/download?token=${encodeURIComponent(token)}`, '_blank');
            }}
          >
            <span className="admin-nav-icon">🧩</span>
            <span>Get Extension (.zip)</span>
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
              onNavigate={(tab, accType) => switchTab(tab, accType)}
              onLaunchResource={(acc) => {
                const url = acc?.target_url || 'https://flow.google.com/';
                window.dispatchEvent(new CustomEvent('__flow_launch_account__', {
                  detail: { accountId: acc?.id, service: acc?.service, targetUrl: url }
                }));
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            />
          )}

          {activeTab === 'projects' && <UserProjects />}

          {(activeTab.startsWith('account-') || activeTab === 'resources') && (
            <UserResources accountType={selectedAccountType || (accountTypes.find(at => `account-${at.slug}` === activeTab) || (activeTab.startsWith('account-') ? {
              slug: activeTab.replace('account-', ''),
              name: activeTab.replace('account-', '').charAt(0).toUpperCase() + activeTab.replace('account-', '').slice(1),
              icon: activeTab.includes('flow') ? '🌊' : '🚀'
            } : accountTypes[0]))} />
          )}

          {activeTab === 'sessions' && <UserSessions />}
        </div>
      </main>
    </div>
  );
}

export default UserLayout;
