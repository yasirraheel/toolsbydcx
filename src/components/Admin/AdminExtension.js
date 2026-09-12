import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, handleAuthError, authFetch } from '../../apiConfig';

function AdminExtension() {
  const [loading, setLoading] = useState(true);
  const [currentRelease, setCurrentRelease] = useState(null);
  const [releasesHistory, setReleasesHistory] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload modal form state
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [nextSuggestedVersion, setNextSuggestedVersion] = useState('1.0.1');
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [newMinVersion, setNewMinVersion] = useState('');
  const [newForceUpdate, setNewForceUpdate] = useState(false);
  const [newReleaseNotes, setNewReleaseNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getNextSemver = (latestVer) => {
    if (!latestVer) return '1.0.0';
    const clean = String(latestVer).replace(/^[vV]/, '').trim();
    const parts = clean.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2], 10);
      if (!isNaN(patch)) {
        parts[2] = String(patch + 1);
        return parts.slice(0, 3).join('.');
      }
    } else if (parts.length === 2) {
      const minor = parseInt(parts[1], 10);
      if (!isNaN(minor)) {
        return `${parts[0]}.${minor + 1}.0`;
      }
    } else if (parts.length === 1) {
      const major = parseInt(parts[0], 10);
      if (!isNaN(major)) {
        return `${major + 1}.0.0`;
      }
    }
    return `${clean}.1`;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
    }
  };

  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);



  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    return headers;
  };

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg({ type: '', text: '' });
    }, 5000);
  };

  const fetchExtensionData = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/admin/extension`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (handleAuthError(res, data)) {
        return;
      }
      if (data.success) {
        setCurrentRelease(data.current);
        setReleasesHistory(data.releases || []);
        const nextVer = data.next_version || getNextSemver(data.current?.version || (data.releases && data.releases[0]?.version));
        setNextSuggestedVersion(nextVer);
      } else {
        showFeedback('error', data.error || 'Failed to load extension information.');
      }
    } catch (err) {
      console.error('Error fetching extension info:', err);
      showFeedback('error', 'Network error while fetching extension info.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadModal = () => {
    const autoVer = nextSuggestedVersion || getNextSemver(currentRelease?.version);
    setNewVersion(autoVer);
    setIsEditingVersion(false);
    setNewMinVersion('');
    setNewForceUpdate(false);
    setNewReleaseNotes('');
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploadModalOpen(true);
  };

  useEffect(() => {
    fetchExtensionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleForceUpdate = async (release) => {
    if (!release) return;
    const nextState = !release.force_update;
    try {
      const res = await fetch(`${API_BASE}/admin/extension/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          id: release.id,
          force_update: nextState
        })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('success', `Force update rule updated: ${nextState ? 'Mandatory (Force ON)' : 'Optional (Force OFF)'}`);
        fetchExtensionData();
      } else {
        showFeedback('error', data.error || 'Failed to update rule.');
      }
    } catch (err) {
      showFeedback('error', 'Network error while updating rule.');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showFeedback('error', 'Please select an extension file (.zip or .crx) to upload.');
      return;
    }
    if (!newVersion.trim()) {
      showFeedback('error', 'Please specify a version number (e.g., 1.0.1).');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(25);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('version', newVersion.trim());
      formData.append('min_version', newMinVersion.trim() || newVersion.trim());
      formData.append('force_update', newForceUpdate ? '1' : '0');
      formData.append('release_notes', newReleaseNotes.trim());

      setUploadProgress(60);

      const res = await fetch(`${API_BASE}/admin/extension/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      setUploadProgress(95);
      const data = await res.json();

      if (data.success) {
        showFeedback('success', data.message || 'Extension uploaded and deployed successfully!');
        setUploadFile(null);
        setNewVersion('');
        setNewMinVersion('');
        setNewForceUpdate(false);
        setNewReleaseNotes('');
        setIsUploadModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchExtensionData();
      } else {
        showFeedback('error', data.error || 'Failed to upload extension file.');
      }
    } catch (err) {
      showFeedback('error', 'Network error during extension upload.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (releaseId) => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
    const url = `${API_BASE}/extension/download${releaseId ? `?id=${releaseId}&token=${encodeURIComponent(token)}` : `?token=${encodeURIComponent(token)}`}`;
    window.open(url, '_blank');
  };

  return (
    <div className="admin-content-inner">
      {/* ACTION FEEDBACK ALERT */}
      {feedbackMsg.text && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            background: feedbackMsg.type === 'success' ? '#064e3b' : '#7f1d1d',
            border: feedbackMsg.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
            color: '#f9fafb',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{feedbackMsg.type === 'success' ? '✅ ' : '⚠️ '}{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg({ type: '', text: '' })}
            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* METRIC ROW (Matches AdminAccounts and AdminDashboard styles) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#131926', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Active Live Version
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#f8fafc', marginTop: '8px' }}>
            v{currentRelease?.version || '1.0.0'}
          </div>
          <div style={{ fontSize: '13px', color: '#22c55e', marginTop: '6px', fontWeight: 600 }}>
            Min Supported: v{currentRelease?.min_version || currentRelease?.version || '1.0.0'}
          </div>
        </div>

        <div style={{ background: '#131926', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Update Enforcement
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: currentRelease?.force_update ? '#f87171' : '#4ade80',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {currentRelease?.force_update ? 'Mandatory Mode' : 'Optional Mode'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
            {/* Proper Big Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(currentRelease?.force_update)}
              onClick={() => handleToggleForceUpdate(currentRelease)}
              className={`admin-toggle-switch ${currentRelease?.force_update ? 'active' : ''}`}
              title={currentRelease?.force_update ? "Click to turn OFF (Make update optional)" : "Click to turn ON (Force mandatory updates)"}
            >
              <span className="admin-toggle-thumb">
                {currentRelease?.force_update ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Label & Status */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: currentRelease?.force_update ? '#fca5a5' : '#f8fafc' }}>
                  {currentRelease?.force_update ? 'FORCED ON' : 'FORCED OFF'}
                </span>
                <span
                  style={{
                    background: currentRelease?.force_update ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.12)',
                    color: currentRelease?.force_update ? '#f87171' : '#4ade80',
                    border: currentRelease?.force_update ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.25)',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  {currentRelease?.force_update ? '🔴 Mandatory' : '🟢 Optional'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
            {currentRelease?.force_update
              ? 'Older extensions are blocked until updated.'
              : 'Users can use current extension freely.'}
          </div>
        </div>

        <div style={{ background: '#131926', padding: '22px 24px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Total Releases
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#38bdf8', marginTop: '8px' }}>
            {releasesHistory.length}
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
            Package: {currentRelease?.file_name || 'toolsbydcx_extension.zip'}
          </div>
        </div>
      </div>

      {/* HEADER ACTION BAR */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧩</span> Companion Extension Releases
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Upload new extension builds, download distribution packages, and manage update requirements.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={fetchExtensionData}
              disabled={loading}
              style={{ padding: '9px 14px', fontSize: '13px' }}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={handleOpenUploadModal}
              style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 700 }}
            >
              + Upload New Version
            </button>
          </div>
        </div>
      </div>

      {/* RELEASES LIST TABLE (Standard App Table) */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>File Package</th>
                <th>File Size</th>
                <th>Update Policy</th>
                <th>Release Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {releasesHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No extension releases uploaded yet. Click "+ Upload New Version" to publish one.
                  </td>
                </tr>
              ) : (
                releasesHistory.map((rel) => (
                  <tr key={rel.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '15px' }}>v{rel.version}</span>
                        {rel.is_active === 1 && (
                          <span className="badge-pill badge-green" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {rel.release_notes && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', maxWidth: '320px' }}>
                          {rel.release_notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{rel.file_name}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{formatFileSize(rel.file_size)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(rel.force_update)}
                          onClick={() => handleToggleForceUpdate(rel)}
                          className={`admin-toggle-switch ${rel.force_update ? 'active' : ''}`}
                          style={{ width: '48px', height: '26px' }}
                          title="Click to toggle Mandatory or Optional rule"
                        >
                          <span
                            className="admin-toggle-thumb"
                            style={{
                              width: '18px',
                              height: '18px',
                              fontSize: '8px',
                              transform: rel.force_update ? 'translateX(22px)' : 'translateX(0)'
                            }}
                          >
                            {rel.force_update ? 'ON' : ''}
                          </span>
                        </button>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: rel.force_update ? '#fca5a5' : '#4ade80',
                            background: rel.force_update ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.12)',
                            border: rel.force_update ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.25)',
                            padding: '3px 8px',
                            borderRadius: '999px'
                          }}
                        >
                          {rel.force_update ? 'MANDATORY' : 'OPTIONAL'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(rel.created_at)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDownload(rel.id)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#93c5fd', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ⬇️ Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPLOAD NEW VERSION MODAL (Strictly matches App styles) */}
      {isUploadModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => !uploading && setIsUploadModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span> Upload New Extension Version
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => !uploading && setIsUploadModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="admin-modal-body">
                {/* File Dropzone / Selected File Card */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Extension Package (.zip or .crx) <span style={{ color: '#ef4444' }}>*</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".zip,.crx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />

                  {!uploadFile ? (
                    <div
                      className={`admin-dropzone ${isDragging ? 'dragging' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <div className="admin-dropzone-icon">
                        ☁️
                      </div>
                      <div className="admin-dropzone-title">
                        Click to browse or drag & drop extension package
                      </div>
                      <div className="admin-dropzone-subtitle">
                        Supports packed bundles (.zip, .crx). Any file uploaded will automatically be saved on server as: <strong style={{ color: '#4ade80' }}>toolsbydcx_extension_v{newVersion || '1.0.0'}.zip</strong>
                      </div>
                      <span
                        className="btn-admin-secondary"
                        style={{ padding: '6px 14px', fontSize: '13px', marginTop: '6px', pointerEvents: 'none' }}
                      >
                        📁 Choose File
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="admin-file-card">
                        <div className="admin-file-card-info">
                          <div className="admin-file-card-icon">
                            📦
                          </div>
                          <div>
                            <div className="admin-file-card-name" title={uploadFile.name}>
                              {uploadFile.name}
                            </div>
                            <div className="admin-file-card-size">
                              {formatFileSize(uploadFile.size)} • Ready to upload
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-admin-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            className="btn-admin-danger"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            onClick={() => {
                              setUploadFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>

                      {/* Server renaming notice */}
                      <div
                        style={{
                          marginTop: '8px',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#93c5fd'
                        }}
                      >
                        <span>🏷️</span>
                        <div>
                          Will be renamed on server to: <strong style={{ color: '#f8fafc' }}>toolsbydcx_extension_v{newVersion || '1.0.0'}.zip</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Version Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div className="admin-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="admin-form-label" style={{ margin: 0 }}>
                        Release Version <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      {!isEditingVersion ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingVersion(true)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✏️ Edit Version
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNewVersion(nextSuggestedVersion);
                            setIsEditingVersion(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ↺ Reset (v{nextSuggestedVersion})
                        </button>
                      )}
                    </div>

                    {!isEditingVersion ? (
                      <div
                        style={{
                          background: '#090d16',
                          border: '1px solid #334155',
                          borderRadius: '10px',
                          padding: '11px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                            v{newVersion || '1.0.0'}
                          </span>
                          <span
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            ⚡ Auto-Incremented
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Locked
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="e.g. 1.0.1"
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        required
                        autoFocus
                      />
                    )}

                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {!isEditingVersion
                        ? `Auto-incremented from current release (v${currentRelease?.version || '1.0.0'}).`
                        : 'Manual edit mode enabled. Enter desired semver number.'}
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" style={{ marginBottom: '6px' }}>
                      Minimum Supported Version
                    </label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="Leave empty to match release"
                      value={newMinVersion}
                      onChange={(e) => setNewMinVersion(e.target.value)}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Optional. If empty, defaults to v{newVersion || '1.0.0'}.
                    </div>
                  </div>
                </div>

                {/* Force Update Option Card */}
                <div
                  style={{
                    background: newForceUpdate ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.05)',
                    border: `1px solid ${newForceUpdate ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 197, 94, 0.25)'}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      id="newForceUpdate"
                      checked={newForceUpdate}
                      onChange={(e) => setNewForceUpdate(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        Force users to update immediately (Mandatory Update)
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                        {newForceUpdate
                          ? 'Older extension versions will be locked and forced to update.'
                          : 'Optional update — users can continue using existing installed versions.'}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Release Notes */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Changelog / Release Notes
                  </label>
                  <textarea
                    className="admin-form-textarea"
                    rows="3"
                    placeholder="Describe what is new or fixed in this extension release..."
                    value={newReleaseNotes}
                    onChange={(e) => setNewReleaseNotes(e.target.value)}
                  />
                </div>

                {uploading && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      <span>Uploading & deploying package...</span>
                      <span style={{ fontWeight: 700, color: '#22c55e' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#22c55e', transition: 'width 0.2s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Deploying...' : '🚀 Publish & Deploy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminExtension;
