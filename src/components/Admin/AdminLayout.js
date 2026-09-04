import React, { useState, useEffect } from 'react';
import './admin.css';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminResellers from './AdminResellers';
import AdminPlans from './AdminPlans';
import AdminAccounts from './AdminAccounts';
import AdminSettings from './AdminSettings';

function AdminLayout({ currentUser, onExitAdmin, onSwitchPortal, onLogout }) {
  const getInitialAdminTab = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
    const search = new URLSearchParams(window.location.search);
    const tabParam = search.get("tab");
    if (tabParam) return tabParam;
    if (path.includes("/admin/accounts")) return "accounts";
    if (path.includes("/admin/users")) return "users";
    if (path.includes("/admin/resellers")) return "resellers";
    if (path.includes("/admin/plans")) return "plans";
    if (path.includes("/admin/settings")) return "settings";
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState(getInitialAdminTab);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [resellerFilter, setResellerFilter] = useState(null);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    const targetUrl = tab === "dashboard" ? "/admin" : `/admin/${tab}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ adminTab: tab }, "", targetUrl);
    }
  };

  const handleViewResellerClients = (reseller) => {
    setResellerFilter(reseller);
    switchTab('users');
  };

  useEffect(() => {
    const handlePop = () => {
      setActiveTab(getInitialAdminTab());
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, "");
    const expected = activeTab === "dashboard" ? "/admin" : `/admin/${activeTab}`;
    if (currentPath !== expected && (currentPath === "/admin" || currentPath === "" || currentPath === "/")) {
      window.history.replaceState({ adminTab: activeTab }, "", expected);
    }
  }, [activeTab]);

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    return headers;
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.stats) {
        setStatsData(data);
        return;
      }
    } catch (e) {
      console.error('API stats error:', e);
    }
    setStatsData({
      stats: { totalUsers: 0, verifiedUsers: 0, activePlans: 3, totalAccounts: 0, activeAccounts: 0, activeSessions: 0 },
      recentUsers: []
    });
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return '📊 Admin Dashboard';
      case 'accounts': return '🔑 Accounts';
      case 'users': return '👥 Customers';
      case 'resellers': return '🤝 Resellers';
      case 'plans': return '💳 Plans';
      case 'settings': return '⚙️ Settings & SMTP';
      default: return 'Admin Portal';
    }
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
              <div className="admin-brand-subtitle">Admin Panel</div>
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

          <div className="admin-nav-section-title">Management</div>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => switchTab('accounts')}
          >
            <span className="admin-nav-icon">🔑</span>
            <span>Accounts</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => switchTab('users')}
          >
            <span className="admin-nav-icon">👥</span>
            <span>Customer</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'resellers' ? 'active' : ''}`}
            onClick={() => switchTab('resellers')}
          >
            <span className="admin-nav-icon">🤝</span>
            <span>Resellers</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => switchTab('plans')}
          >
            <span className="admin-nav-icon">💳</span>
            <span>Plans</span>
          </button>

          {/* CONFIGURATION - Hidden from sidebar UI, code and page fully preserved */}
          {false && (
            <>
              <div className="admin-nav-section-title">Configuration</div>
              <button
                type="button"
                className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => switchTab('settings')}
              >
                <span className="admin-nav-icon">⚙️</span>
                <span>Settings & SMTP</span>
              </button>
            </>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="btn-admin-back"
            onClick={onExitAdmin}
          >
            <span>⬅️</span>
            <span>Back to Main App</span>
          </button>
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
              <span>System Online</span>
            </div>

            <div className="admin-user-capsule">
              <div className="admin-user-avatar">
                {(currentUser?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="admin-user-name">
                {currentUser?.name || 'Admin'}
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
            <AdminDashboard
              stats={statsData?.stats}
              recentUsers={statsData?.recentUsers}
              onNavigate={(tab) => switchTab(tab)}
              onOpenCreateUser={() => {
                switchTab('users');
                setIsCreateUserOpen(true);
              }}
            />
          )}

          {activeTab === 'accounts' && <AdminAccounts />}

          {activeTab === 'users' && (
            <AdminUsers
              currentUser={currentUser}
              isCreateOpen={isCreateUserOpen}
              onCloseCreate={(val) => setIsCreateUserOpen(Boolean(val))}
              resellerFilter={resellerFilter}
              onClearResellerFilter={() => setResellerFilter(null)}
            />
          )}

          {activeTab === 'resellers' && (
            <AdminResellers
              currentUser={currentUser}
              onViewClients={handleViewResellerClients}
            />
          )}

          {activeTab === 'plans' && <AdminPlans />}

          {activeTab === 'settings' && <AdminSettings currentUser={currentUser} />}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
