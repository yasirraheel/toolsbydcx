import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';

function AdminPlans() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);

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
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/plans`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
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
    if (plan.id === 'plan_free' || plan.id === 'plan_pro') {
      await showCustomAlert({
        title: 'Protected Core Plan',
        message: `Default core plan "${plan.name}" cannot be deleted because system services depend on it.`,
        type: 'warning'
      });
      return;
    }

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
                description: 'Complete access with AI video generation credits and tools.',
                features: ['500 AI Video Generation Credits', 'Priority High-Speed Rendering', 'ToolsByDcx Extension Access'],
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

                <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge-pill badge-pro" style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 700 }}>
                    ⚡ {p.credits === -1 ? 'Unlimited Credits' : `${p.credits || 100} Credits Included`}
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
                      setEditingPlan(p);
                      setIsCreateOpen(true);
                    }}
                  >
                    ✏️ Edit Plan
                  </button>
                  {p.id !== 'plan_free' && p.id !== 'plan_pro' && (
                    <button
                      type="button"
                      className="btn-table-action btn-table-delete"
                      onClick={() => handleDeletePlan(p)}
                    >
                      🗑️
                    </button>
                  )}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
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
                      onChange={(e) => setEditingPlan({ ...editingPlan, billingCycle: e.target.value, billing_cycle: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly (90 Days)</option>
                      <option value="lifetime">Lifetime Access</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Credits (-1 for Unlimited)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={editingPlan.credits !== undefined && editingPlan.credits !== null ? editingPlan.credits : 100}
                      onChange={(e) => setEditingPlan({ ...editingPlan, credits: parseInt(e.target.value, 10) })}
                      placeholder="e.g. 200 or -1"
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
                      placeholder="Add feature e.g. 500 AI Video Credits, HD Quality"
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
                    {editingPlan.features && editingPlan.features.map((feat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#090d16',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}
                      >
                        <span>✓ {feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 800 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
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
