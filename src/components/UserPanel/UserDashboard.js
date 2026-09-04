import React from 'react';

function UserDashboard({ dashboardData, onNavigate, onLaunchResource }) {
  const plan = dashboardData?.plan?.name || dashboardData?.user?.plan || 'PRO';
  const daysRemaining = dashboardData?.daysRemaining ?? null;
  const recentAccounts = dashboardData?.recentAccounts || [];
  const sharedAccountsCount = dashboardData?.sharedAccountsCount || 0;
  const activeSessionsCount = dashboardData?.activeSessionsCount || 1;
  const userCredits = dashboardData?.user?.credits ?? dashboardData?.credits ?? null;
  const isUnlimitedCredits = dashboardData?.user?.isUnlimitedCredits || dashboardData?.isUnlimitedCredits || userCredits === -1;
  const creditsDisplay = isUnlimitedCredits ? 'Unlimited' : (userCredits !== null ? `${userCredits}` : 'Active');

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

        <div className="admin-kpi-card">
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">AI Generation Credits</span>
            <span className="admin-kpi-val" style={{ color: '#c084fc', fontSize: '24px' }}>⚡ {creditsDisplay}</span>
            <span className="admin-kpi-sub">{isUnlimitedCredits ? 'Unlimited Generations' : 'Available Generation Balance'}</span>
          </div>
          <div className="admin-kpi-icon icon-purple">⚡</div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="admin-card" style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #101726, #162032)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
              ⚡ FlowByDcx Tool Access Hub
            </h4>
            <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8' }}>
              Access your assigned AI tools and premium services directly in your browser with 1-click launch.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={() => onNavigate('sessions')}
            >
              💻 Active Devices
            </button>
          </div>
        </div>
      </div>

      {/* RECENT ACCOUNTS TABLE */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>🚀</span> Shared Accounts & Tools
          </h3>
          <button
            type="button"
            className="btn-admin-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
            onClick={() => onNavigate('resources')}
          >
            All Accounts →
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
                    No shared accounts available on your current plan.
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
