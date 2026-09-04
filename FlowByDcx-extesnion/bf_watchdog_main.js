// BunnyFlow — disconnect watchdog (MAIN world, runs inside the Flow page)
//
// v41.8 REWRITE — matches the PROVEN flowcreatorai reference (persistent_lock.js).
//
// ROOT CAUSE of every earlier failure: a previous build assumed a MAIN-world
// content script cannot read chrome.* APIs, so it detected removal indirectly
// via an isolated-world heartbeat bridge + a multi-second grace. Under real
// removal that never fired (the isolated context dies before it can signal, and
// the grace outlived the page context). The reference proves the correct fact:
// a `world:"MAIN"` content script CAN read `chrome.runtime.id` directly — while
// the extension is installed it is a truthy id, and the instant the extension
// is removed/disabled it becomes falsy. (If MAIN world couldn't read it, the
// reference would sign out on every page load — it doesn't.)
//
// So: poll chrome.runtime.id here every ~350ms and, the moment it is gone,
// HARD LOCK OUT immediately — wipe cookies, fire a keepalive/beacon signout
// (kills the HttpOnly session server-side), and navigate to about:blank so the
// running page dies and the account cannot keep being used. Every open Flow tab
// runs its own copy, so all of them lock out together.
//
// A tiny 2-tick confirm (~700ms) absorbs the momentary blip of an extension
// UPDATE (id briefly unreadable until the new version rebinds) so an update
// doesn't false-log-out. Heartbeat silence is kept only as a fallback for the
// (unexpected) case where chrome.runtime.id is never readable in MAIN world.
(function () {
  "use strict";

  var HEARTBEAT_TYPE = "BF_EXTENSION_HEARTBEAT";
  var SIGN_OUT_URL = "https://labs.google/fx/api/auth/signout";
  var FLOW_URL = "https://labs.google/fx/tools/flow";

  var POLL_MS = 350;
  var CONFIRM_TICKS = 2;      // consecutive "gone" polls before acting (~700ms)
  var HB_SILENCE_MS = 2000;   // fallback path only

  var logoutStarted = false;
  var sawRuntimeId = false;   // becomes true once we confirm MAIN can read the id
  var goneStreak = 0;
  var lastHeartbeat = 0;
  var armedHb = false;

  function runtimeAlive() {
    try {
      return !!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
    } catch (_error) {
      return false;
    }
  }

  // Fallback signal: isolated watchdog posts a heartbeat every 500ms. Used only
  // if chrome.runtime.id turns out to be unreadable in MAIN world.
  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;
    if (event.data.type !== HEARTBEAT_TYPE || !event.data.id) return;
    armedHb = true;
    lastHeartbeat = Date.now();
    // A live signal proves the extension is back — release stuck latches so the
    // Flow page / "Extension Not Connected" overlay auto-recovers.
    try {
      if (localStorage.getItem("__bf_extension_disconnected__") === "1") {
        localStorage.removeItem("__bf_extension_disconnected__");
      }
      if (localStorage.getItem("__flow_ext_disconnected__") === "1") {
        localStorage.setItem("__flow_ext_disconnected__", "0");
      }
    } catch (_error) {}
  });

  // ── Comprehensive cookie nuke (JS-reachable cookies) ───────────────────────
  function nukeCookies() {
    var names = [
      "__Secure-next-auth.session-token",
      "__Secure-next-auth.session-token.0",
      "__Secure-next-auth.session-token.1",
      "__Secure-next-auth.callback-url",
      "next-auth.callback-url",
      "__Host-next-auth.csrf-token",
      "__Secure-next-auth.csrf-token",
      "next-auth.csrf-token",
      "SID", "HSID", "SSID", "APISID", "SAPISID",
      "__Secure-1PSID", "__Secure-3PSID",
      "__Secure-1PAPISID", "__Secure-3PAPISID",
      "__Secure-1PSIDTS", "__Secure-3PSIDTS"
    ];
    try {
      (document.cookie || "").split(";").forEach(function (part) {
        var eq = part.indexOf("=");
        var n = (eq >= 0 ? part.slice(0, eq) : part).trim();
        if (n && names.indexOf(n) === -1) names.push(n);
      });
    } catch (_error) {}

    var domains = ["", ".labs.google", "labs.google", ".google", ".google.com", "google.com"];
    var paths = ["/", "/fx", "/fx/api", "/fx/api/auth", "/fx/tools", "/fx/tools/flow"];
    var expired = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0";

    for (var i = 0; i < names.length; i++) {
      for (var p = 0; p < paths.length; p++) {
        for (var d = 0; d < domains.length; d++) {
          var base = names[i] + expired + "; path=" + paths[p];
          if (domains[d]) base += "; domain=" + domains[d];
          try { document.cookie = base; } catch (_e1) {}
          try { document.cookie = base + "; Secure"; } catch (_e2) {}
          try { document.cookie = base + "; SameSite=Lax"; } catch (_e3) {}
        }
      }
    }
  }

  function clearPageStores() {
    try { sessionStorage.clear(); } catch (_error) {}
    try { localStorage.setItem("__bf_extension_disconnected__", "1"); } catch (_error) {}
    try { localStorage.setItem("__flow_ext_disconnected__", "1"); } catch (_error) {}
  }

  function readCsrfToken() {
    try {
      var csrfNames = [
        "__Host-next-auth.csrf-token",
        "__Secure-next-auth.csrf-token",
        "next-auth.csrf-token"
      ];
      var parts = (document.cookie || "").split(";");
      for (var i = 0; i < parts.length; i++) {
        var eq = parts[i].indexOf("=");
        if (eq < 0) continue;
        var name = parts[i].slice(0, eq).trim();
        if (csrfNames.indexOf(name) === -1) continue;
        var value = decodeURIComponent(parts[i].slice(eq + 1));
        return value.split("|")[0] || value;
      }
    } catch (_error) {}
    return "";
  }

  // Real NextAuth signout that SURVIVES the about:blank navigation below:
  //  * fetch(keepalive:true) — request + its Set-Cookie response (which expires
  //    the HttpOnly session) complete even after the page unloads.
  //  * sendBeacon — guaranteed to be sent during unload; belt-and-suspenders.
  function fireSignOut(csrfToken) {
    var body = "csrfToken=" + encodeURIComponent(csrfToken) +
               "&callbackUrl=" + encodeURIComponent(FLOW_URL) + "&json=true";
    try {
      fetch(SIGN_OUT_URL, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
      }).catch(function () {});
    } catch (_e1) {}
    try {
      var blob = new Blob([body], { type: "application/x-www-form-urlencoded" });
      navigator.sendBeacon(SIGN_OUT_URL, blob);
    } catch (_e2) {}
  }

  function forceFlowLogout() {
    if (logoutStarted) return;
    logoutStarted = true;

    // 1) Capture the CSRF token BEFORE wiping cookies — nukeCookies() deletes
    //    the csrf-token cookie too, so reading after the nuke yields "" and the
    //    server-side signout would be skipped.
    var csrfToken = readCsrfToken();

    // 2) Fire the server-side signout (drops the HttpOnly session) so a reopen
    //    also fails — sent via keepalive/beacon so it survives the navigation.
    if (csrfToken) fireSignOut(csrfToken);

    // 3) Wipe every JS-reachable cookie + storage.
    nukeCookies();
    clearPageStores();

    // 3) One more nuke, then destroy the running page — straight to about:blank.
    nukeCookies();
    try { window.location.replace("about:blank"); }
    catch (_error) {
      try { window.location.href = "about:blank"; } catch (_e) {}
    }
  }

  function tick() {
    if (logoutStarted) return;

    if (runtimeAlive()) {
      sawRuntimeId = true;
      goneStreak = 0;
      return;
    }

    // chrome.runtime.id is not readable right now.
    if (sawRuntimeId) {
      // Primary path: we KNOW MAIN can read it and it was there before, so it
      // being gone means the extension was removed/disabled. Confirm briefly to
      // ride out an update blip, then hard lock out.
      goneStreak++;
      if (goneStreak >= CONFIRM_TICKS) forceFlowLogout();
      return;
    }

    // Fallback: chrome.runtime.id was never readable in MAIN world. Rely on the
    // isolated-world heartbeat going silent instead.
    if (armedHb && Date.now() - lastHeartbeat > HB_SILENCE_MS) {
      forceFlowLogout();
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") tick();
  });

  tick();
  window.setInterval(tick, POLL_MS);
})();
