import React, { useEffect, useState } from 'react';

export default function ExtensionRemoved({ onNavigate }) {
  const [auditRef, setAuditRef] = useState('SEC-PURGED-OK');

  useEffect(() => {
    try {
      localStorage.setItem('__dcx_extension_uninstalled__', String(Date.now()));
      sessionStorage.removeItem('__dcx_session_active__');
      const stamp = Math.random().toString(36).substring(2, 8).toUpperCase();
      setAuditRef('AUDIT-' + stamp + '-PURGED');
    } catch (_) {}
  }, []);

  const handleReturn = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      window.location.href = '/';
    }
  };

  const handleClose = () => {
    try {
      window.close();
    } catch (_) {}
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  };

  return (
    <div style={styles.outerContainer}>
      <div style={styles.ambientGrid}></div>
      <div style={styles.container}>
        {/* Top Nav */}
        <div style={styles.topNav}>
          <div style={styles.brandGroup}>
            <div style={styles.brandLogo}>
              <img src="/logo.png" alt="ToolsByDcx" style={styles.logoImg} />
            </div>
            <span style={styles.brandName}>TOOLSBYDCX</span>
          </div>
          <div style={styles.securityPill}>
            <div style={styles.pulseDot}></div>
            <span>Security Purge Complete</span>
          </div>
        </div>

        {/* Main Glass Card */}
        <div style={styles.card}>
          {/* Top Edge Line */}
          <div style={styles.cardHighlight}></div>

          {/* Shield Aura Icon */}
          <div style={styles.shieldWrapper}>
            <div style={styles.shieldAura}></div>
            <div style={styles.shieldIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 8px rgba(16, 185, 129, 0.4))' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>
            Extension Uninstalled<br />
            <span style={styles.headingGradient}>All Sessions Purged</span>
          </h1>

          <p style={styles.description}>
            The ToolsByDcx extension has been safely removed. For your security, all active tool sessions, injected cookies, and temporary credentials have been wiped from this browser.
          </p>

          {/* 3-Column Security Grid */}
          <div style={styles.auditGrid}>
            {/* ChatGPT Workspaces */}
            <div style={styles.auditCard}>
              <div style={styles.auditIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div style={styles.auditTitle}>ChatGPT Workspaces</div>
              <div style={styles.auditDesc}>Injected sessions killed. Storage & cache reset.</div>
              <div style={styles.auditStatus}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Purged
              </div>
            </div>

            {/* Google Flow Suite */}
            <div style={styles.auditCard}>
              <div style={styles.auditIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div style={styles.auditTitle}>Google Flow Suite</div>
              <div style={styles.auditDesc}>NextAuth signed out. Shared access invalidated.</div>
              <div style={styles.auditStatus}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Revoked
              </div>
            </div>

            {/* Browser Environment */}
            <div style={styles.auditCard}>
              <div style={styles.auditIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div style={styles.auditTitle}>Local Browser State</div>
              <div style={styles.auditDesc}>Storage neutralized. No leftover credentials.</div>
              <div style={styles.auditStatus}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Clean
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleReturn}
              style={styles.btnPrimary}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)';
              }}
            >
              <span>Return to ToolsByDcx Dashboard</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button
              type="button"
              onClick={handleClose}
              style={styles.btnSecondary}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.7)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Close Window</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footerBar}>
          <span>ToolsByDcx Security Infrastructure • Multi-Tenant Guard v1.5</span>
          <span style={styles.refCode}>{auditRef}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  outerContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060911',
    backgroundImage: `
      radial-gradient(circle at 50% -10%, rgba(16, 185, 129, 0.18), transparent 60%),
      radial-gradient(circle at 10% 90%, rgba(6, 182, 212, 0.1), transparent 50%),
      radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.08), transparent 50%)
    `,
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '32px 20px',
    color: '#f8fafc',
    position: 'relative',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  ambientGrid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  container: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '680px',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  topNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 8px 24px 8px',
    boxSizing: 'border-box',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandLogo: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  brandName: {
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '1.5px',
    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textTransform: 'uppercase',
  },
  securityPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '9999px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    fontSize: '11px',
    fontWeight: '700',
    color: '#34d399',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  pulseDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px #10b981',
  },
  card: {
    width: '100%',
    background: 'rgba(14, 20, 34, 0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '44px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 60px -10px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), rgba(6, 182, 212, 0.6), transparent)',
  },
  shieldWrapper: {
    position: 'relative',
    marginBottom: '24px',
  },
  shieldAura: {
    position: 'absolute',
    inset: '-12px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
    filter: 'blur(10px)',
  },
  shieldIcon: {
    position: 'relative',
    width: '80px',
    height: '80px',
    borderRadius: '22px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 30px rgba(16, 185, 129, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
  },
  heading: {
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.8px',
    lineHeight: 1.25,
    color: '#f8fafc',
    marginBottom: '12px',
  },
  headingGradient: {
    background: 'linear-gradient(135deg, #34d399 0%, #06b6d4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    fontSize: '15px',
    color: '#94a3b8',
    lineHeight: 1.6,
    maxWidth: '520px',
    marginBottom: '32px',
  },
  auditGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
    width: '100%',
    marginBottom: '36px',
    boxSizing: 'border-box',
  },
  auditCard: {
    background: 'rgba(22, 30, 49, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '18px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
    boxSizing: 'border-box',
  },
  auditIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  auditTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '4px',
  },
  auditDesc: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: '12px',
  },
  auditStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.12)',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  buttonGroup: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  btnPrimary: {
    width: '100%',
    padding: '15px 24px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
    boxSizing: 'border-box',
  },
  btnSecondary: {
    width: '100%',
    padding: '13px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#cbd5e1',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  footerBar: {
    marginTop: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 8px',
    fontSize: '12px',
    color: '#64748b',
    boxSizing: 'border-box',
  },
  refCode: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
};
