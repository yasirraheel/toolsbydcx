import React from 'react';

function AdminDashboard({ stats, recentUsers, onNavigate, onOpenCreateUser }) {
  const s = stats || {
    totalUsers: 0,
    verifiedUsers: 0,
    activePlans: 3,
  };

  const verifiedPercent = s.totalUsers > 0 
    ? Math.round((s.verifiedUsers / s.totalUsers) * 100) 
    : 100;

  return (
    <div className="admin-dashboard-view">
      {/* KPI METRIC CARDS */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Registered Users</span>
            <span className="admin-kpi-val">{s.totalUsers}</span>
            <span className="admin-kpi-sub">
              {s.verifiedUsers} verified ({verifiedPercent}%)
            </span>
          </div>
          <div className="admin-kpi-icon icon-green">👥</div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigate('accounts')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Shared Accounts</span>
            <span className="admin-kpi-val" style={{ color: '#38bdf8' }}>{s.totalAccounts || 0}</span>
            <span className="admin-kpi-sub">
              {s.activeAccounts || 0} active pool{s.activeAccounts === 1 ? '' : 's'}
            </span>
          </div>
          <div className="admin-kpi-icon icon-blue">🔑</div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigate('accounts')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Extension Sessions</span>
            <span className="admin-kpi-val" style={{ color: '#22c55e' }}>{s.activeSessions || 0}</span>
            <span className="admin-kpi-sub">Active device sessions</span>
          </div>
          <div className="admin-kpi-icon icon-amber">🧩</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Active Plans</span>
            <span className="admin-kpi-val">{s.activePlans || 3}</span>
            <span className="admin-kpi-sub">
              Configured access tiers
            </span>
          </div>
          <div className="admin-kpi-icon icon-purple">💳</div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="admin-card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #101726, #162032)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc' }}>
              ⚡ Admin Quick Actions
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Manage user accounts, shared accounts, subscription plans, or test email.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => onNavigate('accounts')}
              style={{ background: '#6366f1' }}
            >
              🔑 Manage Accounts
            </button>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={onOpenCreateUser}
            >
              + Add User
            </button>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={() => onNavigate('plans')}
            >
              💳 Plans
            </button>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={() => onNavigate('settings')}
            >
              ✉️ SMTP
            </button>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY & SYSTEM CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* RECENT REGISTERED USERS */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <span>👤</span> Recent Registrations
            </h3>
            <button
              type="button"
              className="btn-admin-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => onNavigate('users')}
            >
              All Users →
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers && recentUsers.length > 0 ? (
                  recentUsers.map((u, idx) => (
                    <tr key={u.id || idx}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>{u.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge-pill ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td>
                        <span className="badge-pill badge-pro">
                          {u.plan ? u.plan.toUpperCase() : 'FREE'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-pill ${u.is_verified ? 'badge-verified' : 'badge-unverified'}`}>
                          {u.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                      No user accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACCOUNT ACCESS & EXTENSION OVERVIEW */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <span>🔐</span> Account Sharing & Extension Status
            </h3>
            <button
              type="button"
              className="btn-admin-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => onNavigate('settings')}
            >
              System Settings →
            </button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#090d16', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>Chrome Extension Bridge</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Encrypted Extension Session & Synchronization</div>
                </div>
                <span className="badge-pill badge-passed">READY</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#090d16', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>User Authentication</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>JWT Token Auth + Bcrypt Hash + Hostinger OTP</div>
                </div>
                <span className="badge-pill badge-verified">VERIFIED</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#090d16', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>Subscription Gating</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Plan-based account access control</div>
                </div>
                <span className="badge-pill badge-pro">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
