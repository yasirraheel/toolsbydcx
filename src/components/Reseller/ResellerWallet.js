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

  // Recharge Form State
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
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
      await showCustomAlert({ title: 'Invalid Amount', message: 'Please enter a valid recharge amount.', type: 'warning' });
      return;
    }
    if (!transactionId.trim()) {
      await showCustomAlert({ title: 'Transaction ID Required', message: 'Please enter the transaction ID (TXR ID) from your payment receipt.', type: 'warning' });
      return;
    }

    try {
      setSubmitting(true);
      let uploadedProofUrl = '';

      // Upload proof file if provided
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

  const activeGw = gateways.find(g => g.id === selectedGatewayId);
  const possibleAccounts = walletInfo.per_user_cost > 0 
    ? Math.floor(walletInfo.balance / walletInfo.per_user_cost) 
    : 'Unlimited';

  return (
    <div className="admin-content-card">
      {/* HEADER */}
      <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="admin-card-title">💰 My Wallet & Balance</h2>
          <p className="admin-card-subtitle">
            Manage your reseller balance, recharge via manual gateways, and review transactions
          </p>
        </div>

        <button
          type="button"
          className="btn-admin-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '15px' }}
          onClick={() => setIsRechargeModalOpen(true)}
        >
          <span>⚡</span>
          <span>Recharge Wallet</span>
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
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(9, 13, 22, 0.8))',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '14px',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Wallet Balance
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#4ade80', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            ${Number(walletInfo.balance || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Available funds for creating customer accounts
          </div>
        </div>

        {/* Per-User Cost Card */}
        <div style={{
          background: '#0d1322',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Wholesale Cost Per Account
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            ${Number(walletInfo.per_user_cost || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Set by Admin. Automatically deducted when you create a customer.
          </div>
        </div>

        {/* Possible Accounts Card */}
        <div style={{
          background: '#0d1322',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Capacity Available
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#38bdf8', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            {possibleAccounts} <span style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>accounts</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {walletInfo.balance < walletInfo.per_user_cost 
              ? '⚠️ Recharge required to create your next customer.' 
              : 'You have sufficient funds to create customer accounts.'}
          </div>
        </div>
      </div>

      {/* RECHARGE HISTORY & TRANSACTIONS */}
      <div style={{ padding: '0 20px 20px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
          📑 Recharge Requests History
        </h3>

        <div className="admin-table-wrapper" style={{ marginBottom: '28px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Gateway</th>
                <th>Amount</th>
                <th>Transaction ID (TXR ID)</th>
                <th>Proof of Payment</th>
                <th>Status</th>
                <th>Notes / Feedback</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Loading recharge history...
                  </td>
                </tr>
              ) : recharges.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No recharge requests found. Click "Recharge Wallet" to add funds.
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
                        <span className="badge-pill badge-pending">🟡 Pending Admin Review</span>
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
                    No wallet transactions recorded yet.
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
                        <span className="badge-pill badge-green">💰 Wallet Recharge</span>
                      )}
                      {t.type === 'user_creation' && (
                        <span className="badge-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          👤 Account Creation
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
          MODAL: RECHARGE WALLET
          ========================================================================= */}
      {isRechargeModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsRechargeModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">⚡ Recharge Reseller Wallet</h3>
              <button type="button" className="admin-modal-close" onClick={() => setIsRechargeModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitRecharge}>
              <div className="admin-modal-body">
                {gateways.length === 0 ? (
                  <div style={{ color: '#f87171', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    No payment gateways are currently configured. Please contact the platform administrator to add manual gateways.
                  </div>
                ) : (
                  <>
                    <div className="admin-form-group">
                      <label className="admin-form-label">Select Payment Method</label>
                      <select
                        className="admin-form-input"
                        value={selectedGatewayId}
                        onChange={(e) => setSelectedGatewayId(e.target.value)}
                      >
                        {gateways.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.currency || 'USD'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* GATEWAY PAYMENT INSTRUCTIONS BOX */}
                    {activeGw && (
                      <div style={{
                        background: '#090d16',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '14px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                          📋 PAYMENT INSTRUCTIONS ({activeGw.name}):
                        </div>

                        {activeGw.account_details && (
                          <div style={{
                            background: '#1e293b',
                            padding: '10px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            color: '#4ade80',
                            whiteSpace: 'pre-wrap',
                            marginBottom: '8px',
                            userSelect: 'all'
                          }}>
                            {activeGw.account_details}
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                          {activeGw.instructions}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="admin-form-group">
                        <label className="admin-form-label">Amount (${activeGw?.currency || 'USD'}) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          className="admin-form-input"
                          placeholder="e.g. 50.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-form-label">Transaction ID (TXR ID) *</label>
                        <input
                          type="text"
                          required
                          className="admin-form-input"
                          placeholder="e.g. 847291048201 or hash"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        Upload Proof of Payment (Screenshot / Receipt)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="admin-form-input"
                        onChange={handleFileChange}
                        style={{ padding: '8px' }}
                      />
                      {proofPreview && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                          <img
                            src={proofPreview}
                            alt="Receipt Preview"
                            style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid #334155' }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">Additional Notes (Optional)</label>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="Sender name, account title, or notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setIsRechargeModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={submitting || gateways.length === 0}
                >
                  {submitting ? 'Submitting...' : 'Submit Recharge Request'}
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
