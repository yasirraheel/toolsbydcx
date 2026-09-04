import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';

function UserSessions() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/user/sessions`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.warn('Sessions fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeSession = async (session) => {
    const confirmed = await confirm({
      title: 'Revoke Device Session?',
      message: `Are you sure you want to disconnect device session "${session.device_name || session.id}"? This device will be signed out immediately.`,
      confirmText: 'Revoke Session',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/user/sessions/${session.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Device session revoked successfully.' });
        fetchSessions();
      } else {
        await showCustomAlert({
          title: 'Action Failed',
          message: 'Could not disconnect session.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Could not connect to server.',
        type: 'danger'
      });
    }
  };

  return (
    <div className="admin-accounts-view">
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#4ade80' : '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>💻</span> Connected Devices & Extension Sessions ({sessions.length})
          </h3>
          <button
            type="button"
            className="btn-admin-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
            onClick={fetchSessions}
          >
            🔄 Refresh
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Device / Browser</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Loading active sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((sess, idx) => (
                  <tr key={sess.id || idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>
                        {sess.device_name || (idx === 0 ? 'Current Browser Session' : 'Authorized Device')}
                        {idx === 0 && (
                          <span className="badge-pill badge-green" style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 10px' }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px' }}>
                        {sess.user_agent || 'Chrome Extension Bridge'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8' }}>
                        {sess.ip_address || '127.0.0.1'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-pill badge-green">Online</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {sess.last_active ? new Date(sess.last_active).toLocaleString() : 'Active now'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {idx !== 0 && (
                        <button
                          type="button"
                          className="btn-action btn-action-danger"
                          onClick={() => handleRevokeSession(sess)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserSessions;
