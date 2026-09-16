import React, { useState, useEffect, useRef } from 'react';
import { useDialog } from '../../context/DialogContext';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function ResellerSettings({ currentUser, onUpdateBrand }) {
  const { alert: showCustomAlert } = useDialog();
  const fileInputRef = useRef(null);

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
  const [isDragging, setIsDragging] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
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
    const file = e.target.files && e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setSettings(prev => ({ ...prev, brand_logo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate shareable client portal URL
  const clientIdentifier = settings.custom_domain || currentUser?.custom_domain || currentUser?.id || '';
  const portalUrl = clientIdentifier 
    ? `${window.location.origin}/?reseller=${encodeURIComponent(clientIdentifier)}`
    : `${window.location.origin}/`;

  const handleCopyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenLivePortal = () => {
    if (!portalUrl) return;
    window.open(portalUrl, '_blank');
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
        } else if (logoPreview && !logoPreview.startsWith('data:')) {
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
          <h2 className="admin-card-title">⚙️ Branding & Client Portal</h2>
          <p className="admin-card-subtitle">
            Configure your custom agency branding, client landing link, and email creation domain
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

      <div style={{ padding: '24px', maxWidth: '720px' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', padding: '20px' }}>Loading settings...</div>
        ) : (
          <div>
            {/* =========================================================================
                SHAREABLE BRANDED CLIENT PORTAL / LANDING PAGE CARD
                ========================================================================= */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(15, 23, 42, 0.95))',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '28px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-30px',
                right: '-30px',
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none'
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#38bdf8'
                  }}>
                    🔗
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                      Your Shareable Client Landing Page
                    </h3>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Official branded portal link for your customers & clients
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid #22c55e',
                  color: '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  Live & Shareable
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 16px' }}>
                Share this direct URL with your clients. When opened, it showcases your agency name (<strong>{settings.brand_name || currentUser?.name || 'Your Agency'}</strong>), your custom logo, your retail pricing plans, and your direct contact channel.
              </p>

              {/* URL INPUT & ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <input
                    type="text"
                    readOnly
                    value={portalUrl}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: '#090d16',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#38bdf8',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onClick={(e) => e.target.select()}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopyPortalLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: copiedLink ? '#22c55e' : '#1e293b',
                    color: copiedLink ? '#000' : '#f8fafc',
                    border: `1px solid ${copiedLink ? '#22c55e' : 'rgba(56, 189, 248, 0.4)'}`,
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{copiedLink ? '✓' : '📋'}</span>
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenLivePortal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>↗️</span>
                  <span>Preview Portal</span>
                </button>
              </div>

              {/* HIGHLIGHT PILLS */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  🎨 Agency Logo & Accent Colors
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  🏷️ Your Custom Retail Plans
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  💬 Direct WhatsApp & Support Channel
                </span>
              </div>
            </div>

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

                {/* HIGH-END LOGO FILE UPLOAD COMPONENT */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Agency Logo</label>

                  {/* Hidden native file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    style={{ display: 'none' }}
                  />

                  {logoPreview ? (
                    /* Active Logo Preview Card */
                    <div style={{
                      background: '#090d16',
                      border: `1px solid ${settings.brand_color ? settings.brand_color + '66' : 'rgba(34, 197, 94, 0.4)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={logoPreview.startsWith('http') || logoPreview.startsWith('data:') ? logoPreview : `${API_BASE.replace(/\/api$/, '')}${logoPreview}`}
                          alt="Agency Logo"
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'contain',
                            borderRadius: '12px',
                            background: '#131926',
                            border: `1px solid ${settings.brand_color || '#334155'}`,
                            padding: '4px'
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            {logoFile ? logoFile.name : 'Current Brand Logo'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span>✓</span> Logo Ready
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#38bdf8',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          📁 Change Logo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Sleek Upload Dropzone */
                    <div
                      className={`admin-dropzone ${isDragging ? 'dragging' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      style={{ padding: '28px 20px', cursor: 'pointer' }}
                    >
                      <div className="admin-dropzone-icon" style={{ width: '48px', height: '48px', fontSize: '22px' }}>
                        🖼️
                      </div>
                      <div className="admin-dropzone-title" style={{ fontSize: '14px' }}>
                        Click to upload or drag and drop agency logo
                      </div>
                      <div className="admin-dropzone-subtitle" style={{ fontSize: '12px' }}>
                        PNG, JPG, WEBP or SVG (Recommended: 256x256 square logo)
                      </div>
                    </div>
                  )}

                  {/* Optional Direct URL Fallback */}
                  <div style={{ marginTop: '10px' }}>
                    {!showUrlFallback ? (
                      <button
                        type="button"
                        onClick={() => setShowUrlFallback(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        🔗 Or paste a direct image URL
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <input
                          type="text"
                          className="admin-form-input"
                          style={{ fontSize: '13px' }}
                          placeholder="https://example.com/my-logo.png"
                          value={settings.brand_logo}
                          onChange={(e) => {
                            setSettings({ ...settings, brand_logo: e.target.value });
                            setLogoPreview(e.target.value);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowUrlFallback(false)}
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#94a3b8',
                            borderRadius: '8px',
                            padding: '0 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Close
                        </button>
                      </div>
                    )}
                  </div>
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
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    This contact button is displayed directly on your branded landing page for client inquiries.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-admin-primary"
                disabled={saving}
                style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700 }}
              >
                {saving ? 'Saving Settings...' : 'Save Branding & Domain Settings'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResellerSettings;
