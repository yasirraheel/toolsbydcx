// ToolsByDcx — Disconnect & Removal Watchdog (ISOLATED World)
(function () {
  "use strict";

  var HEARTBEAT_TYPE = "BF_EXTENSION_HEARTBEAT";
  var isPurged = false;
  var port = null;

  function nukeFlowAndRedirect() {
    if (isPurged) return;
    isPurged = true;
    console.warn("[ToolsByDcx] Extension removed on Flow tab! Nuking session...");

    try {
      window.postMessage({ type: "BF_EXTENSION_DISCONNECTED", reason: "gone", timestamp: Date.now() }, "*");
    } catch (_) {}

    try {
      var paths = ["/", "/fx", "/fx/tools", "/fx/tools/flow", "/fx/api", "/fx/api/auth"];
      var domains = ["", ".labs.google", "labs.google", ".flow.google.com", "flow.google.com", ".google.com", "google.com"];
      var names = (document.cookie || "").split(";").map(function(c){ return (c.split("=")[0]||"").trim(); }).filter(Boolean);
      for (var n = 0; n < names.length; n++) {
        for (var p = 0; p < paths.length; p++) {
          for (var d = 0; d < domains.length; d++) {
            var s = names[n] + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + paths[p];
            if (domains[d]) s += "; domain=" + domains[d];
            try { document.cookie = s; } catch(_) {}
            try { document.cookie = s + "; Secure"; } catch(_) {}
          }
        }
      }
    } catch(_) {}

    try { localStorage.clear(); } catch(_) {}
    try { sessionStorage.clear(); } catch(_) {}

    setTimeout(function() {
      try { window.location.replace("https://toolsbydcx.com/extension-removed?cleared=1"); } catch(_) { window.location.href = "about:blank"; }
    }, 300);
  }

  function initPort() {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        nukeFlowAndRedirect();
        return;
      }
      port = chrome.runtime.connect({ name: "dcx_flow_watchdog" });
      port.onDisconnect.addListener(function() {
        nukeFlowAndRedirect();
      });
    } catch (_) {
      nukeFlowAndRedirect();
    }
  }
  initPort();

  function beat() {
    if (isPurged) return;
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        nukeFlowAndRedirect();
        return;
      }
      chrome.runtime.sendMessage({ type: "PING" }, function() {
        if (chrome.runtime.lastError) {
          var m = (chrome.runtime.lastError.message || "").toLowerCase();
          if (m.includes("invalidated") || m.includes("not found") || m.includes("closed") || m.includes("deleted")) {
            nukeFlowAndRedirect();
          }
        }
      });
    } catch (_error) {
      nukeFlowAndRedirect();
    }
  }

  beat();
  setInterval(beat, 250);
  window.addEventListener("focus", beat);
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") beat();
  });
})();
