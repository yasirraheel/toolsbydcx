import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function ResellerSettings({ currentUser, onUpdateBrand }) {
  const { alert: showCustomAlert } = useDialog();
  const [settings, setSettings] = useState({
    custom_domain: '',
    brand_name: '',
    brand_logo: '',
    brand_color: '#22c55e',
    support_contact: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/reseller/settings`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (handleAuthError(res, data)) return;
      if (data.success && data.settings) {
        setSettings({
          custom_domain: data.settings.custom_domain || '',
          brand_name: data.settings.brand_name || '',
          brand_logo: data.settings.brand_logo || '',
          brand_color: data.settings.brand_color || '#22c55e',
          support_contact: data.settings.support_contact || ''
        });
        if (data.settings.brand_logo) {
          setLogoPreview(data.settings.brand_logo);
        }
      }
    } catch (e) {
      console.error('Error fetching reseller settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let finalLogoUrl = settings.brand_logo;

      // If a new logo file was selected, upload it
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('type', 'logo');

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
          finalLogoUrl = upData.url;
        } else if (logoPreview) {
          finalLogoUrl = logoPreview;
        }
      }

      const payload = {
        custom_domain: settings.custom_domain.trim(),
        brand_name: settings.brand_name.trim(),
        brand_logo: finalLogoUrl,
        brand_color: settings.brand_color,
        support_contact: settings.support_contact.trim()
      };

      const res = await authFetch(`${API_BASE}/reseller/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: 'Branding and domain settings saved successfully!'
        });
        if (onUpdateBrand) {
          onUpdateBrand({
            brand_name: payload.brand_name,
            brand_logo: payload.brand_logo,
            brand_color: payload.brand_color,
            custom_domain: payload.custom_domain
          });
        }
        setTimeout(() => setActionFeedback(null), 5000);
      } else {
        await showCustomAlert({
          title: 'Save Failed',
          message: data.error || 'Failed to update settings.',
          type: 'danger'
        });
      }
    } catch (err) {
      await showCustomAlert({ title: 'Network Error', message: 'Failed to communicate with server.', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-content-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">⚙️ Branding & User Creation Domain</h2>
          <p className="admin-card-subtitle">
            Configure your custom brand identity and email domain for creating customer accounts
          </p>
        </div>
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

      <div style={{ padding: '24px', maxWidth: '680px' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', padding: '20px' }}>Loading settings...</div>
        ) : (
          <form onSubmit={handleSaveSettings}>
            {/* DOMAIN SECTION */}
            <div style={{
              background: '#0d1322',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌐</span> Domain for User Account Creation
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.4 }}>
                Enter your agency domain name (e.g. <code>myagencytools.com</code>). When you create new customer accounts, their email address will be automatically formatted as <code>username@{settings.custom_domain || 'yourdomain.com'}</code> instead of <code>toolsbydcx.com</code>.
              </p>

              <div className="admin-form-group">
                <label className="admin-form-label">Custom Creation Domain</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRight: 'none',
                    padding: '10px 14px',
                    borderTopLeftRadius: '8px',
                    borderBottomLeftRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    fontWeight: 700
                  }}>
                    @
                  </div>
                  <input
                    type="text"
                    className="admin-form-input"
                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    placeholder="e.g. saqibagency.com"
                    value={settings.custom_domain}
                    onChange={(e) => {
                      let val = e.target.value.toLowerCase().trim();
                      val = val.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').replace(/^@/, '');
                      setSettings({ ...settings, custom_domain: val });
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Customer email preview:{' '}
                  <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>
                    client@{settings.custom_domain || 'toolsbydcx.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* BRANDING SECTION */}
            <div style={{
              background: '#0d1322',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: '0 0 16px' }}>
                🎨 Agency Branding & Portal Identity
              </h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Brand / Agency Name</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Saqib Digital Agency"
                  value={settings.brand_name}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Agency Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Brand Logo"
                      style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #334155' }}
                    />
                  ) : (
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px'
                    }}>
                      ⚡
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      className="admin-form-input"
                      onChange={handleLogoFileChange}
                      style={{ padding: '8px' }}
                    />
                  </div>
                </div>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Or paste direct image URL (https://...)"
                  value={settings.brand_logo}
                  onChange={(e) => {
                    setSettings({ ...settings, brand_logo: e.target.value });
                    setLogoPreview(e.target.value);
                  }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Brand Accent Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={settings.brand_color || '#22c55e'}
                    onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                    style={{ width: '44px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    className="admin-form-input"
                    style={{ maxWidth: '140px', fontFamily: 'monospace' }}
                    value={settings.brand_color}
                    onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['#22c55e', '#38bdf8', '#a855f7', '#f59e0b', '#ec4899'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSettings({ ...settings, brand_color: c })}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c,
                          border: settings.brand_color === c ? '2px solid #fff' : 'none',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Support Contact (WhatsApp, Telegram, or Email)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. WhatsApp: +923001234567 or support@saqibagency.com"
                  value={settings.support_contact}
                  onChange={(e) => setSettings({ ...settings, support_contact: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-admin-primary"
              disabled={saving}
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            >
              {saving ? 'Saving Settings...' : 'Save Branding & Domain Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResellerSettings;
