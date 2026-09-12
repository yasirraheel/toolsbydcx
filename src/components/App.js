import React, { useEffect, useState } from "react";
import AuthModal from "./AuthModal";
import AuthView from "./AuthView";
import ExtensionRemoved from "./ExtensionRemoved";
import LandingPage from "./Landing/LandingPage";
import AdminLayout from "./Admin/AdminLayout";
import ResellerLayout from "./Reseller/ResellerLayout";
import UserLayout from "./UserPanel/UserLayout";

import { API_BASE as API_BASE_URL } from "../apiConfig";

function getPermittedView(requestedView, user) {
  if (requestedView === "auth-login" || requestedView === "login") {
    if (user) {
      if (user.role === "admin") return "admin";
      if (user.role === "reseller") return "reseller";
      return "user-panel";
    }
    return "auth-login";
  }
  if (requestedView === "admin") {
    if (!user) return "auth-login";
    return user.role === "admin" ? "admin" : "dashboard";
  }
  if (requestedView === "reseller") {
    if (!user) return "auth-login";
    return (user.role === "reseller" || user.role === "admin") ? "reseller" : "dashboard";
  }
  if (requestedView === "user-panel") {
    if (!user) return "auth-login";
    return "user-panel";
  }
  if (requestedView === "extension-removed") {
    return "extension-removed";
  }
  return requestedView;
}

