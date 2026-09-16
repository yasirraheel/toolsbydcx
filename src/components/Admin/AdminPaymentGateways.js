import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function AdminPaymentGateways({ initialTab = 'recharges', onRechargeAction }) {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [subTab, setSubTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) setSubTab(initialTab);
  }, [initialTab]); // 'recharges' | 'gateways'
  
  // Gateways State
  const [gateways, setGateways] = useState([]);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);
  const [editingGateway, setEditingGateway] = useState(null);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayForm, setGatewayForm] = useState({
    name: '',
    currency: 'USD',
    instructions: '',
    account_details: '',
    is_active: 1
  });

  // Recharges State
  const [recharges, setRecharges] = useState([]);
  const [rechargesLoading, setRechargesLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [rechargeSearch, setRechargeSearch] = useState('');
  const [previewProofUrl, setPreviewProofUrl] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Approval/Rejection Modal
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'approve', // 'approve' | 'reject'
    recharge: null,
    adminNotes: '',
    submitting: false
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Fetch Gateways
  const fetchGateways = async () => {
    try {
      setGatewaysLoading(true);
      const res = await authFetch(`${API_BASE}/admin/payment-gateways`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.success && Array.isArray(data.gateways)) {
        setGateways(data.gateways);
      }
    } catch (e) {
      console.error('Error fetching gateways:', e);
    } finally {
      setGatewaysLoading(false);
    }
  };

  // Fetch Recharges
  const fetchRecharges = async () => {
    try {
      setRechargesLoading(true);
      const query = new URLSearchParams();
      if (statusFilter) query.append('status', statusFilter);
      const res = await authFetch(`${API_BASE}/admin/recharges?${query.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.success && Array.isArray(data.recharges)) {
        setRecharges(data.recharges);
      }
    } catch (e) {
      console.error('Error fetching recharges:', e);
    } finally {
      setRechargesLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
    fetchRecharges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (subTab === 'recharges') {
      fetchRecharges();
    } else {
      fetchGateways();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, statusFilter]);

  // Open Gateway Modal
  const handleOpenGatewayModal = (gw = null) => {
    if (gw) {
      setEditingGateway(gw);
      setGatewayForm({
        name: gw.name || '',
        currency: gw.currency || 'USD',
        instructions: gw.instructions || '',
        account_details: gw.account_details || '',
        is_active: gw.is_active !== undefined ? Number(gw.is_active) : 1
      });
    } else {
      setEditingGateway(null);
      setGatewayForm({
        name: '',
        currency: 'USD',
        instructions: 'Please transfer the exact amount and copy your Transaction ID.\nUpload the payment screenshot/receipt below.',
        account_details: '',
        is_active: 1
      });
    }
    setIsGatewayModalOpen(true);
  };

  // Preset Template Helper
  const handleApplyPreset = (preset) => {
    if (preset === 'usdt') {
      setGatewayForm({
        name: 'Binance USDT (TRC20)',
        currency: 'USDT',
        instructions: 'Send USDT (TRC20) to the wallet address below. Ensure you select the TRC20 network to prevent loss of funds.',
        account_details: 'Network: TRC20\nAddress: TXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nMemo: (Not required)',
        is_active: 1
      });
    } else if (preset === 'bank') {
      setGatewayForm({
        name: 'Bank Transfer / Wire',
        currency: 'USD',
        instructions: 'Make transfer via online banking or wire. Use your Reseller Name as the transaction reference.',
        account_details: 'Bank Name: Standard Chartered\nAccount Title: ToolsByDcx Global\nAccount Number: 1234567890\nIBAN: PK36SCBL0000001234567890\nSWIFT: SCBLPKKA',
        is_active: 1
      });
    } else if (preset === 'easypaisa') {
      setGatewayForm({
        name: 'EasyPaisa / JazzCash',
        currency: 'PKR',
        instructions: 'Send payment to the mobile wallet account below. Copy the 11-digit TID from the SMS receipt.',
        account_details: 'Account Title: Muhammad Ali\nAccount Number: 03001234567\nBank / Wallet: EasyPaisa',
        is_active: 1
      });
    }
  };

  // Save Gateway
  const handleSaveGateway = async (e) => {
    e.preventDefault();
    try {
      const url = editingGateway 
        ? `${API_BASE}/admin/payment-gateways/${editingGateway.id}` 
        : `${API_BASE}/admin/payment-gateways`;
      const method = editingGateway ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(gatewayForm)
      });
      const data = await res.json();
      if (res.ok) {
        setIsGatewayModalOpen(false);
        setActionFeedback({ type: 'success', message: editingGateway ? 'Gateway updated successfully!' : 'Gateway created successfully!' });
        fetchGateways();
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        await showCustomAlert({
          title: 'Error',
          message: data.error || 'Failed to save gateway',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({ title: 'Network Error', message: 'Failed to save gateway', type: 'danger' });
    }
  };

  // Delete Gateway
  const handleDeleteGateway = async (gw) => {
    const isOk = await confirm({
      title: 'Delete Payment Gateway',
      message: `Are you sure you want to delete "${gw.name}"? Resellers will no longer see this payment method.`,
      type: 'danger',
      confirmText: 'Delete Gateway'
    });
    if (!isOk) return;

    try {
      const res = await authFetch(`${API_BASE}/admin/payment-gateways/${gw.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Gateway deleted successfully.' });
        fetchGateways();
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Action Modal (Approve / Reject)
  const handleOpenActionModal = (recharge, type) => {
    setActionModal({
      isOpen: true,
      type,
      recharge,
      adminNotes: type === 'approve' ? 'Approved by Admin' : 'Invalid transaction ID or proof.',
      submitting: false
    });
  };

  // Submit Action (Approve / Reject)
  const handleSubmitAction = async () => {
    const { type, recharge, adminNotes } = actionModal;
    if (!recharge) return;

    try {
      setActionModal(prev => ({ ...prev, submitting: true }));
      const url = `${API_BASE}/admin/recharges/${recharge.id}/${type}`;
      const res = await authFetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ admin_notes: adminNotes })
      });
      const data = await res.json();

      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: type === 'approve' 
            ? `✅ Recharge of $${Number(recharge.amount).toFixed(2)} approved! Reseller wallet credited.` 
            : `❌ Recharge request marked as rejected.`
        });
        setActionModal({ isOpen: false, type: 'approve', recharge: null, adminNotes: '', submitting: false });
        fetchRecharges();
        if (onRechargeAction) onRechargeAction();
        setTimeout(() => setActionFeedback(null), 5000);
      } else {
        await showCustomAlert({
          title: 'Operation Failed',
          message: data.error || 'Failed to process request',
          type: 'danger'
        });
        setActionModal(prev => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      await showCustomAlert({ title: 'Network Error', message: 'Failed to connect to server', type: 'danger' });
      setActionModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Filtered Recharges
  const filteredRecharges = recharges.filter(r => {
    if (!rechargeSearch) return true;
    const s = rechargeSearch.toLowerCase();
    return (
      (r.reseller_name && r.reseller_name.toLowerCase().includes(s)) ||
      (r.reseller_email && r.reseller_email.toLowerCase().includes(s)) ||
      (r.transaction_id && r.transaction_id.toLowerCase().includes(s)) ||
      (r.gateway_name && r.gateway_name.toLowerCase().includes(s))
    );
  });

  const pendingCount = recharges.filter(r => r.status === 'pending').length;

  return (
    <div className="admin-content-card">
      {/* HEADER & SUBTABS */}
      <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="admin-card-title">💳 Gateways & Wallet Recharges</h2>
          <p className="admin-card-subtitle">
            Configure manual payment methods and review reseller wallet recharge requests
          </p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: '#0d1322', padding: '5px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <button
            type="button"
            className={`btn-admin-tab ${subTab === 'recharges' ? 'active' : ''}`}
            onClick={() => setSubTab('recharges')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'recharges' ? '#22c55e' : 'transparent',
              color: subTab === 'recharges' ? '#000' : '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💰 Recharge Requests</span>
            {pendingCount > 0 && (
              <span style={{
                background: subTab === 'recharges' ? '#000' : '#ef4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn-admin-tab ${subTab === 'gateways' ? 'active' : ''}`}
            onClick={() => setSubTab('gateways')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'gateways' ? '#22c55e' : 'transparent',
              color: subTab === 'gateways' ? '#000' : '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Manual Gateways ({gateways.length})
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div style={{
          padding: '12px 18px',
          margin: '16px 20px 0',
          borderRadius: '10px',
          background: actionFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionFeedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: actionFeedback.type === 'success' ? '#4ade80' : '#f87171',
          fontSize: '14px',
          fontWeight: 600
        }}>
          {actionFeedback.message}
        </div>
      )}

      {/* =========================================================================
          TAB 1: RECHARGE REQUESTS
          ========================================================================= */}
      {subTab === 'recharges' && (
        <div style={{ padding: '20px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Search by reseller, email, or TXR ID..."
                className="admin-form-input"
                style={{ maxWidth: '360px' }}
                value={rechargeSearch}
                onChange={(e) => setRechargeSearch(e.target.value)}
              />
              <select
                className="admin-form-input"
                style={{ width: '160px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">🟡 Pending Review</option>
                <option value="approved">🟢 Approved</option>
                <option value="rejected">🔴 Rejected</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-admin-secondary"
              onClick={fetchRecharges}
            >
              🔄 Refresh List
            </button>
          </div>

          {/* Table Container with proper horizontal scrolling & modern styling */}
          <div className="admin-table-container" style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <table className="admin-table" style={{ minWidth: '950px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Date</th>
                  <th>Reseller Partner</th>
                  <th>Payment Method</th>
                  <th>Deposit Amount</th>
                  <th>TXR Reference</th>
                  <th>Proof Receipt</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px', minWidth: '220px' }}>Review Actions</th>
                </tr>
              </thead>
              <tbody>
                {rechargesLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '18px', height: '18px', border: '2px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        <span>Loading recharge requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecharges.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No recharge requests found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecharges.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                            color: '#090d16',
                            fontWeight: 800,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {(r.reseller_name || 'R').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px', whiteSpace: 'nowrap' }}>{r.reseller_name || 'Reseller'}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.reseller_email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {r.gateway_name || 'Manual Gateway'}
                        </span>
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80' }}>
                            ${Number(r.amount).toFixed(2)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '5px', fontWeight: 600 }}>
                            {r.currency || 'USD'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code style={{
                          background: '#0b1120',
                          border: '1px solid #334155',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          color: '#facc15',
                          fontSize: '12px',
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}>
                          {r.transaction_id}
                        </code>
                      </td>
                      <td>
                        {r.proof_image ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(r.proof_image)}
                            className="btn-table-action"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              color: '#38bdf8',
                              borderColor: 'rgba(56, 189, 248, 0.4)',
                              background: 'rgba(56, 189, 248, 0.1)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🖼️ View Proof
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>No image</span>
                        )}
                      </td>
                      <td>
                        {r.status === 'pending' && (
                          <span className="badge-pill badge-pending" style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}>
                            ● PENDING
                          </span>
                        )}
                        {r.status === 'approved' && (
                          <span className="badge-pill badge-green" style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}>
                            ✓ APPROVED
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="badge-pill badge-failed" style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}>
                            ✕ REJECTED
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                        {r.status === 'pending' ? (
                          <div className="admin-actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn-table-action btn-table-approve"
                              onClick={() => handleOpenActionModal(r, 'approve')}
                              title="Approve and credit wallet balance"
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="btn-table-action btn-table-reject"
                              onClick={() => handleOpenActionModal(r, 'reject')}
                              title="Reject deposit request"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'right' }}>
                            {r.admin_notes ? `Note: ${r.admin_notes}` : (r.status === 'approved' ? 'Credited to wallet' : 'Declined')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PAYMENT GATEWAYS CONFIGURATION
          ========================================================================= */}
      {subTab === 'gateways' && (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Active Manual Gateways
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>
                Resellers will choose from these methods when requesting a wallet recharge.
              </p>
            </div>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => handleOpenGatewayModal()}
            >
              + Add Payment Gateway
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {gatewaysLoading ? (
              <div style={{ color: '#94a3b8', padding: '20px' }}>Loading gateways...</div>
            ) : gateways.length === 0 ? (
              <div style={{ color: '#64748b', padding: '30px', gridColumn: '1 / -1', textAlign: 'center' }}>
                No manual payment gateways created yet. Click "+ Add Payment Gateway" to create one.
              </div>
            ) : (
              gateways.map((gw) => (
                <div
                  key={gw.id}
                  style={{
                    background: '#0d1322',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                        {gw.name}
                      </h4>
                      <span style={{
                        background: gw.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: gw.is_active ? '#4ade80' : '#f87171',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${gw.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {gw.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 700, marginBottom: '8px' }}>
                      Currency: {gw.currency || 'USD'}
                    </div>

                    {gw.account_details && (
                      <div style={{
                        background: '#090d16',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#cbd5e1',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        marginBottom: '10px'
                      }}>
                        {gw.account_details}
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {gw.instructions}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
                    <button
                      type="button"
                      className="btn-action"
                      style={{ color: '#38bdf8' }}
                      onClick={() => handleOpenGatewayModal(gw)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="btn-action"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDeleteGateway(gw)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT PAYMENT GATEWAY
          ========================================================================= */}
      {isGatewayModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsGatewayModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingGateway ? '✏️ Edit Payment Gateway' : '+ Add Manual Payment Gateway'}
              </h3>
              <button type="button" className="admin-modal-close" onClick={() => setIsGatewayModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveGateway}>
              <div className="admin-modal-body">
                {/* Preset Templates Selector */}
                {!editingGateway && (
                  <div style={{ marginBottom: '14px', background: '#090d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                      ⚡ Quick Presets:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-admin-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handleApplyPreset('usdt')}
                      >
                        USDT TRC20
                      </button>
                      <button
                        type="button"
                        className="btn-admin-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handleApplyPreset('bank')}
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        className="btn-admin-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handleApplyPreset('easypaisa')}
                      >
                        EasyPaisa / JazzCash
                      </button>
                    </div>
                  </div>
                )}

                <div className="admin-form-group">
                  <label className="admin-form-label">Gateway Name *</label>
                  <input
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Binance USDT (TRC20) or Chase Bank"
                    value={gatewayForm.name}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Currency</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="USD, USDT, PKR, EUR"
                      value={gatewayForm.currency}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, currency: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Status</label>
                    <select
                      className="admin-form-input"
                      value={gatewayForm.is_active}
                      onChange={(e) => setGatewayForm({ ...gatewayForm, is_active: Number(e.target.value) })}
                    >
                      <option value={1}>Active (Visible to Resellers)</option>
                      <option value={0}>Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Account Details / Address (Pre-formatted)
                  </label>
                  <textarea
                    rows="3"
                    className="admin-form-input"
                    placeholder="Enter wallet address, IBAN, bank account title & number"
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    value={gatewayForm.account_details}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, account_details: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Instructions for Reseller *</label>
                  <textarea
                    rows="3"
                    required
                    className="admin-form-input"
                    placeholder="Explain how reseller should pay, copy TXR ID, and submit screenshot receipt"
                    value={gatewayForm.instructions}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, instructions: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn-admin-secondary" onClick={() => setIsGatewayModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary">
                  {editingGateway ? 'Save Changes' : 'Create Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: APPROVE / REJECT RECHARGE
          ========================================================================= */}
      {actionModal.isOpen && actionModal.recharge && (
        <div className="admin-modal-backdrop" onClick={() => setActionModal({ ...actionModal, isOpen: false })}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {actionModal.type === 'approve' ? '✅ Approve Wallet Recharge' : '🚫 Reject Wallet Recharge'}
              </h3>
              <button type="button" className="admin-modal-close" onClick={() => setActionModal({ ...actionModal, isOpen: false })}>✕</button>
            </div>

            <div className="admin-modal-body">
              <div style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>Reseller:</span>
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13px' }}>{actionModal.recharge.reseller_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>Amount to Credit:</span>
                  <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '15px' }}>${Number(actionModal.recharge.amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>TXR ID:</span>
                  <code style={{ color: '#facc15', fontSize: '12px' }}>{actionModal.recharge.transaction_id}</code>
                </div>
              </div>

              {actionModal.type === 'approve' ? (
                <div style={{ fontSize: '13px', color: '#4ade80', marginBottom: '14px', background: 'rgba(34, 197, 94, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ⚡ Approving will immediately add <strong>${Number(actionModal.recharge.amount).toFixed(2)}</strong> to {actionModal.recharge.reseller_name}'s wallet balance.
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#f87171', marginBottom: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  ⚠️ Rejecting this request will NOT credit any balance.
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">Admin Notes (Optional feedback to reseller)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Verified and approved"
                  value={actionModal.adminNotes}
                  onChange={(e) => setActionModal({ ...actionModal, adminNotes: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn-admin-secondary"
                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                disabled={actionModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={actionModal.type === 'approve' ? 'btn-admin-primary' : 'btn-admin-danger'}
                onClick={handleSubmitAction}
                disabled={actionModal.submitting}
                style={actionModal.type === 'reject' ? { background: '#ef4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' } : {}}
              >
                {actionModal.submitting ? 'Processing...' : (actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PROOF IMAGE PREVIEW
          ========================================================================= */}
      {previewProofUrl && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewProofUrl(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '16px' }}>
            <div className="admin-modal-header" style={{ padding: '0 0 12px' }}>
              <h3 className="admin-modal-title">🖼️ Proof of Payment</h3>
              <button type="button" className="admin-modal-close" onClick={() => setPreviewProofUrl(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', background: '#090d16', borderRadius: '8px', padding: '10px', overflow: 'hidden', maxHeight: '70vh' }}>
              <img
                src={previewProofUrl}
                alt="Payment Proof"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '6px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  alert('Unable to load proof image.');
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}
              >
                ↗️ Open full image in new tab
              </a>
              <button type="button" className="btn-admin-secondary" onClick={() => setPreviewProofUrl(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPaymentGateways;
