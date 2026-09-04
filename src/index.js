import React from "react";
import ReactDOM from "react-dom/client";

import App from "./components/App";
import { DialogProvider } from "./context/DialogContext";
import "./index.css";

// Strict domain lock: Execution is restricted strictly to toolsbydcx.com
// (Local development on localhost / 127.0.0.1 is permitted)
const hostname = (window.location.hostname || "").toLowerCase();
const isAllowedDomain =
  hostname === "toolsbydcx.com" ||
  hostname === "www.toolsbydcx.com" ||
  hostname === "localhost" ||
  hostname === "127.0.0.1";

if (!isAllowedDomain) {
  document.body.innerHTML = `
    <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#090d16;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;">
      <div style="max-width:500px;background:#111827;padding:36px;border-radius:16px;border:1px solid #ef4444;box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);">
        <div style="font-size:52px;margin-bottom:16px;">🔒</div>
        <h1 style="font-size:22px;font-weight:700;color:#ef4444;margin:0 0 12px 0;">License & Domain Lock Notice</h1>
        <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 20px 0;">
          This application build is strictly licensed and restricted to operate exclusively on <strong>toolsbydcx.com</strong>.
          Execution on <code>${hostname}</code> has been blocked.
        </p>
        <div style="padding:10px 14px;background:#1e293b;border-radius:8px;font-size:12px;color:#64748b;">
          Unauthorized copy or deployment outside of toolsbydcx.com is strictly prohibited.
        </div>
      </div>
    </div>
  `;
  throw new Error("Domain validation failed: build restricted to toolsbydcx.com");
}

// React v18
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>
);
