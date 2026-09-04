import React, { useState, useEffect, useRef } from "react";

function NavigationMenu({
  currentView,
  onNavigate,
  candidateName,
  currentUser,
  onOpenAuth,
  onLogout,
  pageTitle = "Cisco 200-301 CCNA",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const displayName = currentUser?.name || candidateName || "Candidate";

  const getInitials = (name) => {
    if (!name || !name.trim()) return "MS";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="cisco-nav-header">
      <div className="nav-header-left" ref={menuRef}>
        <button
          type="button"
          className={`btn-hamburger ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Menu"
          aria-label="Navigation Menu"
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>

        <h1
          className="nav-page-title"
          onClick={() => onNavigate("dashboard")}
          style={{ cursor: "pointer" }}
        >
          {pageTitle}
        </h1>

        {isOpen && (
          <div className="nav-dropdown-menu">
            <button
              type="button"
              className={`nav-menu-item ${currentView === "dashboard" ? "active" : ""}`}
              onClick={() => { onNavigate("dashboard"); setIsOpen(false); }}
            >
              <span className="nav-menu-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </span>
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`nav-menu-item ${currentView === "resume-exams" ? "active" : ""}`}
              onClick={() => { onNavigate("resume-exams"); setIsOpen(false); }}
            >
              <span className="nav-menu-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </span>
              <span>My Exams</span>
            </button>

            <button
              type="button"
              className={`nav-menu-item ${currentView === "history" ? "active" : ""}`}
              onClick={() => { onNavigate("history"); setIsOpen(false); }}
            >
              <span className="nav-menu-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span>Exam History</span>
            </button>

            {/* Portal Navigation Links */}
            {currentUser && currentUser.role === 'admin' && (
              <>
                <button
                  type="button"
                  className={`nav-menu-item ${currentView === "admin" ? "active" : ""}`}
                  onClick={() => { onNavigate("admin"); setIsOpen(false); }}
                  style={{ color: "#4ade80", fontWeight: 700 }}
                >
                  <span className="nav-menu-icon">⚡</span>
                  <span>Admin Portal</span>
                </button>
                <button
                  type="button"
                  className={`nav-menu-item ${currentView === "reseller" ? "active" : ""}`}
                  onClick={() => { onNavigate("reseller"); setIsOpen(false); }}
                  style={{ color: "#c084fc", fontWeight: 700 }}
                >
                  <span className="nav-menu-icon">🤝</span>
                  <span>Reseller Portal</span>
                </button>
                <button
                  type="button"
                  className={`nav-menu-item ${currentView === "user-panel" ? "active" : ""}`}
                  onClick={() => { onNavigate("user-panel"); setIsOpen(false); }}
                  style={{ color: "#22d3ee", fontWeight: 700 }}
                >
                  <span className="nav-menu-icon">🚀</span>
                  <span>User Portal</span>
                </button>
              </>
            )}

            {currentUser && currentUser.role === 'reseller' && (
              <button
                type="button"
                className={`nav-menu-item ${currentView === "reseller" ? "active" : ""}`}
                onClick={() => { onNavigate("reseller"); setIsOpen(false); }}
                style={{ color: "#c084fc", fontWeight: 700 }}
              >
                <span className="nav-menu-icon">🤝</span>
                <span>Reseller Portal</span>
              </button>
            )}

            {currentUser && currentUser.role === 'user' && (
              <button
                type="button"
                className={`nav-menu-item ${currentView === "user-panel" ? "active" : ""}`}
                onClick={() => { onNavigate("user-panel"); setIsOpen(false); }}
                style={{ color: "#22d3ee", fontWeight: 700 }}
              >
                <span className="nav-menu-icon">🚀</span>
                <span>User Portal</span>
              </button>
            )}

            {/* Auth links — only shown on mobile for non-logged-in users */}
            {!currentUser && (
              <>
                <div className="nav-dropdown-divider"></div>
                <button
                  type="button"
                  className="nav-menu-item nav-menu-auth-item"
                  onClick={() => { onOpenAuth && onOpenAuth("login"); setIsOpen(false); }}
                >
                  <span className="nav-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  </span>
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  className="nav-menu-item nav-menu-auth-item nav-menu-signup-item"
                  onClick={() => { onOpenAuth && onOpenAuth("signup"); setIsOpen(false); }}
                >
                  <span className="nav-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  </span>
                  <span>Create Account</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="nav-header-right" ref={userMenuRef}>
        {currentUser && (currentUser.role === 'admin' || currentUser.email === 'candidate@ccna.com') && (
          <button
            type="button"
            className="btn-admin-nav-trigger"
            onClick={() => onNavigate("admin")}
            title="Open Admin Portal"
          >
            ⚡ Admin Portal
          </button>
        )}

        {currentUser ? (
          <div className="user-profile-wrapper">
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div
                className="nav-user-avatar"
                title={`Logged in as: ${displayName} (${currentUser.email})`}
              >
                <span>{getInitials(displayName)}</span>
                <span className="avatar-verified-dot" title="Verified Candidate">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>
              <div className="user-profile-meta">
                <span className="user-profile-name">{displayName}</span>
                <div className="nav-verified-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Verified</span>
                </div>
              </div>
              <span className="user-dropdown-caret">▾</span>
            </button>

            {isUserMenuOpen && (
              <div className="nav-user-dropdown-menu">
                <div className="user-dropdown-info">
                  <strong>{displayName}</strong>
                  <span className="user-dropdown-email">{currentUser.email}</span>
                </div>
                <div className="user-dropdown-divider"></div>

                {/* Portal links in dropdown */}
                {currentUser.role === 'admin' && (
                  <>
                    <button
                      type="button"
                      className="user-dropdown-item"
                      style={{ color: "#4ade80", fontWeight: 700 }}
                      onClick={() => {
                        onNavigate("admin");
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <span style={{ marginRight: "6px" }}>⚡</span>
                      Admin Portal
                    </button>
                    <button
                      type="button"
                      className="user-dropdown-item"
                      style={{ color: "#c084fc", fontWeight: 700 }}
                      onClick={() => {
                        onNavigate("reseller");
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <span style={{ marginRight: "6px" }}>🤝</span>
                      Reseller Portal
                    </button>
                    <button
                      type="button"
                      className="user-dropdown-item"
                      style={{ color: "#22d3ee", fontWeight: 700 }}
                      onClick={() => {
                        onNavigate("user-panel");
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <span style={{ marginRight: "6px" }}>🚀</span>
                      User Portal
                    </button>
                  </>
                )}

                {currentUser.role === 'reseller' && (
                  <button
                    type="button"
                    className="user-dropdown-item"
                    style={{ color: "#c084fc", fontWeight: 700 }}
                    onClick={() => {
                      onNavigate("reseller");
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <span style={{ marginRight: "6px" }}>🤝</span>
                    Reseller Portal
                  </button>
                )}

                {currentUser.role === 'user' && (
                  <button
                    type="button"
                    className="user-dropdown-item"
                    style={{ color: "#22d3ee", fontWeight: 700 }}
                    onClick={() => {
                      onNavigate("user-panel");
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <span style={{ marginRight: "6px" }}>🚀</span>
                    User Portal
                  </button>
                )}

                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    onNavigate("history");
                    setIsUserMenuOpen(false);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  My Exam Records
                </button>
                <button
                  type="button"
                  className="user-dropdown-item user-dropdown-logout"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="nav-auth-buttons">
            <button
              type="button"
              className="btn-nav-login"
              onClick={() => onOpenAuth && onOpenAuth("login")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Log In
            </button>
            <button
              type="button"
              className="btn-nav-signup"
              onClick={() => onOpenAuth && onOpenAuth("signup")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default NavigationMenu;
