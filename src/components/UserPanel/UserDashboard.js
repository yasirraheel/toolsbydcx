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

      {/* EXTENSION & BROWSER SETUP CARD */}
      <div className="admin-card" style={{ marginBottom: '24px', border: '1px solid rgba(56, 189, 248, 0.25)', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
        <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="admin-card-title" style={{ color: '#38bdf8' }}>
              <span>🧩</span> Required Extensions & Isolated Profile Suite
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Both Extension A and Companion B are required for automated 1-click login and local session security.
            </p>
          </div>
          <a
            href={`${API_BASE}/extension/download?file=bundle&token=${encodeURIComponent(localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '')}`}
            download="ToolsByDcx_Bundle.zip"
            className="btn-admin-primary"
            style={{ padding: '9px 18px', fontSize: '13px', textDecoration: 'none', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' }}
          >
            📦 Download Complete Suite (.zip)
          </a>
        </div>

        <div style={{ padding: '0 24px 20px 24px' }}>
          {/* NOTICE BANNER */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ fontSize: '13px', color: '#fde68a', lineHeight: 1.5 }}>
              <strong>Google Flow Pro-Tip:</strong> If your active Chrome browser profile is signed into a personal <code>@gmail.com</code> account, Google may reject shared session cookies. Run the included <strong>ToolsByDcx_Launcher.bat</strong> or use a profile without personal Gmail signed in.
            </div>
          </div>

          {/* INDIVIDUAL DOWNLOAD BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <a
              href={`${API_BASE}/extension/download?file=a&token=${encodeURIComponent(localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '')}`}
              download="ToolsByDcx-Extension-A.zip"
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', fontSize: '13px', padding: '10px 14px', textDecoration: 'none' }}
            >
              📥 Extension A (.zip)
            </a>
            <a
              href={`${API_BASE}/extension/download?file=b&token=${encodeURIComponent(localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '')}`}
              download="ToolsByDcx-Companion-B.zip"
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', fontSize: '13px', padding: '10px 14px', textDecoration: 'none' }}
            >
              🛡️ Companion B (.zip)
            </a>
            <a
              href={`${API_BASE}/extension/download?file=bat&token=${encodeURIComponent(localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '')}`}
              download="ToolsByDcx_Launcher.bat"
              className="btn-admin-secondary"
              style={{ justifyContent: 'center', fontSize: '13px', padding: '10px 14px', textDecoration: 'none', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
            >
              🚀 Desktop Launcher (.bat)
            </a>
          </div>

          {/* QUICK INSTRUCTIONS */}
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, background: 'rgba(15, 23, 42, 0.5)', padding: '12px 16px', borderRadius: '10px' }}>
            <strong>Quick Setup:</strong> Extract the ZIP &rarr; In Chrome go to <code>chrome://extensions</code> &rarr; Enable <strong>Developer mode</strong> &rarr; Click <strong>Load unpacked</strong> and select both <em>ToolsByDcx-Extension-A</em> and <em>ToolsByDcx-Companion-B</em> folders.
          </div>
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
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{acc.service_name || acc.name || acc.service || 'Shared Resource'}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{acc.service || acc.service_name || 'Active Tool'}</div>
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
