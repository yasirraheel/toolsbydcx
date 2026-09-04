import React, { useState, useEffect, useRef } from "react";

const API_AUTH_BASE =
  process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/auth`
    : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api/auth"
    : "/api/auth";

function EyeToggleBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      className="auth-eye-btn"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        /* Eye-off */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        /* Eye */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}

function AuthView({
  initialMode = "login",
  onAuthSuccess,
  onClose,       // optional — go back to dashboard
  currentUser,
  onLogout,
}) {
  const [mode, setMode] = useState(initialMode === "signup" ? "login" : initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [pendingEmail, setPendingEmail] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const otpInputsRef = useRef([]);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg("");
    setSuccessMsg("");
  }, [initialMode]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  /* ---------- OTP helpers ---------- */
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otpCode];
    next[index] = value;
    setOtpCode(next);
    if (value && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^[0-9]{6}$/.test(pasted)) {
      setOtpCode(pasted.split(""));
      if (otpInputsRef.current[5]) otpInputsRef.current[5].focus();
    }
  };


  /* ---------- Verify OTP ---------- */
  const handleVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    clearMessages();
    const code = otpCode.join("").trim();
    if (code.length !== 6)
      return setErrorMsg("Please enter the complete 6-digit verification code.");

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      if (data.token && data.user) {
        localStorage.setItem("ccna_auth_token", data.token);
        localStorage.setItem("ccna_auth_user", JSON.stringify(data.user));
        try {
          const flowAuth = {
            userId: data.user.id,
            token: data.token,
            sessionToken: data.token,
            email: data.user.email,
            userName: data.user.name,
            userPlan: data.user.plan || "pro",
            creditsLeft: 999,
            daysRemaining: 30,
            planExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
            apiBase: window.location.origin,
          };
          localStorage.setItem("__flow_auth__", JSON.stringify(flowAuth));
          localStorage.setItem("flow_token", data.token);
          window.dispatchEvent(new CustomEvent("__bf_auth_ready__", { detail: flowAuth }));
        } catch (_) {}
        onAuthSuccess && onAuthSuccess(data.user, data.token);
      }
      setSuccessMsg(data.message || "Email verified successfully!");
      setTimeout(() => onClose && onClose(), 1200);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Resend OTP ---------- */
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code.");
      if (data.devOtp) setDevOtpHint(data.devOtp);
      setSuccessMsg("A fresh 6-digit verification code has been dispatched to your email.");
      setResendCooldown(60);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Login ---------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password)
      return setErrorMsg("Please enter your email and password.");

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsVerification) {
          setPendingEmail(data.email || email.trim());
          if (data.devOtp) setDevOtpHint(data.devOtp);
          setErrorMsg(data.error);
          setResendCooldown(60);
          setOtpCode(["", "", "", "", "", ""]);
          setMode("verify");
          return;
        }
        throw new Error(data.error || "Login failed.");
      }
      localStorage.setItem("ccna_auth_token", data.token);
      localStorage.setItem("ccna_auth_user", JSON.stringify(data.user));
      try {
        const flowAuth = {
          userId: data.user.id,
          token: data.token,
          sessionToken: data.token,
          email: data.user.email,
          userName: data.user.name,
          userPlan: data.user.plan || "pro",
          creditsLeft: 999,
          daysRemaining: 30,
          planExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          apiBase: window.location.origin,
        };
        localStorage.setItem("__flow_auth__", JSON.stringify(flowAuth));
        localStorage.setItem("flow_token", data.token);
        window.dispatchEvent(new CustomEvent("__bf_auth_ready__", { detail: flowAuth }));
      } catch (_) {}
      onAuthSuccess && onAuthSuccess(data.user, data.token);
      setSuccessMsg("Welcome back! Login successful.");
      setTimeout(() => onClose && onClose(), 800);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Forgot Password ---------- */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) return setErrorMsg("Please enter your account email address.");

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request password reset.");
      setPendingEmail(email.trim());
      if (data.devOtp) setDevOtpHint(data.devOtp);
      setSuccessMsg(data.message || "Reset code sent to your email.");
      setOtpCode(["", "", "", "", "", ""]);
      setPassword("");
      setConfirmPassword("");
      setMode("reset");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Reset Password ---------- */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    const code = otpCode.join("").trim();
    if (code.length !== 6) return setErrorMsg("Please enter the 6-digit reset code.");
    if (password.length < 6) return setErrorMsg("New password must be at least 6 characters long.");
    if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");
      setSuccessMsg(data.message || "Password reset successful! Please log in.");
      setTimeout(() => {
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        clearMessages();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pageTitle =
    mode === "login"   ? "ToolsByDcx Sign In"        :
    mode === "signup"  ? "Create ToolsByDcx Account"  :
    mode === "verify"  ? "Verify Email Address"       :
    mode === "forgot"  ? "Recover Account"            :
                         "Set New Password";

  return (
    <div className="auth-page-root">
      <div className="auth-page-container">
        {/* Top Header / Navigation Bar */}
        <div className="auth-page-header-bar">
          {onClose ? (
            <button type="button" className="auth-nav-back-pill" onClick={onClose}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to Home</span>
            </button>
          ) : <div />}

          <div className="auth-brand-badge">
            <div className="auth-brand-icon-mini" style={{ color: "#22c55e" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="auth-brand-text">
              <span className="auth-brand-title-main">ToolsByDcx</span>
              <span className="auth-brand-subtitle-mini" style={{ color: "#4ade80" }}>Access Platform</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="auth-page-card">
          <div className="auth-card-header">
            <h2 className="auth-page-title">{pageTitle}</h2>
            <p className="auth-page-desc">
              {mode === "login" && "Sign in to access your premium tools."}
              {mode === "signup" && "Create an account to start accessing your tools."}
              {mode === "verify" && "Enter verification code to activate your account."}
              {mode === "forgot" && "Enter your email to receive a password reset code."}
              {mode === "reset" && "Set a new password for your ToolsByDcx account."}
            </p>
          </div>


          {/* Alerts */}
          {errorMsg && (
            <div className="auth-alert auth-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="auth-alert auth-alert-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Dev OTP hint */}
          {devOtpHint && (
            <div className="auth-dev-otp-hint">
              <strong>Dev OTP:</strong> {devOtpHint}
            </div>
          )}

          {/* ===== LOGIN FORM ===== */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field-group">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrapper">
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="user@toolsbydcx.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <div className="auth-label-flex">
                  <label className="auth-label">Password</label>
                  <button type="button" className="link-forgot-pw" onClick={() => { setMode("forgot"); clearMessages(); }}>
                    Forgot password?
                  </button>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input auth-input-with-eye"
                    placeholder="Enter your password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <EyeToggleBtn show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                </div>
              </div>

              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In to ToolsByDcx →"}
              </button>

              <div className="auth-footer-prompt" style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', textAlign: 'center', marginTop: '16px' }}>
                <span>Registration is managed by administrators and authorized resellers.</span>
              </div>
            </form>
          )}

          {/* ===== VERIFY OTP ===== */}
          {mode === "verify" && (
            <form onSubmit={handleVerifyEmail} className="auth-form">
              <p className="auth-otp-instruction">
                Enter the 6-digit code sent to <strong>{pendingEmail}</strong>
              </p>

              <div className="otp-box-row">
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-digit-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                  />
                ))}
              </div>

              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Verifying..." : "Verify Email Address →"}
              </button>

              <div className="auth-footer-prompt">
                <button type="button" className="link-auth-switch" onClick={handleResendCode} disabled={resendCooldown > 0}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
                </button>
              </div>
            </form>
          )}

          {/* ===== FORGOT PASSWORD ===== */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <p className="auth-otp-instruction">
                Enter your account email to receive a password reset code.
              </p>
              <div className="auth-field-group">
                <label className="auth-label">Account Email</label>
                <div className="auth-input-wrapper">
                  <input type="email" className="auth-input" placeholder="user@toolsbydcx.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Sending Reset Code..." : "Send Reset Code →"}
              </button>
              <div className="auth-footer-prompt">
                <span>Remembered your password?</span>
                <button type="button" className="link-auth-switch" onClick={() => { setMode("login"); clearMessages(); }}>
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ===== RESET PASSWORD ===== */}
          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <p className="auth-otp-instruction">
                Enter the 6-digit reset code sent to <strong>{pendingEmail}</strong>, then set your new password.
              </p>

              <div className="otp-box-row">
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-digit-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                  />
                ))}
              </div>

              <div className="auth-field-group">
                <label className="auth-label">New Password</label>
                <div className="auth-input-wrapper">
                  <input type={showPassword ? "text" : "password"} className="auth-input auth-input-with-eye" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <EyeToggleBtn show={showPassword} onToggle={() => setShowPassword((p) => !p)} />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <input type={showConfirmPassword ? "text" : "password"} className="auth-input auth-input-with-eye" placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <EyeToggleBtn show={showConfirmPassword} onToggle={() => setShowConfirmPassword((p) => !p)} />
                </div>
              </div>

              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Resetting Password..." : "Reset Password →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthView;
