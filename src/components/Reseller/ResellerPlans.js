import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function ResellerPlans() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const [form, setForm] = useState({
    name: '',
    price: '',
    duration_days: 30,
    description: '',
    featuresText: '',
    is_active: 1
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/reseller/plans`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } catch (e) {
      console.error('Error fetching reseller plans:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setForm({
        name: plan.name || '',
        price: plan.price !== undefined ? plan.price : '',
        duration_days: plan.duration_days || 30,
        description: plan.description || '',
        featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
        is_active: plan.is_active !== undefined ? Number(plan.is_active) : 1
      });
    } else {
      setEditingPlan(null);
      setForm({
        name: '',
        price: '15.00',
        duration_days: 30,
        description: 'Complete tool access with high performance',
        featuresText: 'High-Speed Rendering\n1-Click Launch Extension\nPriority Tool Access\nCustomer Support',
        is_active: 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      await showCustomAlert({ title: 'Plan Name Required', message: 'Please enter a plan name.', type: 'warning' });
      return;
    }

    const featuresList = form.featuresText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      duration_days: parseInt(form.duration_days, 10) || 30,
      description: form.description.trim(),
      features: featuresList,
      is_active: form.is_active
    };

    try {
      const url = editingPlan 
        ? `${API_BASE}/reseller/plans/${editingPlan.id}` 
        : `${API_BASE}/reseller/plans`;
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: editingPlan ? 'Plan updated successfully!' : 'New custom plan created!'
        });
        setIsModalOpen(false);
        fetchPlans();
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        await showCustomAlert({ title: 'Error', message: data.error || 'Failed to save plan.', type: 'danger' });
      }
    } catch (err) {
      await showCustomAlert({ title: 'Network Error', message: 'Failed to communicate with server.', type: 'danger' });
    }
  };

  const handleDeletePlan = async (plan) => {
    const isOk = await confirm({
      title: 'Delete Plan',
      message: `Are you sure you want to delete "${plan.name}"? Existing customers on this plan will not be affected.`,
      type: 'danger',
      confirmText: 'Delete Plan'
    });
    if (!isOk) return;

    try {
      const res = await authFetch(`${API_BASE}/reseller/plans/${plan.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Plan deleted successfully.' });
        fetchPlans();
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-content-card">
      {/* HEADER */}
      <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="admin-card-title">💳 My Custom Plans & Pricing</h2>
          <p className="admin-card-subtitle">
            Create and manage the custom subscription plans you offer to your customers with your own pricing
          </p>
        </div>

        <button
          type="button"
          className="btn-admin-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => handleOpenModal()}
        >
          <span>+</span>
          <span>Create Custom Plan</span>
        </button>
      </div>

      {actionFeedback && (
        <div style={{
          padding: '12px 18px',
          margin: '16px 20px 0',
          borderRadius: '10px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid #22c55e',
          color: '#4ade80',
          fontSize: '14px',
          fontWeight: 600
        }}>
          {actionFeedback.message}
        </div>
      )}

      {/* PLANS CARDS GRID */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', padding: '30px', textAlign: 'center' }}>Loading your custom plans...</div>
        ) : plans.length === 0 ? (
          <div style={{
            background: '#0d1322',
            border: '1px dashed #334155',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>💳</div>
            <h3 style={{ color: '#f8fafc', margin: '0 0 8px', fontSize: '18px' }}>No Custom Plans Created Yet</h3>
            <p style={{ color: '#94a3b8', maxWidth: '440px', margin: '0 auto 18px', fontSize: '14px' }}>
              Create your own plans with custom retail pricing and durations. These plans will appear when you create new customers.
            </p>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => handleOpenModal()}
            >
              + Create First Plan
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
            {plans.map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#0d1322',
                  border: '1px solid #1e293b',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                      {p.name}
                    </h4>
                    <span style={{
                      background: p.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: p.is_active ? '#4ade80' : '#f87171',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${p.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      {p.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 900, color: '#22c55e' }}>
                      ${Number(p.price).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                      / {p.duration_days} days
                    </span>
                  </div>

                  {p.description && (
                    <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 14px', lineHeight: 1.4 }}>
                      {p.description}
                    </p>
                  )}

                  {Array.isArray(p.features) && p.features.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.features.map((feat, idx) => (
                        <li key={idx} style={{ color: '#cbd5e1' }}>{feat}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #1e293b' }}>
                  <button
                    type="button"
                    className="btn-action"
                    style={{ color: '#38bdf8' }}
                    onClick={() => handleOpenModal(p)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    className="btn-action"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDeletePlan(p)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: ADD / EDIT CUSTOM PLAN
          ========================================================================= */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingPlan ? '✏️ Edit Custom Plan' : '+ Create Custom Plan'}
              </h3>
              <button type="button" className="admin-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSavePlan}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Plan Name *</label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. VIP Creator Pass, Monthly Pro"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Retail Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="admin-form-input"
                      placeholder="e.g. 19.99"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Duration (Days) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="admin-form-input"
                      placeholder="e.g. 30"
                      value={form.duration_days}
                      onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Short Description</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. Full VIP access to high-speed AI tools"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Features List (One feature per line)
                  </label>
                  <textarea
                    rows="4"
                    className="admin-form-input"
                    placeholder="Fast Server Pool&#10;1-Click Launch Extension&#10;1080p Export&#10;24/7 Support"
                    value={form.featuresText}
                    onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Plan Status</label>
                  <select
                    className="admin-form-input"
                    value={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
                  >
                    <option value={1}>Active (Available for customer creation)</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn-admin-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResellerPlans;
