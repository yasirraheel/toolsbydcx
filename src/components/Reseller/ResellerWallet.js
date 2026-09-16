import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function ResellerWallet({ currentUser, onOpenRecharge }) {
  const { alert: showCustomAlert } = useDialog();
  const [walletInfo, setWalletInfo] = useState({
    balance: 0.00,
    per_user_cost: 0.00,
    custom_domain: ''
  });
  const [recharges, setRecharges] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Recharge Form State
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/reseller/wallet`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.success) {
        if (data.wallet) setWalletInfo(data.wallet);
        if (data.recharges) setRecharges(data.recharges);
        if (data.transactions) setTransactions(data.transactions);
      }
    } catch (e) {
      console.error('Error fetching reseller wallet:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGateways = async () => {
    try {
      const res = await fetch(`${API_BASE}/payment-gateways`);
      const data = await res.json();
      if (data.success && Array.isArray(data.gateways)) {
        setGateways(data.gateways);
        if (data.gateways.length > 0 && !selectedGatewayId) {
          setSelectedGatewayId(data.gateways[0].id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch active gateways:', e);
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchGateways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleFileChange = (file) => {
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRecharge = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      await showCustomAlert({ title: 'Invalid Amount', message: 'Please enter a valid deposit amount.', type: 'warning' });
      return;
    }
    if (!transactionId.trim()) {
      await showCustomAlert({ title: 'Transaction ID Required', message: 'Please enter the transaction reference (TXR ID) from your payment receipt.', type: 'warning' });
      return;
    }

    try {
      setSubmitting(true);
      let uploadedProofUrl = '';

      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('type', 'proof');

        const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token');
        const upRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });
        const upData = await upRes.json();
        if (upRes.ok && upData.url) {
          uploadedProofUrl = upData.url;
        } else if (proofPreview) {
          uploadedProofUrl = proofPreview;
        }
      }

      const payload = {
        gateway_id: selectedGatewayId,
        amount: parseFloat(amount),
        transaction_id: transactionId.trim(),
        proof_image: uploadedProofUrl,
        notes: notes.trim()
      };

      const res = await authFetch(`${API_BASE}/reseller/recharge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: '🎉 Recharge request submitted! Admin will verify and credit your balance.'
        });
        setIsRechargeModalOpen(false);
        setAmount('');
        setTransactionId('');
        setProofFile(null);
        setProofPreview('');
        setNotes('');
        fetchWalletData();
        setTimeout(() => setActionFeedback(null), 6000);
      } else {
        await showCustomAlert({
          title: 'Submission Failed',
          message: data.error || 'Failed to submit recharge request.',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({ title: 'Network Error', message: 'Failed to communicate with server.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeGw = gateways.find(g => g.id === selectedGatewayId) || gateways[0];
  const possibleAccounts = walletInfo.per_user_cost > 0 
    ? Math.floor(walletInfo.balance / walletInfo.per_user_cost) 
    : 'Unlimited';

  // Helper to extract clean crypto address or bank details
  const getGatewayIcon = (name = '', currency = '') => {
    const lower = (name + ' ' + currency).toLowerCase();
    if (lower.includes('usdt') || lower.includes('tether') || lower.includes('trc') || lower.includes('binance')) return '₮';
    if (lower.includes('bank') || lower.includes('transfer') || lower.includes('wire') || lower.includes('chase')) return '🏦';
    if (lower.includes('easypaisa') || lower.includes('jazzcash') || lower.includes('mobile')) return '📱';
    if (lower.includes('paypal') || lower.includes('wise')) return '💳';
    return '⚡';
  };

  return (
    <div className="admin-content-card">
      {/* HEADER */}
      <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="admin-card-title">💰 Reseller Wallet & Balance</h2>
          <p className="admin-card-subtitle">
            Manage your account funds, deposit via verified manual gateways, and track ledger history
          </p>
        </div>

        <button
          type="button"
          className="btn-admin-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            fontSize: '15px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.35)'
          }}
          onClick={() => setIsRechargeModalOpen(true)}
        >
          <span>⚡</span>
          <span>Deposit / Recharge</span>
        </button>
      </div>

      {actionFeedback && (
        <div style={{
          padding: '14px 20px',
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

      {/* STATS CARDS */}
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(9, 13, 22, 0.9))',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Balance
            </span>
            <span style={{ fontSize: '18px' }}>💳</span>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#4ade80', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            ${Number(walletInfo.balance || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Current funds available to create customer accounts
          </div>
        </div>

        {/* Per-User Cost Card */}
        <div style={{
          background: '#0d1322',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '22px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Account Creation Cost
            </span>
            <span style={{ fontSize: '18px' }}>🏷️</span>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#f59e0b', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            ${Number(walletInfo.per_user_cost || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Wholesale rate set by admin. Automatically deducted on user creation.
          </div>
        </div>

        {/* Capacity Card */}
        <div style={{
          background: '#0d1322',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '22px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Creation Capacity
            </span>
            <span style={{ fontSize: '18px' }}>👥</span>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#38bdf8', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            {possibleAccounts} <span style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>accounts</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {walletInfo.balance < walletInfo.per_user_cost && walletInfo.per_user_cost > 0
              ? '⚠️ Balance below per-user cost. Recharge to create next customer.' 
              : 'You have sufficient funds to create customer accounts.'}
          </div>
        </div>
      </div>

      {/* RECHARGE HISTORY & TRANSACTIONS */}
      <div style={{ padding: '0 20px 20px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
          📑 Deposit Requests History
        </h3>

        <div className="admin-table-wrapper" style={{ marginBottom: '28px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Transaction Reference (TXR ID)</th>
                <th>Receipt Proof</th>
                <th>Status</th>
                <th>Admin Note / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Loading history...
                  </td>
                </tr>
              ) : recharges.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No deposit requests yet. Click "Deposit / Recharge" to add funds.
                  </td>
                </tr>
              ) : (
                recharges.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>{r.gateway_name || 'Manual Gateway'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80' }}>
                        ${Number(r.amount).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
                        {r.currency || 'USD'}
                      </span>
                    </td>
                    <td>
                      <code style={{ background: '#1e293b', padding: '3px 7px', borderRadius: '5px', color: '#facc15', fontSize: '12px' }}>
                        {r.transaction_id}
                      </code>
                    </td>
                    <td>
                      {r.proof_image ? (
                        <button
                          type="button"
                          className="btn-action"
                          style={{ color: '#38bdf8' }}
                          onClick={() => setPreviewProofUrl(r.proof_image)}
                        >
                          🖼️ View Receipt
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>None</span>
                      )}
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <span className="badge-pill badge-pending">🟡 Pending Verification</span>
                      )}
                      {r.status === 'approved' && (
                        <span className="badge-pill badge-green">✅ Approved & Credited</span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="badge-pill badge-failed">🚫 Rejected</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: '#94a3b8' }}>
                      {r.admin_notes ? (
                        <span style={{ color: r.status === 'approved' ? '#4ade80' : '#f87171' }}>
                          {r.admin_notes}
                        </span>
                      ) : (
                        <span>{r.notes || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TRANSACTIONS LEDGER */}
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
          📊 Wallet Deductions & Credits Ledger
        </h3>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance Before</th>
                <th>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No wallet deductions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td>
                      {t.type === 'recharge' && (
                        <span className="badge-pill badge-green">💰 Deposit Credit</span>
                      )}
                      {t.type === 'user_creation' && (
                        <span className="badge-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          👤 Customer Creation
                        </span>
                      )}
                      {t.type !== 'recharge' && t.type !== 'user_creation' && (
                        <span className="badge-pill badge-pending">{t.type}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: '#cbd5e1' }}>
                      {t.description || '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: t.type === 'recharge' ? '#4ade80' : '#f87171'
                      }}>
                        {t.type === 'recharge' ? `+` : `-`}${Number(t.amount).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#94a3b8' }}>
                      ${Number(t.balance_before).toFixed(2)}
                    </td>
                    <td style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                      ${Number(t.balance_after).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          HIGH-END FINTECH MODAL: RECHARGE WALLET
          ========================================================================= */}
      {isRechargeModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsRechargeModalOpen(false)}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              maxHeight: 'min(90vh, 760px)',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              boxShadow: '0 25px 70px rgba(0,0,0,0.85), 0 0 35px rgba(34, 197, 94, 0.2)',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#0d1322'
            }}
          >
            {/* MODAL HEADER */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #1e293b',
              background: 'linear-gradient(180deg, #131b2e 0%, #0d1322 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#22c55e',
                  boxShadow: '0 0 16px rgba(34, 197, 94, 0.25)'
                }}>
                  ⚡
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                    Recharge Reseller Wallet
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Current Balance: <span style={{ color: '#4ade80', fontWeight: 700 }}>${Number(walletInfo.balance).toFixed(2)}</span> • Wholesale Cost: <span style={{ color: '#f59e0b', fontWeight: 700 }}>${Number(walletInfo.per_user_cost).toFixed(2)}/user</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsRechargeModalOpen(false)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmitRecharge}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                className="admin-modal-body"
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '20px 24px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(34, 197, 94, 0.4) #090d16'
                }}
              >
                {gateways.length === 0 ? (
                  <div style={{ color: '#f87171', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    No manual payment methods are configured by the admin yet. Please contact support.
                  </div>
                ) : (
                  <>
                    {/* 1. SELECT PAYMENT METHOD (MODERN CARDS) */}
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
                        1. Select Deposit Method
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                        {gateways.map((g) => {
                          const isSelected = g.id === selectedGatewayId;
                          return (
                            <div
                              key={g.id}
                              onClick={() => setSelectedGatewayId(g.id)}
                              style={{
                                background: isSelected ? 'rgba(34, 197, 94, 0.12)' : '#090d16',
                                border: `1.5px solid ${isSelected ? '#22c55e' : '#1e293b'}`,
                                borderRadius: '12px',
                                padding: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 0 16px rgba(34, 197, 94, 0.2)' : 'none'
                              }}
                            >
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(34, 197, 94, 0.25)' : '#1e293b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                color: isSelected ? '#22c55e' : '#94a3b8',
                                flexShrink: 0
                              }}>
                                {getGatewayIcon(g.name, g.currency)}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#f8fafc' : '#cbd5e1', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  {g.name}
                                </div>
                                <div style={{ fontSize: '11px', color: isSelected ? '#4ade80' : '#64748b', fontWeight: 600 }}>
                                  {g.currency || 'USD'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. OFFICIAL ACCOUNT / WALLET DETAILS BOX */}
                    {activeGw && (
                      <div style={{
                        background: 'linear-gradient(180deg, #090e1a 0%, #060a12 100%)',
                        border: '1px solid #1e293b',
                        borderRadius: '14px',
                        padding: '16px 18px',
                        marginBottom: '18px',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            💳 {activeGw.name} Details
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: '6px' }}>
                            Currency: {activeGw.currency || 'USD'}
                          </span>
                        </div>

                        {activeGw.account_details && (
                          <div style={{
                            background: '#0d1526',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              fontFamily: 'monospace',
                              fontSize: '13px',
                              color: '#4ade80',
                              wordBreak: 'break-all',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.4
                            }}>
                              {activeGw.account_details}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(activeGw.account_details, 'gw-details')}
                              style={{
                                background: copiedKey === 'gw-details' ? '#22c55e' : '#1e293b',
                                color: copiedKey === 'gw-details' ? '#000' : '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'all 0.15s'
                              }}
                            >
                              {copiedKey === 'gw-details' ? '✓ Copied!' : '📋 Copy'}
                            </button>
                          </div>
                        )}

                        {activeGw.instructions && (
                          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                            {activeGw.instructions}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. DEPOSIT AMOUNT & QUICK PRESETS */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="admin-form-label" style={{ fontSize: '13px' }}>
                          Deposit Amount ({activeGw?.currency || 'USD'}) *
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[25, 50, 100, 200, 500].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAmount(String(val))}
                              style={{
                                background: amount === String(val) ? 'rgba(34, 197, 94, 0.25)' : '#1e293b',
                                color: amount === String(val) ? '#4ade80' : '#94a3b8',
                                border: `1px solid ${amount === String(val) ? '#22c55e' : '#334155'}`,
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              +${val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRight: 'none',
                          padding: '13px 16px',
                          borderTopLeftRadius: '10px',
                          borderBottomLeftRadius: '10px',
                          color: '#22c55e',
                          fontWeight: 800,
                          fontSize: '16px'
                        }}>
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          className="admin-form-input"
                          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontWeight: 700, fontSize: '17px' }}
                          placeholder="e.g. 50.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 4. TRANSACTION ID (TXR ID) */}
                    <div className="admin-form-group">
                      <label className="admin-form-label" style={{ fontSize: '13px' }}>
                        Transaction Reference / Hash (TXR ID) *
                      </label>
                      <input
                        type="text"
                        required
                        className="admin-form-input"
                        style={{ fontFamily: 'monospace', fontSize: '14px', color: '#facc15' }}
                        placeholder="Paste transaction ID or bank transfer reference"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>

                    {/* 5. DRAG AND DROP RECEIPT PROOF UPLOAD */}
                    <div className="admin-form-group">
                      <label className="admin-form-label" style={{ fontSize: '13px' }}>
                        Proof of Payment (Screenshot / Receipt)
                      </label>

                      {!proofPreview ? (
                        <div
                          className={`admin-dropzone ${isDragging ? 'dragging' : ''}`}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleFileChange(e.dataTransfer.files[0]);
                            }
                          }}
                          onClick={() => document.getElementById('reseller-receipt-input').click()}
                          style={{ padding: '20px 16px', borderRadius: '12px' }}
                        >
                          <input
                            id="reseller-receipt-input"
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChange(e.target.files[0])}
                          />
                          <div className="admin-dropzone-icon" style={{ width: '40px', height: '40px', fontSize: '18px' }}>
                            📤
                          </div>
                          <div className="admin-dropzone-title" style={{ fontSize: '13px' }}>
                            Click to browse or drop payment screenshot
                          </div>
                          <div className="admin-dropzone-subtitle" style={{ fontSize: '11px' }}>
                            PNG, JPG, WEBP, or PDF receipt (Max 10MB)
                          </div>
                        </div>
                      ) : (
                        <div className="admin-file-card" style={{ padding: '10px 14px' }}>
                          <div className="admin-file-card-info">
                            {proofPreview.startsWith('data:image') ? (
                              <img
                                src={proofPreview}
                                alt="Receipt Thumbnail"
                                style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }}
                              />
                            ) : (
                              <div className="admin-file-card-icon">📄</div>
                            )}
                            <div>
                              <div className="admin-file-card-name" style={{ maxWidth: '280px', fontSize: '13px' }}>
                                {proofFile?.name || 'Payment Receipt'}
                              </div>
                              <div className="admin-file-card-size">
                                {proofFile ? `${(proofFile.size / 1024).toFixed(1)} KB` : 'Ready to upload'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProofFile(null);
                              setProofPreview('');
                            }}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 6. ADDITIONAL NOTES */}
                    <div className="admin-form-group">
                      <label className="admin-form-label" style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Sender Notes / Payer Account Title (Optional)
                      </label>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="e.g. Sent from John Doe's Binance / Chase account"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* PINNED MODAL FOOTER */}
              <div 
                className="admin-modal-footer" 
                style={{ 
                  flexShrink: 0, 
                  padding: '16px 24px', 
                  background: '#090d16', 
                  borderTop: '1px solid #1e293b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end', 
                  gap: '12px' 
                }}
              >
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setIsRechargeModalOpen(false)}
                  disabled={submitting}
                  style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={submitting || gateways.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
                    padding: '11px 26px',
                    fontSize: '15px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Submitting Deposit...' : `⚡ Submit Deposit ($${Number(amount || 0).toFixed(2)}) →`}
                </button>
              </div>
            </form>
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

export default ResellerWallet;
