import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function AdminResellers({ currentUser, onViewClients }) {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [resellers, setResellers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [editingReseller, setEditingReseller] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // New Reseller Form State
  const [newResellerData, setNewResellerData] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    plan: 'plan_unlimited',
    durationDays: 30,
    maxCustomers: 10,
    isVerified: true
  });


  const currentDomain = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? window.location.hostname.replace(/^www\./, '')
    : 'flowbydcx.com';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || currentUser?.token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchPlans = async () => {
    try {
      const res = await authFetch(`${API_BASE}/admin/plans`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.plans && Array.isArray(data.plans)) {
        setAvailablePlans(data.plans);
        if (data.plans.length > 0) {
          setNewResellerData(prev => ({
            ...prev,
            plan: prev.plan || data.plans[0].id
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
    }
  };

  const fetchResellers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter) query.append('status', statusFilter);
      if (planFilter) query.append('plan', planFilter);

      const res = await authFetch(`${API_BASE}/admin/resellers?${query.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (res.ok && Array.isArray(data.resellers)) {
        setResellers(data.resellers);
      } else {
        setResellers([]);
      }
    } catch (e) {
      console.error('API resellers connection error:', e);
      setResellers([]);
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
      fetchResellers();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, planFilter]);

  const handleCreateReseller = async (e) => {
    e.preventDefault();
    try {
      let finalEmail = (newResellerData.email || '').trim().toLowerCase();
      if (!finalEmail && newResellerData.emailPrefix) {
        finalEmail = newResellerData.emailPrefix.trim().toLowerCase();
      }
      if (finalEmail) {
        if (finalEmail.includes('@')) {
          finalEmail = finalEmail.split('@')[0] + '@' + currentDomain;
        } else {
          finalEmail = finalEmail + '@' + currentDomain;
        }
      }

      if (!finalEmail) {
        await showCustomAlert({
          title: 'Email Required',
          message: 'Please provide an email prefix.',
          type: 'warning'
        });
        return;
      }

      const payload = {
        ...newResellerData,
        email: finalEmail,
        maxCustomers: parseInt(newResellerData.maxCustomers, 10) || 1,
        durationDays: parseInt(newResellerData.durationDays, 10) || 30
      };

      const res = await fetch(`${API_BASE}/admin/resellers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Reseller account created successfully!' });
        setIsCreateOpen(false);
        setNewResellerData({
          name: '',
          emailPrefix: '',
          email: '',
          password: 'Password123!',
          plan: availablePlans[0]?.id || 'plan_unlimited',
          durationDays: 30,
          maxCustomers: 10,
          isVerified: true
        });
        fetchResellers();
      } else {
        await showCustomAlert({
          title: 'Reseller Creation Error',
          message: data.error || 'Failed to create reseller account.',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'Network error creating reseller account. Please check your backend connection.',
        type: 'danger'
      });
    }
  };

  const handleUpdateReseller = async (e) => {
    e.preventDefault();
    if (!editingReseller) return;
    try {
      const payload = {
        ...editingReseller,
        maxCustomers: parseInt(editingReseller.max_customers !== undefined ? editingReseller.max_customers : editingReseller.maxCustomers, 10) || 1,
        max_customers: parseInt(editingReseller.max_customers !== undefined ? editingReseller.max_customers : editingReseller.maxCustomers, 10) || 1,
        durationDays: parseInt(editingReseller.durationDays, 10) || 30
      };
      const res = await fetch(`${API_BASE}/admin/resellers/${editingReseller.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Reseller updated successfully!' });
        setEditingReseller(null);
        fetchResellers();
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.error || 'Failed to update reseller profile.',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'Network error updating reseller. Please check your backend connection.',
        type: 'danger'
      });
    }
  };

  const handleDeleteReseller = async (reseller) => {
    const confirmed = await confirm({
      title: 'Permanently Delete Reseller',
      message: `Are you sure you want to permanently delete reseller "${reseller.name}" (${reseller.email})?`,
      note: `This reseller currently has ${reseller.sub_users_count || 0} sub-users assigned. Their sub-users will be unlinked but will remain in the database.`,
      confirmText: 'Delete Reseller',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/admin/resellers/${reseller.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: `Reseller "${reseller.name}" deleted successfully.` });
        fetchResellers();
      } else {
        const data = await res.json();
        await showCustomAlert({
          title: 'Deletion Failed',
          message: data.error || 'Failed to delete reseller.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'A network error occurred while deleting reseller.',
        type: 'danger'
      });
    }
  };

  const handleToggleVerify = async (reseller) => {
    try {
      const updated = { ...reseller, is_verified: reseller.is_verified ? 0 : 1 };
      await fetch(`${API_BASE}/admin/resellers/${reseller.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updated)
      });
      fetchResellers();
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
    <div className="admin-resellers-view">
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
          <div>
            <h3 className="admin-card-title">
              <span>🤝</span> Resellers ({resellers.length})
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Manage reseller partner accounts, allocated subscriptions, and active client counts.
            </p>
          </div>

          <div className="admin-card-actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search reseller by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

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
                setNewResellerData({
                  name: '',
                  email: '',
                  password: 'Password123!',
                  plan: availablePlans[0]?.id || 'plan_unlimited',
                  durationDays: 30,
                  isVerified: true
                });
                setIsCreateOpen(true);
              }}
            >
              + New Reseller
            </button>
          </div>
        </div>

        {/* RESELLERS DATA TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reseller Partner</th>
                <th>Role</th>
                <th>Assigned Plan</th>
                <th>Active Customers</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading resellers database...
                  </td>
                </tr>
              ) : resellers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No reseller partners found matching filter criteria.
                  </td>
                </tr>
              ) : (
                resellers
                  .filter((r) => {
                    if (!planFilter) return true;
                    const rPlan = (r.plan || '').toLowerCase();
                    const filter = planFilter.toLowerCase();
                    return rPlan === filter || rPlan === filter.replace('plan_', '') || `plan_${rPlan}` === filter;
                  })
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                              color: '#090d16',
                              fontWeight: 800,
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 10px rgba(56, 189, 248, 0.2)'
                            }}
                          >
                            {(r.name || 'R').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>{r.name}</div>
                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge-pill"
                          style={{
                            padding: '3px 10px',
                            fontSize: '12px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            fontWeight: 600,
                            textTransform: 'none'
                          }}
                        >
                          🤝 Reseller
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const pInfo = getPlanInfo(r.plan);
                          const daysText = r.daysRemaining !== null && r.daysRemaining !== undefined ? `${r.daysRemaining}d left` : 'Lifetime';
                          return (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                              <span
                                className={`badge-pill ${pInfo.className}`}
                                style={{ padding: '3px 10px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}
                              >
                                {pInfo.name}
                              </span>
                              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                ⏱ {daysText}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onViewClients && onViewClients(r)}
                          className="badge-pill"
                          title={`Click to view all ${r.sub_users_count || 0} clients of ${r.name}`}
                          style={{
                            cursor: 'pointer',
                            padding: '3px 10px',
                            fontSize: '12px',
                            textTransform: 'none',
                            background: (Number(r.sub_users_count || 0) >= Number(r.max_customers !== undefined ? r.max_customers : 10)) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: (Number(r.sub_users_count || 0) >= Number(r.max_customers !== undefined ? r.max_customers : 10)) ? '#f87171' : '#c084fc',
                            border: `1px solid ${(Number(r.sub_users_count || 0) >= Number(r.max_customers !== undefined ? r.max_customers : 10)) ? 'rgba(239, 68, 68, 0.35)' : 'rgba(168, 85, 247, 0.35)'}`,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(168, 85, 247, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <span>👥 {r.sub_users_count || 0} / {r.max_customers !== undefined && r.max_customers !== null ? r.max_customers : 10} Clients</span>
                          <span style={{ fontSize: '11px', opacity: 0.8 }}>↗</span>
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(r)}
                          className={`badge-pill ${r.is_verified ? 'badge-verified' : 'badge-unverified'}`}
                          style={{
                            cursor: 'pointer',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'none',
                            border: '1px solid currentColor'
                          }}
                          title="Click to toggle verification status"
                        >
                          {r.is_verified ? '✓ Verified' : '⏳ Pending'}
                        </button>
                      </td>
                      <td style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="admin-actions-cell">
                          <button
                            type="button"
                            className="btn-table-action btn-table-edit"
                            onClick={() => setEditingReseller(r)}
                            title="Edit Reseller Details"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn-table-action btn-table-delete"
                            onClick={() => handleDeleteReseller(r)}
                            title="Delete Reseller"
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

      {/* EDIT RESELLER MODAL */}
      {editingReseller && (
        <div className="admin-modal-backdrop" onClick={() => setEditingReseller(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4 className="admin-modal-title">Edit Reseller Partner</h4>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setEditingReseller(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateReseller}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Full Name / Company</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingReseller.name || ''}
                    onChange={(e) => setEditingReseller({ ...editingReseller, name: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    className="admin-form-input"
                    value={editingReseller.email || ''}
                    onChange={(e) => setEditingReseller({ ...editingReseller, email: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Access Plan</label>
                    <select
                      className="admin-select"
                      value={editingReseller.plan || (availablePlans[0]?.id || 'plan_unlimited')}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        const match = availablePlans.find((p) => p.id === newPlan);
                        setEditingReseller({
                          ...editingReseller,
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
                      value={editingReseller.durationDays !== undefined ? editingReseller.durationDays : (editingReseller.daysRemaining !== null && editingReseller.daysRemaining !== undefined ? editingReseller.daysRemaining : 30)}
                      onChange={(e) => setEditingReseller({ ...editingReseller, durationDays: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Max Customers Allowed (Quota Limit)
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, marginLeft: '6px' }}>
                      (Total customers this reseller is allowed to create)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="admin-form-input"
                    value={editingReseller.max_customers !== undefined ? editingReseller.max_customers : (editingReseller.maxCustomers !== undefined ? editingReseller.maxCustomers : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingReseller({
                        ...editingReseller,
                        max_customers: val,
                        maxCustomers: val
                      });
                    }}
                    placeholder="e.g. 5, 10, 25, 50"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Set New Password (optional)</label>
                  <input
                    type="password"
                    className="admin-form-input"
                    placeholder="Leave blank to keep current password"
                    value={editingReseller.password || ''}
                    onChange={(e) => setEditingReseller({ ...editingReseller, password: e.target.value })}
                  />
                </div>

                <div className="admin-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="editResellerIsVerified"
                    checked={Boolean(editingReseller.is_verified)}
                    onChange={(e) => setEditingReseller({ ...editingReseller, is_verified: e.target.checked ? 1 : 0 })}
                  />
                  <label htmlFor="editResellerIsVerified" className="admin-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Mark email address as Verified
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setEditingReseller(null)}
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

      {/* CREATE NEW RESELLER MODAL */}
      {isCreateOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4 className="admin-modal-title">Create New Reseller Partner</h4>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsCreateOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateReseller}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Reseller Name / Company</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. Acme Reseller Partner"
                    value={newResellerData.name}
                    onChange={(e) => setNewResellerData({ ...newResellerData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Email Address
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, marginLeft: '6px' }}>
                      (domain auto-set to @{currentDomain})
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="admin-form-input"
                      style={{
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        borderRight: 'none',
                        flex: 1
                      }}
                      placeholder="e.g. partner"
                      value={newResellerData.emailPrefix !== undefined ? newResellerData.emailPrefix : (newResellerData.email ? newResellerData.email.split('@')[0] : '')}
                      onChange={(e) => {
                        let val = e.target.value.trim().toLowerCase();
                        if (val.includes('@')) {
                          val = val.split('@')[0];
                        }
                        setNewResellerData({
                          ...newResellerData,
                          emailPrefix: val,
                          email: val ? `${val}@${currentDomain}` : ''
                        });
                      }}
                      required
                    />
                    <div
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderLeft: 'none',
                        padding: '11px 16px',
                        borderTopRightRadius: '10px',
                        borderBottomRightRadius: '10px',
                        color: '#38bdf8',
                        fontSize: '14px',
                        fontWeight: 700,
                        userSelect: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      @{currentDomain}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Full address will be:{' '}
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>
                      {newResellerData.emailPrefix ? `${newResellerData.emailPrefix}@${currentDomain}` : `partner@${currentDomain}`}
                    </span>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Default Password</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={newResellerData.password}
                    onChange={(e) => setNewResellerData({ ...newResellerData, password: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Assigned Plan</label>
                    <select
                      className="admin-select"
                      value={newResellerData.plan}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        const match = availablePlans.find((p) => p.id === newPlan);
                        setNewResellerData({
                          ...newResellerData,
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
                      value={newResellerData.durationDays !== undefined ? newResellerData.durationDays : ''}
                      onChange={(e) => setNewResellerData({ ...newResellerData, durationDays: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Max Customers Allowed (Quota Limit)
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, marginLeft: '6px' }}>
                      (How many customers this partner can add)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="admin-form-input"
                    value={newResellerData.maxCustomers !== undefined ? newResellerData.maxCustomers : ''}
                    onChange={(e) => setNewResellerData({ ...newResellerData, maxCustomers: e.target.value })}
                    placeholder="e.g. 5, 10, 25, 50"
                    required
                  />
                </div>

                <div className="admin-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="newResellerIsVerified"
                    checked={newResellerData.isVerified}
                    onChange={(e) => setNewResellerData({ ...newResellerData, isVerified: e.target.checked })}
                  />
                  <label htmlFor="newResellerIsVerified" className="admin-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Pre-verify email address (no OTP required)
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  Create Reseller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminResellers;
