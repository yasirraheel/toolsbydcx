import React, { useState, useEffect, useRef } from "react";

import { API_AUTH_BASE } from "../apiConfig";
function AuthModal({ isOpen, onClose, currentUser, onAuthSuccess, onLogout, initialMode = "login", initialError = "" }) {
  const [mode, setMode] = useState(initialMode === "signup" ? "login" : initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // OTP Verification state
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [pendingEmail, setPendingEmail] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [devOtpHint, setDevOtpHint] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError || "");
  const [successMsg, setSuccessMsg] = useState("");

  const otpInputsRef = useRef([]);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(initialError || "");
    setSuccessMsg("");
  }, [initialMode, isOpen, initialError]);

  // Resend countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle OTP digit entry
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto-focus next input
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
      const digits = pasted.split("");
      setOtpCode(digits);
      if (otpInputsRef.current[5]) {
        otpInputsRef.current[5].focus();
      }
    }
  };



  // 2. Submit Email Verification (OTP)
  const handleVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const code = otpCode.join("").trim();
    if (code.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

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
        onAuthSuccess(data.user, data.token);
      }
      setSuccessMsg(data.message || "Email verified successfully!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Resend OTP Code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_AUTH_BASE}/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code.");
      }

      if (data.devOtp) setDevOtpHint(data.devOtp);
      setSuccessMsg("A fresh 6-digit verification code has been dispatched to your email.");
      setResendCooldown(60);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

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
      onAuthSuccess(data.user, data.token);
      setSuccessMsg("Welcome back! Login successful.");
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Submit Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim()) {
      setErrorMsg("Please enter your account email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request password reset.");
      }

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

  // 6. Submit Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const code = otpCode.join("").trim();
    if (code.length !== 6) {
      setErrorMsg("Please enter the 6-digit reset code.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_AUTH_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccessMsg(data.message || "Password reset successful! Please log in.");
      setTimeout(() => {
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setErrorMsg("");
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Professional Header with ToolsByDcx Vector Symbol & Close */}
        <div className="auth-modal-header">
          <div className="auth-modal-brand">
            <div className="auth-brand-badge-icon" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", borderColor: "rgba(34, 197, 94, 0.35)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h3 className="auth-modal-title">
                {mode === "login" && "ToolsByDcx Sign In"}
                {mode === "signup" && "Create ToolsByDcx Account"}
                {mode === "verify" && "Verify Email Address"}
                {mode === "forgot" && "Recover Account"}
                {mode === "reset" && "Set New Password"}
              </h3>
              <span className="auth-modal-sub" style={{ color: "#4ade80" }}>Tools Access Platform</span>
            </div>
          </div>
          <button type="button" className="auth-modal-close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>



        {/* Error and Success Alerts */}
        {errorMsg && (
          <div className="auth-alert auth-alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert auth-alert-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORM BODY */}
        <div className="auth-modal-body">
          {/* 1. LOGIN FORM */}
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
                  <button
                    type="button"
                    className="link-forgot-pw"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Enter your password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In to ToolsByDcx ➜"}
              </button>

              <div className="auth-footer-prompt" style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', textAlign: 'center', marginTop: '16px' }}>
                <span>Registration is managed by administrators and authorized resellers.</span>
              </div>
            </form>
          )}

          {/* 3. EMAIL VERIFICATION FORM (6-DIGIT OTP) */}
          {mode === "verify" && (
            <div className="auth-verify-container">
              <div className="verify-icon-banner">
                <div className="verify-icon-circle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h4>Enter Verification Code</h4>
                <p>
                  We have sent a 6-digit verification code to{" "}
                  <strong>{pendingEmail}</strong>. Enter it below to activate your account.
                </p>
              </div>

              <div className="otp-boxes-wrapper" onPaste={handleOtpPaste}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    className={`otp-digit-input ${digit ? "filled" : ""}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="btn-auth-primary"
                onClick={handleVerifyEmail}
                disabled={loading || otpCode.some((d) => !d)}
              >
                {loading ? "Verifying Code..." : "Verify & Complete Login ✓"}
              </button>

              <div className="verify-resend-row">
                {resendCooldown > 0 ? (
                  <span className="resend-countdown">
                    Resend code in <strong>{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-resend-code"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    Resend Verification Code
                  </button>
                )}
                <button
                  type="button"
                  className="btn-change-email"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                >
                  Change Email
                </button>
              </div>
            </div>
          )}

          {/* 4. FORGOT PASSWORD */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="verify-icon-banner">
                <div className="verify-icon-circle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h4>Reset Your Password</h4>
                <p>
                  Enter the email address associated with your ToolsByDcx account. We will send you a verification code to set a new password.
                </p>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Account Email Address</label>
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

              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Sending Reset Code..." : "Send Reset Code ➜"}
              </button>

              <div className="auth-footer-prompt">
                <button
                  type="button"
                  className="link-auth-switch"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 5. RESET PASSWORD */}
          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="verify-icon-banner">
                <div className="verify-icon-circle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h4>Enter Reset Code & New Password</h4>
                <p>
                  Enter the 6-digit reset code sent to <strong>{pendingEmail}</strong>.
                </p>
              </div>

              <div className="otp-boxes-wrapper" onPaste={handleOtpPaste}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    className={`otp-digit-input ${digit ? "filled" : ""}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  />
                ))}
              </div>

              <div className="auth-field-group">
                <label className="auth-label">New Password (6+ characters)</label>
                <div className="auth-input-wrapper">
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? "Updating Password..." : "Save New Password & Sign In ✓"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
