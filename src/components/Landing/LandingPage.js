import React, { useState, useEffect } from "react";
import "./LandingPage.css";

const API_BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL
  : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000/api" : "/api");

export default function LandingPage({ currentUser, onOpenAuth, onNavigate, onLogout }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await fetch(`${API_BASE}/plans`);
      const data = await res.json();
      if (data.plans && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.warn("Failed to load plans from server:", err);
      // Fallback
      setPlans([
        {
          id: "plan_free",
          name: "Flow Basic",
          price: 0,
          billing_cycle: "monthly",
          description: "Standard preview access to shared resources.",
          features: ["Standard shared account access", "Community support", "1 active session"]
        },
        {
          id: "plan_pro",
          name: "Flow Ultra",
          price: 9.99,
          billing_cycle: "monthly",
          description: "Full access to premium shared accounts with Chrome extension.",
          features: ["Instant 1-Click Access", "Auto-refresh session tokens", "Priority account access", "High-speed proxy sync"]
        },
        {
          id: "plan_unlimited",
          name: "Flow Max",
          price: 29.99,
          billing_cycle: "monthly",
          description: "All-inclusive VIP access for high-volume usage and teams.",
          features: ["All Pro features", "Multi-device extension support", "Dedicated high-speed proxies", "Zero rate limits guarantee"]
        }
      ]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const scrollToPricing = () => {
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectPlan = (plan) => {
    if (!currentUser) {
      onOpenAuth("signup");
    } else {
      // If already logged in, navigate to appropriate panel
      if (currentUser.role === "admin") onNavigate("admin");
      else if (currentUser.role === "reseller") onNavigate("reseller");
      else onNavigate("user-panel");
    }
  };

  const getPortalLabel = () => {
    if (!currentUser) return "Sign In";
    if (currentUser.role === "admin") return "Admin Portal";
    if (currentUser.role === "reseller") return "Reseller Portal";
    return "User Dashboard";
  };

  const handlePortalClick = () => {
    if (!currentUser) {
      onOpenAuth("login");
      return;
    }
    if (currentUser.role === "admin") onNavigate("admin");
    else if (currentUser.role === "reseller") onNavigate("reseller");
    else onNavigate("user-panel");
  };

  return (
    <div className="landing-root">
      <div className="landing-bg-glow-1"></div>
      <div className="landing-bg-glow-2"></div>

      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="landing-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="landing-brand-text">
              FlowBy<span>Dcx</span>
            </span>
          </div>

          <div className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              Features
            </button>
            <button type="button" className="landing-nav-link" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              How It Works
            </button>
            <button type="button" className="landing-nav-link" onClick={scrollToPricing}>
              Plans & Pricing
            </button>
            <button type="button" className="landing-nav-link" onClick={() => document.getElementById("extension")?.scrollIntoView({ behavior: "smooth" })}>
              Extension
            </button>
          </div>

          <div className="landing-nav-actions">
            {currentUser ? (
              <>
                <div className="landing-user-chip">
                  <span className="landing-user-dot"></span>
                  <span>{currentUser.name}</span>
                </div>
                <button type="button" className="landing-btn-primary" onClick={handlePortalClick}>
                  {getPortalLabel()} ➜
                </button>
                <button type="button" className="landing-btn-ghost" onClick={onLogout}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button type="button" className="landing-btn-ghost" onClick={() => onOpenAuth("login")}>
                  Sign In
                </button>
                <button type="button" className="landing-btn-primary" onClick={() => onOpenAuth("signup")}>
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="landing-pill-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Next-Gen Cloud Account Access Platform</span>
          </div>

          <h1 className="landing-hero-title">
            Unlock High-Tier AI & Pro Accounts in <span className="landing-hero-gradient">One Click</span>
          </h1>

          <p className="landing-hero-subtitle">
            Eliminate password leaks and tedious logins. FlowByDcx seamlessly synchronizes verified account access directly to your browser with 1-click authentication, automated account pools, and high-uptime proxies.
          </p>

          <div className="landing-hero-actions">
            <button type="button" className="landing-btn-primary hero-cta-primary" onClick={scrollToPricing}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 8 12 12 14 14" />
              </svg>
              Explore Plans & Pricing
            </button>
            <button type="button" className="landing-btn-secondary hero-cta-secondary" onClick={() => document.getElementById("extension")?.scrollIntoView({ behavior: "smooth" })}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Get Extension v1.4
            </button>
            {currentUser && (
              <button type="button" className="landing-btn-secondary hero-cta-secondary" onClick={handlePortalClick}>
                {getPortalLabel()} ➜
              </button>
            )}
          </div>

          {/* Interactive Live Status Card Preview */}
          <div className="landing-hero-preview">
            <div className="landing-preview-header">
              <div className="landing-preview-dots">
                <span className="landing-preview-dot landing-dot-red"></span>
                <span className="landing-preview-dot landing-dot-yellow"></span>
                <span className="landing-preview-dot landing-dot-green"></span>
              </div>
              <div className="landing-preview-chip">
                <span className="landing-user-dot"></span>
                <span>Extension Engine: Online & Synced</span>
              </div>
            </div>

            <div className="landing-preview-body">
              <div className="landing-preview-box">
                <div className="landing-box-label">Target Service</div>
                <div className="landing-box-val">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  Google Flow / AI Labs
                </div>
              </div>
              <div className="landing-preview-box">
                <div className="landing-box-label">Active Account Pool</div>
                <div className="landing-box-val">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Multi-Tier Rotation
                </div>
              </div>
              <div className="landing-preview-box">
                <div className="landing-box-label">Injection Latency</div>
                <div className="landing-box-val">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  &lt; 180ms
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS & PRICING SECTION */}
      <section className="landing-section" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-badge">Transparent Pricing</span>
            <h2 className="landing-section-title">Flexible Plans Tailored For You</h2>
            <p className="landing-section-desc">
              Whether you need casual access or full-throttle enterprise pools, choose the plan that fits your workflow.
            </p>
          </div>

          <div className="landing-plans-grid">
            {loadingPlans ? (
              <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: "40px", color: "#94a3b8" }}>
                <div style={{ width: "24px", height: "24px", border: "2px solid rgba(34, 197, 94, 0.2)", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 12px" }}></div>
                <span>Loading available plans...</span>
              </div>
            ) : (
              plans.map((plan, idx) => {
              const isPopular = plan.id === "plan_pro" || idx === 1;
              const featList = Array.isArray(plan.features)
                ? plan.features
                : typeof plan.features === "string"
                ? JSON.parse(plan.features || "[]")
                : [];

              return (
                <div key={plan.id || idx} className={`landing-plan-card ${isPopular ? "popular" : ""}`}>
                  {isPopular && <div className="landing-popular-badge">★ Most Popular</div>}

                  <div className="landing-plan-top">
                    <h3 className="landing-plan-name">{plan.name}</h3>
                    <p className="landing-plan-desc">{plan.description}</p>
                    <div className="landing-plan-price-wrap">
                      <span className="landing-plan-price">
                        {plan.price === 0 ? "Free" : `$${Number(plan.price).toFixed(2)}`}
                      </span>
                      {plan.price > 0 && <span className="landing-plan-cycle">/ {plan.billing_cycle || "month"}</span>}
                    </div>
                  </div>

                  <ul className="landing-plan-features">
                    {featList.map((feat, fIdx) => (
                      <li key={fIdx} className="landing-plan-feature-item">
                        <span className="landing-feature-check">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`landing-plan-btn ${isPopular ? "primary" : "secondary"}`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {currentUser ? "Select Plan ➜" : "Get Started Now ➜"}
                  </button>
                </div>
              );
            }))}
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-badge">Engineered For Performance</span>
            <h2 className="landing-section-title">Built For Seamless Shared Access</h2>
            <p className="landing-section-desc">
              A complete suite of session relay technologies designed to keep your tools connected without interruption.
            </p>
          </div>

          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Instant 1-Click Access</h3>
              <p className="landing-feature-desc">
                No manual copying of credentials or complex configurations. The companion extension handles automated, secure 1-click account access directly.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Auto-Renewing Sessions</h3>
              <p className="landing-feature-desc">
                Sessions refresh silently in the background. If an account is logged out, the extension immediately re-authenticates or swaps to a standby server.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Zero Credential Exposure</h3>
              <p className="landing-feature-desc">
                Your master account passwords are never revealed to end-users or clients. Users receive scoped session tokens strictly protected by AES encryption.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <h3 className="landing-feature-title">Dedicated Reseller Hub</h3>
              <p className="landing-feature-desc">
                Resellers can easily onboard clients, allocate custom access periods, track user usage, and manage shared resource pools from a dedicated portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-badge">Fast Onboarding</span>
            <h2 className="landing-section-title">Up and Running in 3 Simple Steps</h2>
            <p className="landing-section-desc">
              Get access to all your tools in minutes without technical setup or complex configurations.
            </p>
          </div>

          <div className="landing-steps-grid">
            <div className="landing-step-card">
              <div className="landing-step-num">01</div>
              <h3 className="landing-step-title">Select Your Plan</h3>
              <p className="landing-step-desc">
                Pick a plan that fits your resource needs, create your FlowByDcx account, and verify your email in seconds.
              </p>
            </div>

            <div className="landing-step-card">
              <div className="landing-step-num">02</div>
              <h3 className="landing-step-title">Install Companion Extension</h3>
              <p className="landing-step-desc">
                Add the FlowByDcx Chrome Extension to your browser. It links automatically to your active dashboard session.
              </p>
            </div>

            <div className="landing-step-card">
              <div className="landing-step-num">03</div>
              <h3 className="landing-step-title">Instant 1-Click Launch</h3>
              <p className="landing-step-desc">
                Open Google Flow or your target tool, click the extension icon, and start using your premium account immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EXTENSION BANNER */}
      <section className="landing-container" id="extension">
        <div className="landing-ext-banner">
          <div className="landing-ext-content">
            <div className="landing-pill-badge" style={{ marginBottom: "16px" }}>
              Chrome Extension v1.4 Available
            </div>
            <h2 className="landing-ext-title">Power Your Browser with FlowByDcx</h2>
            <p className="landing-ext-desc">
              The FlowByDcx Chrome extension coordinates directly with your web session. Features automatic site detection, multi-account switcher dropdown, and instant 1-click launch.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="landing-btn-primary"
                onClick={() => {
                  window.open("https://chrome.google.com/webstore", "_blank");
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Install for Chrome
              </button>
              <button
                type="button"
                className="landing-btn-secondary"
                onClick={handlePortalClick}
              >
                Open Dashboard
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.05) 100%)",
              border: "1px solid rgba(34,197,94,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(34,197,94,0.3)"
            }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-top">
            <div className="landing-brand">
              <div className="landing-brand-icon" style={{ width: "32px", height: "32px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="landing-brand-text">FlowBy<span>Dcx</span></span>
            </div>

            <div className="landing-nav-links">
              <button type="button" className="landing-nav-link" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Top
              </button>
              <button type="button" className="landing-nav-link" onClick={scrollToPricing}>
                Pricing
              </button>
              <button type="button" className="landing-nav-link" onClick={() => onOpenAuth("login")}>
                Sign In
              </button>
              <button type="button" className="landing-nav-link" onClick={() => onOpenAuth("signup")}>
                Register
              </button>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <div>© {new Date().getFullYear()} FlowByDcx. All rights reserved. Professional Cloud Account Access Platform.</div>
            <div style={{ display: "flex", gap: "16px" }}>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span style={{ color: "#22c55e" }}>System Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