function getViewFromUrl() {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const search = new URLSearchParams(window.location.search);
  const viewParam = search.get("view");
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");

  if (path === "/extension-removed" || path === "/removed" || viewParam === "extension-removed" || viewParam === "removed" || hash === "extension-removed" || hash === "removed") {
    return "extension-removed";
  }

  if (path === "/admin" || path.startsWith("/admin/") || viewParam === "admin" || hash.startsWith("admin")) {
    return "admin";
  }
  if (path === "/reseller" || path.startsWith("/reseller/") || viewParam === "reseller" || hash.startsWith("reseller")) {
    return "reseller";
  }
  if (path === "/user" || path.startsWith("/user/") || path === "/my-tools" || path === "/tools" || viewParam === "user" || viewParam === "user-panel" || hash.startsWith("user")) {
    return "user-panel";
  }
  if (path === "/login" || viewParam === "login" || hash === "login" || path === "/signup" || viewParam === "signup" || hash === "signup") {
    return "auth-login";
  }
  if (path === "/verify" || viewParam === "verify" || hash === "verify") {
    return "auth-verify";
  }
  if (path === "/forgot-password" || path === "/forgot" || viewParam === "forgot" || hash === "forgot") {
    return "auth-forgot";
  }
  if (path === "/reset-password" || path === "/reset" || viewParam === "reset" || hash === "reset") {
    return "auth-reset";
  }
  return "dashboard";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("ccna_auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    const raw = getViewFromUrl();
    const stored = (() => {
      try {
        const s = localStorage.getItem("ccna_auth_user");
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    })();
    return getPermittedView(raw, stored);
  });

  const [authModal, setAuthModal] = useState({
    isOpen: false,
    mode: "login",
    errorMsg: "",
  });

  const handleNavigate = (requestedView, overrideUser) => {
    const activeUser = overrideUser !== undefined ? overrideUser : currentUser;
    const view = getPermittedView(requestedView, activeUser);
    setCurrentView(view);
    let targetUrl = "/";
    if (view === "admin") {
      targetUrl = "/admin";
    } else if (view === "reseller") {
      targetUrl = "/reseller";
    } else if (view === "user-panel") {
      targetUrl = "/user";
    } else if (view === "auth-login") {
      targetUrl = "/login";
    } else if (view === "auth-verify") {
      targetUrl = "/verify";
    } else if (view === "auth-forgot") {
      targetUrl = "/forgot-password";
    } else if (view === "auth-reset") {
      targetUrl = "/reset-password";
    } else if (view === "extension-removed") {
      targetUrl = "/extension-removed";
    } else {
      targetUrl = "/";
    }
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ view }, "", targetUrl);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const raw = getViewFromUrl();
      const permitted = getPermittedView(raw, currentUser);
      setCurrentView(permitted);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const permitted = getPermittedView(currentView, currentUser);
      if (permitted !== currentView) {
        handleNavigate(permitted, currentUser);
      }
    } else {
      if (currentView === "admin" || currentView === "reseller" || currentView === "user-panel") {
        handleNavigate("auth-login", null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const syncExtensionAuth = (user, token) => {
    if (!user || !token) return;
    const flowAuth = {
      userId: user.id,
      token: token,
      sessionToken: token,
      email: user.email,
      userName: user.name,
      userPlan: user.plan || "pro",
      creditsLeft: user.credits !== undefined ? user.credits : 999,
      daysRemaining: 30,
      planExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      apiBase: window.location.origin,
    };
    try {
      localStorage.setItem("__flow_auth__", JSON.stringify(flowAuth));
      localStorage.setItem("flow_token", token);
      window.dispatchEvent(new CustomEvent("__bf_auth_ready__", { detail: flowAuth }));
    } catch (_) {}
  };

  const clearExtensionAuth = () => {
    try {
      localStorage.removeItem("__flow_auth__");
      localStorage.removeItem("flow_token");
      window.dispatchEvent(new CustomEvent("__bf_logout__"));
    } catch (_) {}
  };

  const handleLogout = (reason) => {
    setCurrentUser(null);
    localStorage.removeItem("ccna_auth_token");
    localStorage.removeItem("ccna_auth_user");
    clearExtensionAuth();
    handleNavigate("dashboard", null);
    if (reason && typeof reason === "string") {
      setAuthModal({
        isOpen: true,
        mode: "login",
        errorMsg: reason,
      });
    }
  };

  useEffect(() => {
    const handleExpired = (e) => {
      const reason = e?.detail?.reason || "Your session has expired or permissions were revoked. Please log in again.";
      handleLogout(reason);
    };
    window.addEventListener("auth_session_expired", handleExpired);
    return () => window.removeEventListener("auth_session_expired", handleExpired);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ccna_auth_token");
    if (token) {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Session invalid");
          }
          return res.json();
        })
        .then((data) => {
          if (data.user && data.user.role) {
            setCurrentUser(data.user);
            localStorage.setItem("ccna_auth_user", JSON.stringify(data.user));
            syncExtensionAuth(data.user, token);
          } else {
            handleLogout("Your session has expired or account is no longer authorized. Please sign in again.");
          }
        })
        .catch(() => {
          handleLogout("Your session has expired or account is no longer authorized. Please sign in again.");
        });
    } else {
      const stored = localStorage.getItem("ccna_auth_user");
      if (stored || currentUser) {
        handleLogout("Session expired. Please sign in to continue.");
      }
    }
  }, []);

  const handleOpenAuth = (mode = "login") => {
    const safeMode = mode === "signup" ? "login" : mode;
    setAuthModal({ isOpen: true, mode: safeMode, errorMsg: "" });
  };

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    if (token) {
      localStorage.setItem("ccna_auth_token", token);
      syncExtensionAuth(user, token);
    }
    setAuthModal({ isOpen: false, mode: "login", errorMsg: "" });

    if (user.role === "admin") {
      handleNavigate("admin", user);
    } else if (user.role === "reseller") {
      handleNavigate("reseller", user);
    } else {
      handleNavigate("user-panel", user);
    }
  };

  if (currentView === "admin") {
    if (currentUser?.role === "admin") {
      return (
        <AdminLayout
          currentUser={currentUser}
          onExitAdmin={() => handleNavigate("dashboard")}
          onSwitchPortal={(portal) => handleNavigate(portal)}
          onLogout={handleLogout}
        />
      );
    }
  }

  if (currentView === "reseller") {
    if (currentUser?.role === "reseller" || currentUser?.role === "admin") {
      return (
        <ResellerLayout
          currentUser={currentUser}
          onExitReseller={() => handleNavigate("dashboard")}
          onSwitchPortal={(portal) => handleNavigate(portal)}
          onLogout={handleLogout}
        />
      );
    }
  }

  if (currentView === "user-panel") {
    if (currentUser) {
      return (
        <UserLayout
          currentUser={currentUser}
          onExitUserPanel={() => handleNavigate("dashboard")}
          onSwitchPortal={(portal) => handleNavigate(portal)}
          onLogout={handleLogout}
        />
      );
    }
  }

  if (currentView === "extension-removed") {
    return <ExtensionRemoved onNavigate={handleNavigate} />;
  }

  if (currentView.startsWith("auth-")) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", margin: 0, padding: 0, overflowX: "clip", background: "#090d16" }}>
        <AuthView
          initialMode={currentView.replace("auth-", "")}
          onAuthSuccess={handleAuthSuccess}
          onClose={() => handleNavigate("dashboard")}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", margin: 0, padding: 0, overflowX: "clip", background: "#090d16" }}>
      <LandingPage
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        initialError={authModal.errorMsg}
        onClose={() => setAuthModal({ isOpen: false, mode: "login", errorMsg: "" })}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}
