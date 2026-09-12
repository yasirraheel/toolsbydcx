import React from 'react';

function UserDashboard({ dashboardData, onNavigate, onLaunchResource }) {
  const plan = dashboardData?.plan?.name || dashboardData?.user?.plan || 'PRO';
  const daysRemaining = dashboardData?.daysRemaining ?? null;
  const recentAccounts = dashboardData?.recentAccounts || [];
  const sharedAccountsCount = dashboardData?.sharedAccountsCount || 0;
  const activeSessionsCount = dashboardData?.activeSessionsCount || 1;

  const formatDaysText = (days) => {
    if (days === null || days === undefined) return 'Unlimited';
    if (days <= 0) return 'Expired';
    return `${days} Days Left`;
  };

  return (
    <div className="admin-dashboard-view">
      {/* KPI METRIC CARDS */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card" onClick={() => onNavigate('resources')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Accessible Accounts</span>
            <span className="admin-kpi-val" style={{ color: '#38bdf8' }}>{sharedAccountsCount}</span>
            <span className="admin-kpi-sub">Ready to launch in 1-click</span>
          </div>
          <div className="admin-kpi-icon icon-blue">🔑</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Subscription Status</span>
            <span className="admin-kpi-val" style={{ color: '#22c55e', fontSize: '24px', whiteSpace: 'nowrap', lineHeight: '1.2' }}>{formatDaysText(daysRemaining)}</span>
            <span className="admin-kpi-sub">{plan} Access Tier</span>
          </div>
          <div className="admin-kpi-icon icon-green">⏳</div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigate('sessions')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Connected Devices</span>
            <span className="admin-kpi-val">{activeSessionsCount}</span>
            <span className="admin-kpi-sub">Active login sessions</span>
          </div>
          <div className="admin-kpi-icon icon-amber">💻</div>
        </div>
      </div>

      {/* RECENT ACCOUNTS TABLE */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>🚀</span> Available Tools & Apps
          </h3>
          <button
            type="button"
            className="btn-admin-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
            onClick={() => onNavigate('resources')}
          >
            All Tools →
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Target Platform</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAccounts.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No tools available on your current plan.
                  </td>
                </tr>
              ) : (
                recentAccounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{acc.name || acc.service}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{acc.service || 'Shared Resource'}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', color: '#38bdf8' }}>
                        {acc.target_url || 'https://google.com'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-pill badge-green">Active</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-admin-primary"
                        style={{ padding: '8px 18px', fontSize: '14px' }}
                        onClick={() => onLaunchResource(acc)}
                      >
                        🚀 Launch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
