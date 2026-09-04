import React from 'react';

function ResellerDashboard({ stats, recentUsers, onNavigate, onOpenCreateUser }) {
  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return <span style={{ color: '#94a3b8' }}>Lifetime</span>;
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return <span style={{ color: '#f87171', fontWeight: 600 }}>Expired</span>;
    }
    if (diffDays <= 7) {
      return <span style={{ color: '#fbbf24', fontWeight: 600 }}>{diffDays} days left</span>;
    }
    return <span style={{ color: '#4ade80', fontWeight: 600 }}>{diffDays} days left</span>;
  };

  return (
    <div className="admin-dashboard-view">
      {/* KPI METRIC CARDS */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card" onClick={() => onNavigate('users')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Customer Quota</span>
            <span className="admin-kpi-val" style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              {stats?.totalUsers ?? 0}
              <span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 600 }}>/ {stats?.maxCustomers ?? 10}</span>
            </span>
            <span className="admin-kpi-sub">
              {stats?.remainingSlots ?? 0} slots remaining
            </span>
          </div>
          <div className="admin-kpi-icon icon-blue">👥</div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigate('users')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Active Customers</span>
            <span className="admin-kpi-val" style={{ color: '#22c55e' }}>{stats?.activeUsers ?? 0}</span>
            <span className="admin-kpi-sub">
              {stats?.expiredUsers || stats?.bannedUsers
                ? `${stats?.expiredUsers || 0} expired • ${stats?.bannedUsers || 0} banned`
                : 'Customers with valid access'}
            </span>
          </div>
          <div className="admin-kpi-icon icon-green">✅</div>
        </div>

        <div className="admin-kpi-card" onClick={() => onNavigate('users')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Available Slots</span>
            <span
              className="admin-kpi-val"
              style={{ color: (stats?.remainingSlots !== undefined && stats?.remainingSlots <= 0) ? '#f87171' : '#38bdf8' }}
            >
              {stats?.remainingSlots ?? 0}
            </span>
            <span className="admin-kpi-sub">
              {(stats?.remainingSlots !== undefined && stats?.remainingSlots <= 0) ? 'Quota limit reached' : 'Ready for onboarding'}
            </span>
          </div>
          <div className="admin-kpi-icon icon-amber">⚡</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Reseller Plan</span>
            <span className="admin-kpi-val" style={{ color: '#c084fc', fontSize: '24px' }}>
              {stats?.resellerPlanName || 'Unlimited'}
            </span>
            <span className="admin-kpi-sub">
              ⏱ {stats?.isLifetime ? 'Lifetime Access' : `${stats?.resellerDaysRemaining !== null && stats?.resellerDaysRemaining !== undefined ? stats?.resellerDaysRemaining : 30} days remaining`}
            </span>
          </div>
          <div className="admin-kpi-icon icon-purple">🤝</div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="admin-card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #101726, #162032)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc' }}>
              🤝 Reseller Customer Management
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Create customer accounts, extend or decrease expiration periods, and assign subscription plans.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={onOpenCreateUser}
            >
              + Create Customer
            </button>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={() => onNavigate('users')}
            >
              👥 Manage Customers
            </button>
          </div>
        </div>
      </div>

      {/* RECENT CUSTOMERS TABLE */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>👥</span> Recent Customers
          </h3>
          <button
            type="button"
            className="btn-admin-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
            onClick={() => onNavigate('users')}
          >
            All Customers →
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Assigned Plan</th>
                <th>Status</th>
                <th>Expiration</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(!recentUsers || recentUsers.length === 0) ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No customers registered yet. Click <strong>"+ Create Customer"</strong> to onboard your first user.
                  </td>
                </tr>
              ) : (
                recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>{user.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{user.email}</div>
                    </td>
                    <td>
                      <span className="badge-pill badge-pro" style={{ padding: '3px 10px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {user.plan ? user.plan.toUpperCase().replace('PLAN_', '') : 'STANDARD'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-pill ${user.status === 'inactive' || user.is_verified === 0 ? 'badge-pending' : 'badge-green'}`}
                        style={{ padding: '3px 10px', fontSize: '12px', fontWeight: 600, textTransform: 'none' }}
                      >
                        {user.status === 'inactive' || user.is_verified === 0 ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px' }}>
                        {formatExpiry(user.expires_at)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recent'}
                      </span>
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

export default ResellerDashboard;
