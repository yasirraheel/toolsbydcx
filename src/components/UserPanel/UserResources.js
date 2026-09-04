import React, { useState, useEffect } from 'react';

function UserResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [launchingId, setLaunchingId] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ccna_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/user/resources`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.resources) {
        setResources(data.resources);
      }
    } catch (e) {
      console.warn('User resources API notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLaunch = async (resource) => {
    setLaunchingId(resource.id);
    try {
      // 1. Dispatch custom bridge event for FlowByDcx Extension
      window.dispatchEvent(new CustomEvent('__flow_launch_account__', {
        detail: {
          accountId: resource.id,
          service: resource.service,
          targetUrl: resource.target_url
        }
      }));

      // 2. Open target URL directly in new tab (no alert dialog)
      const url = resource.target_url || 'https://labs.google/fx/tools/flow';
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Launch failed:', e);
    } finally {
      setTimeout(() => setLaunchingId(null), 800);
    }
  };

  const filteredResources = resources.filter((item) => {
    const matchesSearch = !search ||
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) ||
      (item.service && item.service.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (activeFilter === 'all') return true;
    return item.service?.toLowerCase() === activeFilter.toLowerCase();
  });

  const servicesList = Array.from(new Set(resources.map((r) => r.service).filter(Boolean)));

  return (
    <div className="admin-accounts-view">
      {/* FILTER & SEARCH TOOLBAR */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <span>🚀</span> My Shared Tools & Accounts ({resources.length})
          </h3>

          <div className="admin-card-actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search tools & accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="admin-select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">All Services</option>
              {servicesList.map((srv) => (
                <option key={srv} value={srv}>{srv}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ACCOUNTS TABLE */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Target Platform URL</th>
                <th>Status</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Loading tools...
                  </td>
                </tr>
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No tools available on your subscription tier.
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>
                        {res.name || res.service}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {res.service || 'Active Tool'}
                      </div>
                    </td>
                    <td>
                      <a
                        href={res.target_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}
                      >
                        {res.target_url || 'https://google.com'} ↗
                      </a>
                    </td>
                    <td>
                      <span className="badge-pill badge-green">Active</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {res.description || 'Shared high-tier account pool'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-admin-primary"
                        style={{ padding: '8px 18px', fontSize: '14px' }}
                        disabled={launchingId === res.id}
                        onClick={() => handleLaunch(res)}
                      >
                        {launchingId === res.id ? 'Launching...' : '🚀 Launch Tool'}
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
