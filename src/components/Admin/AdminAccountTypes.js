import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function AdminAccountTypes() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingType, setEditingType] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    return headers;
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/admin/account-types`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.success && Array.isArray(data.account_types)) {
        setTypes(data.account_types);
      } else {
        setTypes([]);
      }
    } catch (e) {
      console.error('Account types API error:', e);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setEditingType({
      name: '',
      slug: '',
      icon: '🚀',
      description: '',
      status: 'active',
      sort_order: types.length + 1
    });
  };

  const openEditModal = (t) => {
    setIsCreateOpen(false);
    setEditingType({ ...t });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingType) return;
    if (!editingType.name.trim()) {
      showCustomAlert({ title: 'Validation Error', message: 'Category Name is required.' });
      return;
    }

    setSaving(true);
    const isEdit = !isCreateOpen && editingType.id;
    const url = isEdit ? `${API_BASE}/admin/account-types/${editingType.id}` : `${API_BASE}/admin/account-types`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editingType.name,
          slug: editingType.slug || editingType.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          icon: editingType.icon || '🚀',
          description: editingType.description || '',
          status: editingType.status || 'active',
          sort_order: Number(editingType.sort_order) || 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || 'Account type saved successfully.');
        setEditingType(null);
        setIsCreateOpen(false);
        fetchTypes();
      } else {
        showFeedback('error', data.error || 'Failed to save account type.');
      }
    } catch (err) {
      showFeedback('error', 'Network error saving account type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    const ok = await confirm({
      title: 'Delete Account Type',
      message: `Are you sure you want to delete category "${t.name}"?`,
      note: t.accounts_count > 0 ? `Warning: ${t.accounts_count} account(s) currently belong to this category and will become uncategorized.` : 'This action is immediate.',
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/admin/account-types/${t.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || 'Category deleted.');
        fetchTypes();
      } else {
        showFeedback('error', data.error || 'Failed to delete category.');
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting category.');
    }
  };

  const quickIcons = ['🌊', '🤖', '🧠', '🎨', '⚡', '🔥', '🚀', '💻', '💡', '💎', '🔑', '🌐'];

  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="admin-accounts-view">
      {/* FEEDBACK ALERT */}
      {feedback && (
        <div style={{
          background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="admin-card-title">
              <span>🏷️</span> Account Types & Categories ({types.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
              Define tool categories (e.g. Google Flow, ChatGPT, Claude). These categories dynamically appear as dedicated menu items in the user sidebar.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search types..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-search-input"
              style={{ minWidth: '180px' }}
            />
            <button
              type="button"
              className="btn-admin-primary"
              onClick={openCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>➕</span>
              <span>Add Account Type</span>
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr style={{ background: '#1c2030', borderBottom: '1px solid #2e344d', color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Category / Type</th>
                <th style={{ padding: '14px 16px' }}>Menu Slug</th>
                <th style={{ padding: '14px 16px' }}>Accounts Count</th>
                <th style={{ padding: '14px 16px' }}>Order</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Loading account types...
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No account types found. Click "+ Add Account Type" to create one.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #23283c' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '4px 8px' }}>
                          {t.icon || '🚀'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: '14px' }}>
                            {t.name}
                          </div>
                          {t.description && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                              {t.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                        {t.slug}
                      </code>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: (t.accounts_count > 0) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: (t.accounts_count > 0) ? '#4ade80' : '#94a3b8',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {t.accounts_count || 0} Accounts
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '13px' }}>
                      {t.sort_order ?? 0}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: t.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.status === 'active' ? '#4ade80' : '#f87171',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {t.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-admin-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => openEditModal(t)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-admin-danger"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(t)}
                        >
                          🗑️ Delete
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

      {/* CREATE / EDIT MODAL */}
      {editingType && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#151928',
            border: '1px solid #2e344d',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            color: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                {isCreateOpen ? '➕ Add New Account Type' : `✏️ Edit "${editingType.name}"`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingType(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>
                  Account Type Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingType.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoSlug = isCreateOpen ? val.toLowerCase().replace(/[^a-z0-9]/g, '-') : editingType.slug;
                    setEditingType({ ...editingType, name: val, slug: autoSlug });
                  }}
                  placeholder="e.g. Google Flow, ChatGPT, Claude"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>
                    Menu Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingType.slug}
                    onChange={(e) => setEditingType({ ...editingType, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    placeholder="e.g. flow, chatgpt"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>
                    Icon / Emoji
                  </label>
                  <input
                    type="text"
                    value={editingType.icon || ''}
                    onChange={(e) => setEditingType({ ...editingType, icon: e.target.value })}
                    placeholder="e.g. 🌊, 🤖"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff', fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* QUICK EMOJI SELECTOR */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Quick Emoji Picker:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {quickIcons.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditingType({ ...editingType, icon: ic })}
                      style={{
                        background: editingType.icon === ic ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${editingType.icon === ic ? '#38bdf8' : '#2e344d'}`,
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={editingType.description || ''}
                  onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
                  placeholder="e.g. High-performance video generative studio"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Status</label>
                  <select
                    value={editingType.status || 'active'}
                    onChange={(e) => setEditingType({ ...editingType, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                  >
                    <option value="active">Active (Visible in user sidebar)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px' }}>Sort Order</label>
                  <input
                    type="number"
                    value={editingType.sort_order ?? 0}
                    onChange={(e) => setEditingType({ ...editingType, sort_order: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f121d', border: '1px solid #2e344d', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setEditingType(null)}
                  style={{ padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-admin-primary"
                  style={{ padding: '10px 22px' }}
                >
                  {saving ? 'Saving...' : (isCreateOpen ? 'Create Account Type' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAccountTypes;
