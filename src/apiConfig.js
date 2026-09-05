export const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location && window.location.port === "3000") {
    return "http://localhost:5000/api";
  }
  return "/api";
};

export const API_BASE = getApiBase();
export const API_AUTH_BASE = `${API_BASE}/auth`;
export default API_BASE;
