import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';

function AdminUsers({ currentUser, isCreateOpen, onCloseCreate }) {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [users, setUsers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // New User Form State
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'user',
    plan: 'plan_free',
    isVerified: true
  });

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || currentUser?.token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/plans`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.plans && Array.isArray(data.plans)) {
        setAvailablePlans(data.plans);
        if (data.plans.length > 0) {
          setNewUserData(prev => ({
            ...prev,
            plan: prev.plan === 'free' || prev.plan === 'plan_free' ? data.plans[0].id : prev.plan
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching plans dynamically:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (roleFilter) query.append('role', roleFilter);
      if (statusFilter) query.append('status', statusFilter);
      if (planFilter) query.append('plan', planFilter);

      const res = await fetch(`${API_BASE}/admin/users?${query.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        console.error('Admin users fetch error from API:', data?.error || res.statusText);
        setUsers([]);
      }
    } catch (e) {
      console.error('API users connection error:', e);
      setUsers([]);
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
  }, [search, roleFilter, statusFilter, planFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUserData)
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'User account created successfully!' });
        onCloseCreate();
        setNewUserData({
          name: '',
          email: '',
          password: 'Password123!',
          role: 'user',
          plan: availablePlans[0]?.id || 'plan_free',
          isVerified: true
        });
        fetchUsers();
      } else {
        await showCustomAlert({
          title: 'User Creation Error',
          message: data.error || 'Failed to create user account.',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'Network error creating user account. Please check your backend connection.',
        type: 'danger'
      });
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingUser)
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'User updated successfully!' });
        setEditingUser(null);
        fetchUsers();
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.error || 'Failed to update user profile.',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'Network error updating user. Please check your backend connection.',
        type: 'danger'
      });
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.email === 'candidate@ccna.com' || user.email === 'admin@flowbydcx.com' || user.email === 'admin@system.com') {
      await showCustomAlert({
        title: 'Action Prohibited',
        message: `Cannot delete primary administrator account "${user.name}" (${user.email}).`,
        type: 'warning'
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Permanently Delete User',
      message: `Are you sure you want to permanently delete user "${user.name}" (${user.email})? All user account data and active extension sessions will be erased.`,
      note: 'This action is immediate and cannot be undone.',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: `User "${user.name}" deleted successfully.` });
        fetchUsers();
      } else {
        const data = await res.json();
        await showCustomAlert({
          title: 'Deletion Failed',
          message: data.error || 'Failed to delete user.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'A network error occurred while deleting user.',
        type: 'danger'
      });
    }
  };

  const handleToggleVerify = async (user) => {
    try {
      const updated = { ...user, isVerified: user.is_verified ? 0 : 1 };
      await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updated)
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const getPlanInfo = (planKey) => {
    if (!planKey) return { name: 'Free', className: 'badge-free' };
    const matched = availablePlans.find(
      (p) =>
        p.id.toLowerCase() === planKey.toLowerCase() ||
        p.id.replace('plan_', '').toLowerCase() === planKey.toLowerCase() ||
        p.name.toLowerCase() === planKey.toLowerCase()
    );

    const name = matched ? matched.name : planKey.toUpperCase();
    const keyLower = planKey.toLowerCase();
    const isUnlimited = keyLower.includes('unlimited') || keyLower.includes('max') || (matched && matched.price >= 25);
    const isPro = keyLower.includes('pro') || keyLower.includes('ultra') || (matched && matched.price > 0);

    return {
      name,
      className: isUnlimited ? 'badge-unlimited' : isPro ? 'badge-pro' : 'badge-free'
    };
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
            <span>👥</span> Users ({users.length})
          </h3>

          <div className="admin-card-actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search user by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Standard Users</option>
            </select>

            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Pending Verification</option>
            </select>

            <select
              className="admin-select"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="">All Plans</option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => {
                setNewUserData({
                  name: '',
                  email: '',
                  password: 'Password123!',
                  role: 'user',
                  plan: availablePlans[0]?.id || 'plan_free',
                  isVerified: true
                });
                onCloseCreate(true);
              }}
            >
              + New User
            </button>
          </div>
        </div>

        {/* USERS DATA TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Current Plan</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading users database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No users found matching filter criteria.
                  </td>
                </tr>
              ) : (
                users
                  .filter((u) => {
                    if (!planFilter) return true;
                    const uPlan = (u.plan || '').toLowerCase();
                    const filter = planFilter.toLowerCase();
                    return uPlan === filter || uPlan === filter.replace('plan_', '') || `plan_${uPlan}` === filter;
                  })
                  .map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: u.role === 'admin' ? '#a855f7' : '#22c55e',
                            color: '#090d16',
                            fontWeight: 800,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>{u.name}</div>
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-pill ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const pInfo = getPlanInfo(u.plan);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className={`badge-pill ${pInfo.className}`}>
                              {pInfo.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              ⏱ {u.daysRemaining !== null && u.daysRemaining !== undefined ? `${u.daysRemaining} days left` : 'Unlimited'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleVerify(u)}
                        className={`badge-pill ${u.is_verified ? 'badge-verified' : 'badge-unverified'}`}
                        style={{ cursor: 'pointer', border: '1px solid currentColor' }}
                        title="Click to toggle verification status"
                      >
                        {u.is_verified ? '✓ Verified' : '⏳ Pending'}
                      </button>
                    </td>
                    <td style={{ fontSize: '14px', color: '#94a3b8' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="admin-actions-cell">
                        <button
                          type="button"
                          className="btn-table-action btn-table-edit"
                          onClick={() => setEditingUser(u)}
                          title="Edit User Details"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-table-action btn-table-delete"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.email === 'candidate@ccna.com' || u.email === 'admin@flowbydcx.com' || u.email === 'admin@system.com'}
                          title={u.email === 'candidate@ccna.com' || u.email === 'admin@flowbydcx.com' || u.email === 'admin@system.com' ? "Primary admin cannot be deleted" : "Delete User"}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          <span>Delete</span>
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

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4 className="admin-modal-title">Edit User Account</h4>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Full Name</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    className="admin-form-input"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">System Role</label>
                    <select
                      className="admin-select"
                      value={editingUser.role || 'user'}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Access Plan</label>
                    <select
                      className="admin-select"
                      value={editingUser.plan || (availablePlans[0]?.id || 'plan_free')}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        const match = availablePlans.find((p) => p.id === newPlan);
                        setEditingUser({
                          ...editingUser,
                          plan: newPlan,
                          durationDays: match?.duration_days !== undefined ? match.duration_days : 30
                        });
                      }}
                    >
                      {availablePlans.length > 0 ? (
                        availablePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} {Number(plan.price) > 0 ? `($${Number(plan.price).toFixed(2)} / ${plan.billing_cycle})` : '(Free)'}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="plan_free">Tools Basic (Free)</option>
                          <option value="plan_pro">Tools Ultra</option>
                          <option value="plan_unlimited">Tools Max</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      className="admin-form-input"
                      value={editingUser.durationDays !== undefined ? editingUser.durationDays : (editingUser.daysRemaining !== null && editingUser.daysRemaining !== undefined ? editingUser.daysRemaining : 30)}
                      onChange={(e) => setEditingUser({ ...editingUser, durationDays: parseInt(e.target.value, 10) || 30 })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Set New Password (optional)</label>
                  <input
                    type="password"
                    className="admin-form-input"
                    placeholder="Leave blank to keep current password"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  />
                </div>

                <div className="admin-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="editIsVerified"
                    checked={Boolean(editingUser.is_verified)}
                    onChange={(e) => setEditingUser({ ...editingUser, is_verified: e.target.checked ? 1 : 0 })}
                  />
                  <label htmlFor="editIsVerified" className="admin-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Mark email address as Verified
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL */}
      {isCreateOpen && (
        <div className="admin-modal-backdrop" onClick={() => onCloseCreate(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4 className="admin-modal-title">Create New User</h4>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => onCloseCreate(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Full Name</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. Alex Johnson"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    className="admin-form-input"
                    placeholder="e.g. user@example.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Default Password</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Role</label>
                    <select
                      className="admin-select"
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Assigned Plan</label>
                    <select
                      className="admin-select"
                      value={newUserData.plan}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        const match = availablePlans.find((p) => p.id === newPlan);
                        setNewUserData({
                          ...newUserData,
                          plan: newPlan,
                          durationDays: match?.duration_days !== undefined ? match.duration_days : 30
                        });
                      }}
                    >
                      {availablePlans.length > 0 ? (
                        availablePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} {Number(plan.price) > 0 ? `($${Number(plan.price).toFixed(2)} / ${plan.billing_cycle})` : '(Free)'}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="plan_free">Tools Basic (Free)</option>
                          <option value="plan_pro">Tools Ultra</option>
                          <option value="plan_unlimited">Tools Max</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      className="admin-form-input"
                      value={newUserData.durationDays !== undefined ? newUserData.durationDays : 30}
                      onChange={(e) => setNewUserData({ ...newUserData, durationDays: parseInt(e.target.value, 10) || 30 })}
                    />
                  </div>
                </div>

                <div className="admin-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="newIsVerified"
                    checked={newUserData.isVerified}
                    onChange={(e) => setNewUserData({ ...newUserData, isVerified: e.target.checked })}
                  />
                  <label htmlFor="newIsVerified" className="admin-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Pre-verify email address (no OTP required)
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => onCloseCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
