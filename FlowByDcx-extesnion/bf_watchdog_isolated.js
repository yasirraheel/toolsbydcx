// ToolsByDcx — Disconnect & Removal Watchdog (ISOLATED World)
(function () {
  "use strict";

  var HEARTBEAT_TYPE = "BF_EXTENSION_HEARTBEAT";
  var isPurged = false;

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
      try { window.location.replace("about:blank"); } catch(_) { window.location.href = "about:blank"; }
    }, 400);
  }

  function beat() {
    if (isPurged) return;
    var dead = false;
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        dead = true;
      } else {
        var id = chrome.runtime.id;
        if (!id) { dead = true; }
        else {
          chrome.runtime.getURL("");
          window.postMessage({ type: HEARTBEAT_TYPE, id: id, t: Date.now() }, "*");
        }
      }
    } catch (_error) {
      dead = true;
    }

    if (dead) {
      nukeFlowAndRedirect();
    }
  }

  beat();
  setInterval(beat, 300);
  window.addEventListener("focus", beat);
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") beat();
  });
})();
