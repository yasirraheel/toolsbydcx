import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';

function ResellerUsers({ currentUser, isCreateOpen, onCloseCreate }) {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [users, setUsers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);

  // Modals state
  const [expiryModalUser, setExpiryModalUser] = useState(null);
  const [planModalUser, setPlanModalUser] = useState(null);
  const [customDays, setCustomDays] = useState(30);
  const [customDate, setCustomDate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  // Create User Form State
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    plan: 'pro',
    expiryDays: 30
  });

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/plans`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.plans && Array.isArray(data.plans)) {
        setAvailablePlans(data.plans);
        if (data.plans.length > 0) {
          setNewUserData(prev => ({
            ...prev,
            plan: data.plans[0].id
          }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch plans dynamically');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter) query.append('status', statusFilter);
      if (planFilter) query.append('plan', planFilter);

      const res = await fetch(`${API_BASE}/reseller/users?${query.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Error fetching reseller users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, planFilter]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/reseller/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUserData)
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Customer account created successfully!' });
        onCloseCreate();
        setNewUserData({
          name: '',
          email: '',
          password: 'Password123!',
          plan: availablePlans[0]?.id || 'pro',
          expiryDays: 30
        });
        fetchUsers();
      } else {
        await showCustomAlert({
          title: 'Error Creating Customer',
          message: data.message || 'Could not create customer account.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'Failed to contact server.',
        type: 'danger'
      });
    }
  };

  const handleQuickAdjustExpiry = async (user, days) => {
    try {
      const res = await fetch(`${API_BASE}/reseller/users/${user.id}/adjust-expiry`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ days })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: `Expiry ${days > 0 ? 'extended' : 'decreased'} by ${Math.abs(days)} days for ${user.name}`
        });
        setExpiryModalUser(null);
        fetchUsers();
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.message || 'Could not adjust expiry date.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Could not connect to server.',
        type: 'danger'
      });
    }
  };

  const handleSetCustomDate = async (user) => {
    if (!customDate) {
      await showCustomAlert({
        title: 'Select Date',
        message: 'Please choose a target expiration date.',
        type: 'warning'
      });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reseller/users/${user.id}/adjust-expiry`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ exactDate: customDate })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: `Expiry date updated to ${customDate} for ${user.name}`
        });
        setExpiryModalUser(null);
        fetchUsers();
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.message || 'Could not set expiration date.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Failed to communicate with server.',
        type: 'danger'
      });
    }
  };

  const handleUpdatePlan = async () => {
    if (!planModalUser || !selectedPlan) return;
    try {
      const res = await fetch(`${API_BASE}/reseller/users/${planModalUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: selectedPlan })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: `Subscription plan updated for ${planModalUser.name}!`
        });
        setPlanModalUser(null);
        fetchUsers();
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.message || 'Could not assign plan.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Server error while updating plan.',
        type: 'danger'
      });
    }
  };

  const handleToggleStatus = async (user) => {
    const isDeactivating = user.is_verified !== 0 && user.status !== 'inactive';
    const confirmed = await confirm({
      title: isDeactivating ? 'Suspend Customer Access?' : 'Activate Customer Access?',
      message: isDeactivating
        ? `Customer "${user.name}" will temporarily lose access to accounts and Chrome extension.`
        : `Customer "${user.name}" will be granted active access again.`,
      confirmText: isDeactivating ? 'Suspend' : 'Activate',
      type: isDeactivating ? 'warning' : 'info'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/reseller/users/${user.id}/toggle-status`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: data.message || `Customer ${user.name} status updated.`
        });
        fetchUsers();
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Could not toggle status.',
        type: 'danger'
      });
    }
  };

  const formatExpiryBadge = (expiresAt) => {
    if (!expiresAt) return <span className="badge-pill badge-unlimited">Lifetime</span>;
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return <span className="badge-pill badge-pending">Expired</span>;
    }
    if (diffDays <= 7) {
      return <span className="badge-pill badge-pending">{diffDays}d left</span>;
    }
    return <span className="badge-pill badge-green">{diffDays}d left</span>;
  };

  return (
    <div className="admin-users-view">
      {/* FEEDBACK TOAST */}
      {actionFeedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: actionFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${actionFeedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: actionFeedback.type === 'success' ? '#4ade80' : '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{actionFeedback.message}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>👥</span> Customer Users ({users.length})
          </h3>

          <div className="admin-card-actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search customer by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>

            <select
              className="admin-select"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="">All Plans</option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => onCloseCreate(true)}
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Assigned Plan</th>
                <th>Status</th>
                <th>Expiration / Days</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Loading customers...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No customers found matching filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>{user.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{user.email}</div>
                    </td>
                    <td>
                      <span
                        className="badge-pill badge-pro"
                        style={{ cursor: 'pointer' }}
                        title="Click to assign plan"
                        onClick={() => {
                          setPlanModalUser(user);
                          setSelectedPlan(user.plan || availablePlans[0]?.id || 'pro');
                        }}
                      >
                        {user.plan ? user.plan.toUpperCase().replace('PLAN_', '') : 'PRO'} ✏️
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        title="Click to toggle status"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <span className={`badge-pill ${user.is_verified === 0 || user.status === 'inactive' ? 'badge-pending' : 'badge-green'}`}>
                          {user.is_verified === 0 || user.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                      </button>
                    </td>
                    <td>
                      {formatExpiryBadge(user.expires_at)}
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-action"
                          style={{ color: '#38bdf8' }}
                          title="Extend or decrease expiration"
                          onClick={() => {
                            setExpiryModalUser(user);
                            setCustomDate(user.expires_at ? user.expires_at.split('T')[0] : '');
                          }}
                        >
                          ⏳ Adjust Expiry
                        </button>
                        <button
                          type="button"
                          className="btn-action"
                          title="Assign Plan"
                          onClick={() => {
                            setPlanModalUser(user);
                            setSelectedPlan(user.plan || availablePlans[0]?.id || 'pro');
                          }}
                        >
                          💳 Plan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADJUST EXPIRATION */}
      {expiryModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setExpiryModalUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">⏳ Adjust Expiry: {expiryModalUser.name}</h3>
              <button type="button" className="admin-modal-close" onClick={() => setExpiryModalUser(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                Quickly add or subtract days, or set a target expiration date for this customer.
              </div>

              {/* QUICK EXTEND BUTTONS */}
              <div className="admin-form-group">
                <label className="admin-form-label">Quick Actions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-admin-secondary"
                    onClick={() => handleQuickAdjustExpiry(expiryModalUser, 7)}
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    className="btn-admin-primary"
                    onClick={() => handleQuickAdjustExpiry(expiryModalUser, 30)}
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    className="btn-admin-secondary"
                    onClick={() => handleQuickAdjustExpiry(expiryModalUser, 90)}
                  >
                    +90 Days
                  </button>
                  <button
                    type="button"
                    className="btn-admin-danger"
                    onClick={() => handleQuickAdjustExpiry(expiryModalUser, -30)}
                  >
                    -30 Days
                  </button>
                </div>
              </div>

              {/* CUSTOM DAYS INPUT */}
              <div className="admin-form-group">
                <label className="admin-form-label">Custom Days</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="admin-form-input"
                    style={{ width: '120px' }}
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                    placeholder="Days"
                  />
                  <button
                    type="button"
                    className="btn-admin-secondary"
                    onClick={() => handleQuickAdjustExpiry(expiryModalUser, customDays)}
                  >
                    Add {customDays}d
                  </button>
                  <button
                    type="button"
                    className="btn-admin-danger"
                    onClick={() => handleQuickAdjustExpiry(expiryModalUser, -Math.abs(customDays))}
                  >
                    Subtract {customDays}d
                  </button>
                </div>
              </div>

              {/* EXACT DATE PICKER */}
              <div className="admin-form-group" style={{ borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
                <label className="admin-form-label">Or Pick Exact Date</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-admin-primary"
                    onClick={() => handleSetCustomDate(expiryModalUser)}
                  >
                    Set Date
                  </button>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn-admin-secondary" onClick={() => setExpiryModalUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN PLAN */}
      {planModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setPlanModalUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">💳 Assign Plan: {planModalUser.name}</h3>
              <button type="button" className="admin-modal-close" onClick={() => setPlanModalUser(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">Subscription Plan</label>
                <select
                  className="admin-form-input"
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price_monthly || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn-admin-secondary" onClick={() => setPlanModalUser(null)}>Cancel</button>
              <button
                type="button"
                className="btn-admin-primary"
                onClick={handleUpdatePlan}
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOMER */}
      {isCreateOpen && (
        <div className="admin-modal-backdrop" onClick={() => onCloseCreate(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">+ Add New Customer</h3>
              <button type="button" className="admin-modal-close" onClick={() => onCloseCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Customer Name</label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. John Doe"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="admin-form-input"
                    placeholder="customer@domain.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Temporary Password</label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Assign Plan</label>
                    <select
                      className="admin-form-input"
                      value={newUserData.plan}
                      onChange={(e) => setNewUserData({ ...newUserData, plan: e.target.value })}
                    >
                      {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="admin-form-input"
                      value={newUserData.expiryDays}
                      onChange={(e) => setNewUserData({ ...newUserData, expiryDays: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn-admin-secondary" onClick={() => onCloseCreate(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                >
                  Create & Activate Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResellerUsers;
