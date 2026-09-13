import React from 'react';
import { API_BASE } from '../../apiConfig';

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

      {/* EXTENSION DOWNLOAD CARD */}
      <div className="admin-card" style={{ marginBottom: '24px', border: '1px solid rgba(56, 189, 248, 0.25)', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
        <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 className="admin-card-title" style={{ color: '#38bdf8', margin: 0 }}>
                <span>🧩</span> ToolsByDcx Chrome Extension
              </h3>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>
                v{dashboardData?.extensionVersion || '1.0.4'}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Install our official Chrome Extension to unlock 1-click automatic access to all your assigned accounts.
            </p>
          </div>
          <a
            href={`${API_BASE}/extension/download?token=${encodeURIComponent(localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '')}`}
            className="btn-admin-primary"
            style={{ padding: '10px 22px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' }}
          >
            <span>📥</span>
            <span>Download Extension (.zip)</span>
          </a>
        </div>

        <div style={{ padding: '0 24px 20px 24px' }}>
          {/* QUICK INSTRUCTIONS */}
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, background: 'rgba(15, 23, 42, 0.6)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <strong style={{ color: '#f8fafc' }}>Quick Setup:</strong> Download & extract the ZIP file &rarr; In Google Chrome open <code>chrome://extensions</code> &rarr; Turn ON <strong>Developer mode</strong> in the top-right &rarr; Click <strong>Load unpacked</strong> &rarr; Select the extracted extension folder.
          </div>
        </div>
      </div>

      {/* RECENT ACCOUNTS TABLE */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>🚀</span> Available Accounts & Servers
          </h3>
          {dashboardData?.accountTypes?.length > 0 && (
            <button
              type="button"
              className="btn-admin-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => onNavigate(`account-${dashboardData.accountTypes[0].slug}`, dashboardData.accountTypes[0])}
            >
              View Accounts →
            </button>
          )}
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Server Name</th>
                <th>Category</th>
                <th>Target Platform</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAccounts.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No accounts available on your current plan.
                  </td>
                </tr>
              ) : (
                recentAccounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{acc.service_name || acc.name || 'Shared Server'}</div>
                      {acc.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{acc.description}</div>}
                    </td>
                    <td>
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{acc.account_type_icon || '🚀'}</span>
                        <span>{acc.account_type_name || 'General'}</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {acc.target_url || 'https://flow.google.com/'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-pill badge-green">Active</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-admin-primary"
                        style={{ padding: '8px 18px', fontSize: '13px' }}
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
