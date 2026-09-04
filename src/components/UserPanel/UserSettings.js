import React, { useState } from 'react';
import { useDialog } from '../../context/DialogContext';

function UserSettings({ currentUser, onProfileUpdated }) {
  const { alert: showCustomAlert } = useDialog();
  const [name, setName] = useState(currentUser?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      await showCustomAlert({
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.',
        type: 'danger'
      });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          currentPassword,
          newPassword: newPassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Profile updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data.user && onProfileUpdated) {
          onProfileUpdated(data.user);
        }
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.message || 'Could not update profile.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Failed to connect to server.',
        type: 'danger'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-accounts-view" style={{ width: '100%', maxWidth: '100%' }}>
      {feedback && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '15px',
            fontWeight: 600,
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
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="admin-card" style={{ width: '100%' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>👤</span> My Account Profile
          </h3>
        </div>

        <form onSubmit={handleSave} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div className="admin-form-group">
            <label className="admin-form-label">Email Address</label>
            <input
              type="text"
              disabled
              className="admin-form-input"
              value={currentUser?.email || ''}
              style={{ opacity: 0.6, cursor: 'not-allowed', width: '100%' }}
            />
            <span style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'block' }}>
              Your email is managed by your account administrator or reseller.
            </span>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Full Name</label>
            <input
              type="text"
              required
              className="admin-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
              Change Password (Optional)
            </h4>

            <div className="admin-form-group">
              <label className="admin-form-label">Current Password</label>
              <input
                type="password"
                className="admin-form-input"
                placeholder="Enter current password if changing"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">New Password</label>
                <input
                  type="password"
                  className="admin-form-input"
                  placeholder="Leave blank to keep current"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="admin-form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
            <button
              type="submit"
              className="btn-admin-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserSettings;
