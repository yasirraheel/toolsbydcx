import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../apiConfig';

function UserResources({ accountType }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [launchingId, setLaunchingId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token') || localStorage.getItem('flow_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchResources = async () => {
    try {
      setLoading(true);
      const queryParam = accountType?.slug ? `?type=${encodeURIComponent(accountType.slug)}` : '';
      const res = await fetch(`${API_BASE}/user/resources${queryParam}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.resources) {
        setResources(data.resources);
      } else {
        setResources([]);
      }
    } catch (e) {
      console.warn('User resources API notice:', e);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType?.id, accountType?.slug]);

  const handleLaunch = async (resource) => {
    setLaunchingId(resource.id);
    try {
      // 1. Dispatch custom bridge event for Chrome Extension
      window.dispatchEvent(new CustomEvent('__flow_launch_account__', {
        detail: {
          accountId: resource.id,
          service: resource.service || resource.service_name,
          targetUrl: resource.target_url
        }
      }));

      // 2. Open target URL directly in new tab
      const url = resource.target_url || 'https://flow.google.com/';
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Launch failed:', e);
    } finally {
      setTimeout(() => setLaunchingId(null), 800);
    }
  };

  const filteredResources = resources.filter((item) => {
    const itemName = item.service_name || item.name || '';
    const itemUrl = item.target_url || '';
    return !search ||
      itemName.toLowerCase().includes(search.toLowerCase()) ||
      itemUrl.toLowerCase().includes(search.toLowerCase());
  });

  const categoryName = accountType?.name || 'Available';
  const categoryIcon = accountType?.icon || '🚀';
  const categoryDesc = accountType?.description || 'Select an active server to launch with 1-click automatic extension session access.';

  return (
    <div className="admin-accounts-view">
      {/* CATEGORY HEADER & SEARCH TOOLBAR */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="admin-card-title">
              <span>{categoryIcon}</span> {categoryName} Accounts ({filteredResources.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              {categoryDesc}
            </p>
          </div>

          <div className="admin-card-actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder={`Search ${categoryName} servers...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '220px' }}
            />
          </div>
        </div>

        {/* ACCOUNTS TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Server / Account Name</th>
                <th>Target Platform URL</th>
                <th>Status</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{categoryIcon}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                      No {categoryName} accounts currently assigned.
                    </div>
                    <p style={{ fontSize: '13px', marginTop: '4px', color: '#94a3b8' }}>
                      New accounts added by your administrator will automatically appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>
                        {res.service_name || res.name || 'Server'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        ID: {res.id}
                      </div>
                    </td>
                    <td>
                      <a
                        href={res.target_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>🔗</span>
                        <span>{res.target_url || 'https://google.com'}</span>
                        <span style={{ fontSize: '12px' }}>↗</span>
                      </a>
                    </td>
                    <td>
                      <span className="badge-pill badge-green">Active & Ready</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {res.description || `${categoryName} shared workspace server`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-admin-primary"
                        style={{ padding: '8px 20px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        disabled={launchingId === res.id}
                        onClick={() => handleLaunch(res)}
                      >
                        <span>{launchingId === res.id ? '⏳' : '🚀'}</span>
                        <span>{launchingId === res.id ? 'Connecting...' : 'Launch Server'}</span>
                      </button>
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

export default UserResources;
