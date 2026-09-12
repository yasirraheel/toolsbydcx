import React from 'react';

export default function ExtensionRemoved({ onNavigate }) {
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
    <div style={styles.container}>
      <div style={styles.card}>
        {/* App Logo Badge */}
        <div style={styles.logoBadge}>
          <img src="/logo.png" alt="ToolsByDcx" style={styles.logoImg} />
        </div>

        {/* Brand Name */}
        <div style={styles.brandTitle}>TOOLSBYDCX</div>

        {/* Checkmark Status Badge */}
        <div style={styles.checkBadge}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Main Header */}
        <h1 style={styles.heading}>All Sessions Cleared</h1>

        {/* Description */}
        <p style={styles.description}>
          Google Flow, Whisk, and all injected sessions have been signed out.
        </p>

        {/* Account Safety Subtext */}
        <p style={styles.subtext}>
          Your ToolsByDcx account is safe. You can log back in anytime.
        </p>

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={handleReturn}
            style={styles.primaryBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.25)';
            }}
          >
            Return to ToolsByDcx
          </button>

          <button
            type="button"
            onClick={handleClose}
            style={styles.secondaryBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.borderColor = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#161d2d';
              e.currentTarget.style.borderColor = '#334155';
            }}
          >
            Close Tab
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          Thank you for using ToolsByDcx
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#090d16',
    backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.15), transparent)',
    padding: '24px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#0e1320',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '44px 36px 36px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(16, 185, 129, 0.08)',
  },
  logoBadge: {
    width: '72px',
    height: '72px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)',
  },
  logoImg: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
  },
  brandTitle: {
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '2.5px',
    color: '#10b981',
    marginBottom: '24px',
    textTransform: 'uppercase',
  },
  checkBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '22px',
    boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: '0 0 14px 0',
    letterSpacing: '-0.5px',
  },
  description: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 12px 0',
    maxWidth: '380px',
  },
  subtext: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 32px 0',
    maxWidth: '360px',
  },
  buttonGroup: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '28px',
  },
  primaryBtn: {
    width: '100%',
    padding: '13px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
  },
  secondaryBtn: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#94a3b8',
    backgroundColor: '#161d2d',
    border: '1px solid #334155',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footer: {
    fontSize: '12px',
    color: '#475569',
  },
};
