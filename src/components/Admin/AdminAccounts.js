import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';

function AdminAccounts() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [accounts, setAccounts] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectAccount, setInspectAccount] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [cookieValidation, setCookieValidation] = useState(null);

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

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/plans`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.plans && Array.isArray(data.plans)) {
        setAvailablePlans(data.plans);
      }
    } catch (e) {
      console.warn('Could not fetch plans dynamically in Accounts view:', e);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/accounts`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        return;
      }
      setAccounts([]);
    } catch (e) {
      console.error('Accounts API error:', e);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showFeedback = (type, message) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleToggleStatus = async (account) => {
    try {
      const res = await fetch(`${API_BASE}/admin/accounts/${account.id}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `Account "${account.service_name}" status changed to ${data.status.toUpperCase()}`);
        fetchAccounts();
      } else {
        showFeedback('error', data.error || 'Failed to toggle account status');
      }
    } catch (e) {
      showFeedback('error', 'Network error toggling status');
    }
  };

  const handleDeleteAccount = async (account) => {
    const confirmed = await confirm({
      title: 'Delete Shared Account',
      message: `Are you sure you want to permanently delete shared account "${account.service_name}"? Connected Chrome extensions will immediately lose access to these injected cookies.`,
      note: 'All active sessions and cookie injections tied to this account will be terminated.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/admin/accounts/${account.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', `Account "${account.service_name}" deleted.`);
        fetchAccounts();
      } else {
        const data = await res.json();
        await showCustomAlert({
          title: 'Deletion Failed',
          message: data.error || 'Failed to delete account.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'Network error deleting account.',
        type: 'danger'
      });
    }
  };

  const validateCookieText = (text) => {
    if (!text || !text.trim()) {
      return { valid: false, message: 'Cookie data cannot be empty.' };
    }
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return { valid: false, message: 'Cookies must be a JSON array of cookie objects [ { "name": "...", "value": "..." } ].' };
      }
      if (parsed.length === 0) {
        return { valid: false, message: 'JSON array is empty. Please provide at least 1 cookie object.' };
      }
      const hasInvalidItem = parsed.some(c => !c || typeof c !== 'object' || !c.name);
      if (hasInvalidItem) {
        return { valid: false, message: 'Each item in the cookie array must have at least a "name" property.' };
      }
      return {
        valid: true,
        count: parsed.length,
        domains: [...new Set(parsed.map(c => c.domain || 'current domain'))].join(', ')
      };
    } catch (err) {
      return { valid: false, message: `JSON syntax error: ${err.message}` };
    }
  };

  const handleFormatCookieJson = () => {
    if (!editingAccount || !editingAccount.cookies) return;
    try {
      const parsed = JSON.parse(editingAccount.cookies);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditingAccount({ ...editingAccount, cookies: formatted });
      setCookieValidation({ valid: true, count: parsed.length, domains: [...new Set(parsed.map(c => c.domain || 'current domain'))].join(', ') });
    } catch (e) {
      setCookieValidation({ valid: false, message: 'Could not auto-format: Invalid JSON.' });
    }
  };

  const handleValidateClick = () => {
    if (!editingAccount) return;
    const res = validateCookieText(editingAccount.cookies);
    setCookieValidation(res);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;

    const validation = validateCookieText(editingAccount.cookies);
    if (!validation.valid) {
      setCookieValidation(validation);
      return;
    }

    const isEdit = !isCreateOpen && editingAccount.id;
    const url = isEdit ? `${API_BASE}/admin/accounts/${editingAccount.id}` : `${API_BASE}/admin/accounts`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          service_name: editingAccount.service_name,
          target_url: editingAccount.target_url,
          description: editingAccount.description,
          cookies: editingAccount.cookies,
          status: editingAccount.status || 'active',
          allowed_plans: editingAccount.allowed_plans || ['plan_pro', 'plan_unlimited'],
          max_users: Number(editingAccount.max_users) || 100
        })
      });

      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || 'Account saved successfully!');
        setEditingAccount(null);
        setIsCreateOpen(false);
        setCookieValidation(null);
        fetchAccounts();
      } else {
        showFeedback('error', data.error || 'Failed to save account.');
      }
    } catch (err) {
      showFeedback('error', 'Network error saving account.');
    }
  };

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setCookieValidation(null);
    setEditingAccount({
      service_name: '',
      target_url: 'https://labs.google/fx/tools/flow',
      description: '',
      status: 'active',
      allowed_plans: ['plan_pro', 'plan_unlimited'],
      max_users: 100,
      cookies: JSON.stringify([
        {
          name: '__Secure-next-auth.session-token',
          value: 'PASTE_COOKIE_SESSION_VALUE_HERE',
          domain: '.google.com',
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: 'no_restriction'
        }
      ], null, 2)
    });
  };

  const openEditModal = (acc) => {
    setIsCreateOpen(false);
    setCookieValidation(null);
    let cookieStr = acc.cookies;
    try {
      if (typeof acc.cookies !== 'string') cookieStr = JSON.stringify(acc.cookies, null, 2);
      else {
        const parsed = JSON.parse(acc.cookies);
        cookieStr = JSON.stringify(parsed, null, 2);
      }
    } catch (_) {}

    setEditingAccount({
      ...acc,
      cookies: cookieStr,
      allowed_plans: Array.isArray(acc.allowed_plans) ? acc.allowed_plans : ['plan_pro', 'plan_unlimited']
    });
  };

  const toggleAllowedPlan = (planId) => {
    if (!editingAccount) return;
    const current = editingAccount.allowed_plans || [];
    let updated;
    if (current.includes(planId)) {
      updated = current.filter(p => p !== planId);
    } else {
      updated = [...current, planId];
    }
    setEditingAccount({ ...editingAccount, allowed_plans: updated });
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          acc.target_url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || acc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCookies = accounts.reduce((sum, a) => sum + (a.cookieCount || 0), 0);
  const activeCount = accounts.filter(a => a.status === 'active').length;

  return (
    <div className="admin-content-inner">
      {actionFeedback && (
        <div className={`action-alert ${actionFeedback.type}`} style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '18px',
          background: actionFeedback.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: '#f9fafb',
          fontWeight: 600,
          border: actionFeedback.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444'
        }}>
          {actionFeedback.type === 'success' ? '✅ ' : '⚠️ '}
          {actionFeedback.message}
        </div>
      )}

      {/* METRIC PILLS */}
      <div className="admin-metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="metric-box" style={{ background: '#131926', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Shared Accounts</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#f8fafc', marginTop: '8px' }}>{accounts.length}</div>
          <div style={{ fontSize: '13px', color: '#22c55e', marginTop: '6px', fontWeight: 600 }}>Active pools: {activeCount}</div>
        </div>

        <div className="metric-box" style={{ background: '#131926', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Managed Sessions</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#38bdf8', marginTop: '8px' }}>{totalCookies}</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Synchronized Extension Payloads</div>
        </div>

        <div className="metric-box" style={{ background: '#131926', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Target Platforms</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#a855f7', marginTop: '8px' }}>Google Flow</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Access Shield Active</div>
        </div>
      </div>

      {/* CONTROLS HEADER */}
      <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search shared accounts or URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: '#161926', border: '1px solid #2e344d', color: '#f3f4f6' }}
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', background: '#161926', border: '1px solid #2e344d', color: '#f3f4f6' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
          </select>
        </div>

        <button
          className="admin-btn primary"
          onClick={openCreateModal}
          style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>➕</span> Add Shared Account
        </button>
      </div>

      {/* ACCOUNTS LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading shared accounts...</div>
      ) : filteredAccounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: '#161926', borderRadius: '12px', border: '1px solid #2e344d', color: '#9ca3af' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔑</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#f3f4f6' }}>No Shared Accounts Found</div>
          <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '400px', margin: '6px auto 16px' }}>
            {searchQuery ? 'No accounts matched your search criteria.' : 'Create your first shared account to enable cookie injection for extension users.'}
          </p>
          <button className="admin-btn primary" onClick={openCreateModal} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            Add Shared Account
          </button>
        </div>
      ) : (
        <div className="table-responsive" style={{ background: '#161926', borderRadius: '12px', border: '1px solid #2e344d', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1c2030', borderBottom: '1px solid #2e344d', color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Service / Account</th>
                <th style={{ padding: '14px 16px' }}>Target URL</th>
                <th style={{ padding: '14px 16px' }}>Cookies</th>
                <th style={{ padding: '14px 16px' }}>Version</th>
                <th style={{ padding: '14px 16px' }}>Allowed Plans</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #23283c' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: '14px' }}>{acc.service_name}</div>
                    {acc.description && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px', maxWidth: '280px' }}>{acc.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <a
                      href={acc.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>🔗</span> {acc.target_url}
                    </a>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#f8fafc'
                    }}>
                      🍪 {acc.cookieCount || 0} cookies
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: '#312e81',
                      border: '1px solid #4338ca',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#c7d2fe'
                    }}>
                      v{acc.cookie_version || 1}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(acc.allowed_plans || ['plan_pro', 'plan_unlimited']).map((p) => {
                        const matched = availablePlans.find(
                          (plan) => plan.id.toLowerCase() === p.toLowerCase() ||
                                    plan.id.replace('plan_', '').toLowerCase() === p.toLowerCase()
                        );
                        const label = matched ? matched.name : p.replace('plan_', '').toUpperCase();
                        const isUnlimited = p.includes('unlimited') || label.toLowerCase().includes('max');
                        const isPro = p.includes('pro') || label.toLowerCase().includes('ultra');

                        return (
                          <span
                            key={p}
                            style={{
                              background: isUnlimited ? '#4c1d95' : isPro ? '#065f46' : '#374151',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => handleToggleStatus(acc)}
                      title="Click to toggle active / paused"
                      style={{
                        background: acc.status === 'active' ? '#064e3b' : '#78350f',
                        border: acc.status === 'active' ? '1px solid #059669' : '1px solid #d97706',
                        color: acc.status === 'active' ? '#34d399' : '#fcd34d',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: acc.status === 'active' ? '#10b981' : '#f59e0b' }}></span>
                      {acc.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => setInspectAccount(acc)}
                        title="Inspect Cookies JSON"
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#93c5fd', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        👁️ Inspect
                      </button>
                      <button
                        onClick={() => openEditModal(acc)}
                        title="Edit Account"
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc)}
                        title="Delete Account"
                        style={{ background: '#7f1d1d', border: '1px solid #991b1b', color: '#fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {editingAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#161926',
            border: '1px solid #2e344d',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            color: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                {isCreateOpen ? '➕ Add New Shared Account' : `✏️ Edit "${editingAccount.service_name}"`}
              </h3>
              <button
                onClick={() => setEditingAccount(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Service Name *</label>
                  <input
                    type="text"
                    required
                    value={editingAccount.service_name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, service_name: e.target.value })}
                    placeholder="e.g. Google Flow Primary"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Target Platform URL *</label>
                  <input
                    type="url"
                    required
                    value={editingAccount.target_url}
                    onChange={(e) => setEditingAccount({ ...editingAccount, target_url: e.target.value })}
                    placeholder="https://labs.google/fx/tools/flow"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Description / Admin Notes</label>
                <input
                  type="text"
                  value={editingAccount.description || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
                  placeholder="e.g. Active pool for Pro & Unlimited subscribers"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                />
              </div>

              {/* STATUS & ALLOWED PLANS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Account Status</label>
                  <select
                    value={editingAccount.status || 'active'}
                    onChange={(e) => setEditingAccount({ ...editingAccount, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                  >
                    <option value="active">Active (Injects into extension)</option>
                    <option value="paused">Paused (Temporarily disabled)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Allowed Subscription Plans</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {(availablePlans.length > 0
                      ? availablePlans.map(p => ({ id: p.id, label: p.name }))
                      : [
                          { id: 'plan_pro', label: 'Flow Ultra' },
                          { id: 'plan_unlimited', label: 'Flow Max' },
                          { id: 'plan_free', label: 'Flow Basic' }
                        ]
                    ).map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(editingAccount.allowed_plans || []).includes(p.id) || (editingAccount.allowed_plans || []).includes(p.id.replace('plan_', ''))}
                          onChange={() => toggleAllowedPlan(p.id)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* COOKIES JSON TEXTAREA */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af' }}>
                    Cookie JSON Array (Chrome Format) *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleFormatCookieJson}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#93c5fd', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🧹 Auto-Format JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleValidateClick}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#a7f3d0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🔍 Validate Cookies
                    </button>
                  </div>
                </div>

                <textarea
                  rows={9}
                  required
                  value={editingAccount.cookies}
                  onChange={(e) => {
                    setEditingAccount({ ...editingAccount, cookies: e.target.value });
                    setCookieValidation(null);
                  }}
                  placeholder='[ { "name": "__Secure-next-auth.session-token", "value": "...", "domain": ".google.com", "path": "/" } ]'
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: cookieValidation && !cookieValidation.valid ? '1px solid #ef4444' : '1px solid #2e344d',
                    color: '#a5f3fc',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.4'
                  }}
                />

                {cookieValidation && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: cookieValidation.valid ? '#064e3b' : '#7f1d1d',
                    color: cookieValidation.valid ? '#6ee7b7' : '#fca5a5'
                  }}>
                    {cookieValidation.valid
                      ? `✅ Valid: ${cookieValidation.count} cookie(s) detected for domain(s): ${cookieValidation.domains}`
                      : `⚠️ ${cookieValidation.message}`}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  ℹ️ Updating cookie data automatically increments the cookie version, which instructs active Chrome extensions to re-inject immediately.
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: '#1f2937', border: '1px solid #374151', color: '#d1d5db', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', borderRadius: '8px', background: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {isCreateOpen ? 'Create Shared Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT COOKIES MODAL */}
      {inspectAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#161926',
            border: '1px solid #2e344d',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '22px',
            color: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>🍪 Cookies for {inspectAccount.service_name}</h3>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  Cookie Version: v{inspectAccount.cookie_version || 1} • {inspectAccount.cookieCount || 0} items
                </div>
              </div>
              <button
                onClick={() => setInspectAccount(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <pre style={{
              flex: 1,
              overflowY: 'auto',
              background: '#090d16',
              border: '1px solid #2e344d',
              borderRadius: '8px',
              padding: '14px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#38bdf8',
              margin: 0
            }}>
              {inspectAccount.cookies}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setInspectAccount(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', background: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAccounts;
