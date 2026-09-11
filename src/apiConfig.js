export const getApiBase = () => {
  if (typeof window !== "undefined" && window.location) {
    const host = (window.location.hostname || "").toLowerCase();
    const port = window.location.port || "";
    // On production domain toolsbydcx.com or standard web ports: ALWAYS use /api
    if (host === "toolsbydcx.com" || host === "www.toolsbydcx.com" || (port !== "3000" && port !== "5000")) {
      return "/api";
    }
    if (port === "3000") {
      return "http://localhost:5000/api";
    }
  }
  return "/api";
};

export const API_BASE = getApiBase();
export const API_AUTH_BASE = `${API_BASE}/auth`;

export const handleAuthError = (res, data) => {
  const status = res ? res.status : 0;
  const isUnauthorized = status === 401 || status === 403;
  const errorMsg = (data && (data.error || data.message)) || "";
  const isAuthMsg =
    /access denied/i.test(errorMsg) ||
    /admin access required/i.test(errorMsg) ||
    /administrator privileges required/i.test(errorMsg) ||
    /session expired/i.test(errorMsg) ||
    /invalid token/i.test(errorMsg) ||
    /unauthorized/i.test(errorMsg) ||
    /not authorized/i.test(errorMsg);

  if (isUnauthorized || isAuthMsg) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ccna_auth_token");
        localStorage.removeItem("ccna_auth_user");
        localStorage.removeItem("flow_token");
        localStorage.removeItem("__flow_auth__");
      } catch (_) {}

      window.dispatchEvent(
        new CustomEvent("auth_session_expired", {
          detail: {
            reason: errorMsg || "Your session has expired or permissions were revoked. Please log in again."
          }
        })
      );
    }
    return true;
  }
  return false;
};

export const authFetch = async (url, options = {}) => {
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ccna_auth_token") || localStorage.getItem("flow_token") || ""
      : "";
  const headers = Object.assign({}, options.headers || {});
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (token && !headers["x-auth-token"]) {
    headers["x-auth-token"] = token;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    let errorData = null;
    try {
      const clone = res.clone();
      errorData = await clone.json();
    } catch (_) {}
    handleAuthError(res, errorData);
  }

  return res;
};

export default API_BASE;

