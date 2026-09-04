import React, { useState, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';

function UserProjects() {
  const { confirm, alert: showCustomAlert } = useDialog();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ccna_auth_token');
      const res = await fetch(`${API_BASE}/user/projects`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (e) {
      console.error('Failed to load user projects:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenProject = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (id, projectTitle) => {
    const confirmed = await confirm({
      title: 'Remove Saved Project',
      message: `Are you sure you want to remove ${projectTitle ? `"${projectTitle}"` : 'this project'} from your saved list?`,
      note: 'This will remove the project from your dashboard list.',
      confirmText: 'Remove Project',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('ccna_auth_token');
      const res = await fetch(`${API_BASE}/user/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
      } else {
        await showCustomAlert({
          title: 'Removal Failed',
          message: data.error || 'Failed to remove project.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Error removing project: ' + e.message,
        type: 'danger'
      });
    }
  };

  const startEditing = (p) => {
    setEditingId(p.id);
    setEditTitle(p.title || 'Flow Project');
  };

  const handleSaveTitle = async (id) => {
    if (!editTitle.trim()) return;
    try {
      const token = localStorage.getItem('ccna_auth_token');
      const res = await fetch(`${API_BASE}/user/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, title: editTitle.trim() } : p));
        setEditingId(null);
      } else {
        await showCustomAlert({
          title: 'Update Failed',
          message: data.error || 'Failed to update title.',
          type: 'danger'
        });
      }
    } catch (e) {
      await showCustomAlert({
        title: 'Error',
        message: 'Error saving title: ' + e.message,
        type: 'danger'
      });
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(isoStr);
    }
  };

  return (
    <div className="admin-dashboard-view">
      {/* HEADER CARD */}
      <div className="admin-card" style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #101726, #162032)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🎬</span> My Saved Flow Projects
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              Since other users' projects are hidden on the shared home page, all your created projects are automatically saved and organized here for quick 1-click access.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700
            }}>
              Saved: {projects.length}
            </span>
            <button
              type="button"
              className="btn-admin-secondary"
              onClick={fetchProjects}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🔄</span> Refresh
            </button>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => window.open('https://labs.google/fx/tools/flow', '_blank', 'noopener,noreferrer')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>➕</span> New Project in Flow
            </button>
          </div>
        </div>
      </div>

      {/* PROJECTS LIST / TABLE */}
      <div className="admin-card">
        <div className="admin-table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
              <div>Loading your saved projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎬</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
                No saved projects yet
              </h4>
              <p style={{ margin: '0 auto 20px auto', maxWidth: '460px', fontSize: '14px', lineHeight: 1.6 }}>
                Whenever you click "+ New project" or open a project on Google Flow, ToolsByDcx will automatically save the project URL here so you can access it anytime.
              </p>
              <button
                type="button"
                className="btn-admin-primary"
                onClick={() => window.open('https://labs.google/fx/tools/flow', '_blank', 'noopener,noreferrer')}
              >
                🚀 Open Google Flow to Create a Project
              </button>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Project ID</th>
                  <th>Date Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const isEditing = editingId === p.id;
                  const isCopied = copiedId === p.id;
                  return (
                    <tr key={p.id}>
                      <td style={{ minWidth: '220px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="admin-input"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(p.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button
                              type="button"
                              className="btn-admin-primary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleSaveTitle(p.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-admin-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => setEditingId(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>🎬</span>
                            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>
                              {p.title || 'Flow Project'}
                            </span>
                            <button
                              type="button"
                              title="Rename project"
                              onClick={() => startEditing(p)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '2px',
                                fontSize: '13px',
                                opacity: 0.7
                              }}
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{
                            background: '#0f172a',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: '#94a3b8',
                            fontSize: '12px',
                            border: '1px solid #1e293b',
                            fontFamily: 'monospace'
                          }}>
                            {(p.project_id || '').substring(0, 14)}...
                          </code>
                          <button
                            type="button"
                            title="Copy full project URL"
                            onClick={() => handleCopy(p.project_url || ('https://labs.google/fx/tools/flow/project/' + p.project_id), p.id)}
                            style={{
                              background: isCopied ? '#22c55e22' : 'transparent',
                              border: '1px solid ' + (isCopied ? '#22c55e' : '#334155'),
                              color: isCopied ? '#22c55e' : '#94a3b8',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            {isCopied ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-admin-primary"
                            style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleOpenProject(p.project_url || ('https://labs.google/fx/tools/flow/project/' + p.project_id))}
                          >
                            <span>🚀</span> Open Project
                          </button>
                          <button
                            type="button"
                            title="Remove project from saved list"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleDelete(p.id, p.title)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProjects;
