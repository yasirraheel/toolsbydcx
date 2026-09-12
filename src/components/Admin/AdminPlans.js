import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function AdminPlans() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);
  const [editingFeatureIdx, setEditingFeatureIdx] = useState(null);
  const [editingFeatureText, setEditingFeatureText] = useState('');

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
      setLoading(true);
      const res = await authFetch(`${API_BASE}/admin/plans`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.plans && data.plans.length > 0) {
        setPlans(data.plans);
        return;
      }
      setPlans([]);
    } catch (e) {
      console.error('API plans error:', e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const target = editingPlan;
    if (!target) return;

    try {
      const res = await fetch(`${API_BASE}/admin/plans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(target)
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Plan saved successfully!' });
        setEditingPlan(null);
        setIsCreateOpen(false);
        fetchPlans();
      } else {
        setActionFeedback({ type: 'error', message: data.error || 'Failed to save plan.' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: 'Network error saving plan.' });
    }
  };

  const handleDeletePlan = async (plan) => {
    const confirmed = await confirm({
      title: 'Delete Subscription Plan',
      message: `Are you sure you want to permanently delete plan "${plan.name}"?`,
      note: 'Subscribers assigned to this plan will remain intact until reassigned.',
      confirmText: 'Delete Plan',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/admin/plans/${plan.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: `Plan "${plan.name}" deleted successfully.` });
        fetchPlans();
      } else {
        const data = await res.json();
        await showCustomAlert({
          title: 'Deletion Failed',
          message: data.error || 'Failed to delete plan.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Network Error',
        message: 'A network error occurred while deleting the plan.',
        type: 'danger'
      });
    }
  };

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setEditingPlan({
      ...editingPlan,
      features: [...(editingPlan.features || []), featureInput.trim()]
    });
    setFeatureInput('');
  };

  const handleRemoveFeature = (index) => {
    const updated = [...(editingPlan.features || [])];
    updated.splice(index, 1);
    setEditingPlan({ ...editingPlan, features: updated });
    if (editingFeatureIdx === index) {
      setEditingFeatureIdx(null);
      setEditingFeatureText('');
    }
  };

  const handleStartEditFeature = (index, text) => {
    setEditingFeatureIdx(index);
    setEditingFeatureText(text);
  };

  const handleSaveFeatureEdit = (index) => {
    if (!editingFeatureText.trim()) return;
    const updated = [...(editingPlan.features || [])];
    updated[index] = editingFeatureText.trim();
    setEditingPlan({ ...editingPlan, features: updated });
    setEditingFeatureIdx(null);
    setEditingFeatureText('');
  };

  const handleCancelFeatureEdit = () => {
    setEditingFeatureIdx(null);
    setEditingFeatureText('');
  };

  return (
    <div className="admin-plans-view">
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

      {/* HEADER BAR */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">
              <span>💳</span> Plans
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Configure pricing tiers, subscriptions, and access permissions.
            </p>
          </div>

          <button
            type="button"
            className="btn-admin-primary"
            onClick={() => {
              setEditingPlan({
                id: 'plan_' + Date.now(),
                name: '',
                price: 9.99,
                billingCycle: 'monthly',
                durationDays: 30,
                description: 'Complete access to premium tools and services.',
                features: ['Full Tool Access', 'Priority Fast Routing', 'ToolsByDcx Extension Access'],
                isActive: true
              });
              setIsCreateOpen(true);
            }}
          >
            + Create New Plan
          </button>
        </div>
      </div>

      {/* PLANS CARDS GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
          Loading plans...
        </div>
      ) : (
        <div className="admin-plans-grid">
          {plans.map((p) => {
            const isFree = p.price === 0;
            return (
              <div key={p.id} className={`admin-plan-card ${!isFree ? 'featured' : ''}`}>
                <div className="admin-plan-badge">
                  {p.subscribers_count} Users
                </div>

                <div className="admin-plan-name">{p.name}</div>
                <div className="admin-plan-price">
                  {isFree ? 'FREE' : `$${Number(p.price).toFixed(2)}`}
                  {!isFree && <span className="admin-plan-cycle"> / {p.billing_cycle || 'month'}</span>}
                </div>

                <div className="admin-plan-desc">{p.description}</div>
                <div style={{ margin: '8px 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge-pill badge-pro" style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 700 }}>
                    ⏱ {p.duration_days ? `${p.duration_days} Days Access` : (p.billing_cycle === 'lifetime' ? 'Lifetime Access' : '30 Days Access')}
                  </span>
                </div>

                <ul className="admin-plan-features">
                  {p.features && p.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="btn-admin-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setEditingPlan({
                        ...p,
                        durationDays: p.duration_days !== undefined && p.duration_days !== null ? p.duration_days : 30
                      });
                      setIsCreateOpen(true);
                    }}
                  >
                    ✏️ Edit Plan
                  </button>
                  <button
                    type="button"
                    className="btn-table-action btn-table-delete"
                    title="Delete Plan"
                    onClick={() => handleDeletePlan(p)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT / CREATE PLAN MODAL */}
      {isCreateOpen && editingPlan && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4 className="admin-modal-title">
                {editingPlan.id.startsWith('plan_') && !plans.find(p => p.id === editingPlan.id) ? 'Create Plan' : `Edit Plan: ${editingPlan.name}`}
              </h4>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsCreateOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePlan}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Plan Title</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="admin-form-input"
                      value={editingPlan.price}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Billing Cycle</label>
                    <select
                      className="admin-select"
                      value={editingPlan.billingCycle || editingPlan.billing_cycle || 'monthly'}
                      onChange={(e) => {
                        const cycle = e.target.value;
                        let defDays = 30;
                        if (cycle === 'quarterly') defDays = 90;
                        else if (cycle === 'lifetime') defDays = 3650;
                        setEditingPlan({ ...editingPlan, billingCycle: cycle, billing_cycle: cycle, durationDays: defDays, duration_days: defDays });
                      }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly (90 Days)</option>
                      <option value="lifetime">Lifetime Access</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      className="admin-form-input"
                      value={editingPlan.durationDays !== undefined && editingPlan.durationDays !== null ? editingPlan.durationDays : (editingPlan.duration_days || 30)}
                      onChange={(e) => {
                        const d = parseInt(e.target.value, 10) || 30;
                        setEditingPlan({ ...editingPlan, durationDays: d, duration_days: d });
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Plan Description</label>
                  <textarea
                    rows={2}
                    className="admin-form-textarea"
                    value={editingPlan.description || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Features Checklist</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="Add feature e.g. Multi-Account Pool, Fast Rotation"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-admin-secondary"
                      onClick={handleAddFeature}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {editingPlan.features && editingPlan.features.map((feat, idx) => {
                      const isEditing = editingFeatureIdx === idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            background: '#090d16',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            border: isEditing ? '1px solid #38bdf8' : '1px solid transparent'
                          }}
                        >
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                              <input
                                type="text"
                                className="admin-form-input"
                                style={{ padding: '4px 8px', fontSize: '13px', flex: 1 }}
                                value={editingFeatureText}
                                onChange={(e) => setEditingFeatureText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveFeatureEdit(idx);
                                  } else if (e.key === 'Escape') {
                                    handleCancelFeatureEdit();
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="btn-admin-primary"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => handleSaveFeatureEdit(idx)}
                                title="Save changes"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn-admin-secondary"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={handleCancelFeatureEdit}
                                title="Cancel edit"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span style={{ flex: 1, color: '#f1f5f9' }}>✓ {feat}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditFeature(idx, feat)}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    color: '#38bdf8',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                  title="Edit feature text"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFeature(idx)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                  }}
                                  title="Delete feature"
                                >
                                  ✕
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlans;
