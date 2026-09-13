/* ═════════════════════════════════════════════════════════════════════════
 * FlowByDcx Background Service Worker:
 *   1. AUTO-CONNECT     — handle SITE_AUTH from site_bridge.js
 *   2. UNINSTALL HOOK   — set uninstall URL
 *   3. WATCHDOG PING    — respond to watchdog ping
 *   4. PORTAL SYNC      — popup can ping portal tabs to re-emit auth
 * ═════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var BF_DEFAULT_SERVER = 'https://toolsbydcx.com';

  // ── Set uninstall URL (so Chrome opens extension-removed page on remove) ──
  function _bfEnsureUninstallURL() {
    try { chrome.runtime.setUninstallURL(BF_DEFAULT_SERVER + '/extension-removed?cleared=1'); } catch(_) {}
  }
  try { chrome.runtime.onInstalled.addListener(_bfEnsureUninstallURL); } catch(_) {}
  _bfEnsureUninstallURL();

  // ── Suppress harmless rejections ──
  try {
    self.addEventListener('unhandledrejection', function(e){
      try {
        var m = (e && e.reason && e.reason.message) ? e.reason.message : String(e.reason || '');
        if (m.indexOf('Invalid URL') !== -1 || m.indexOf('auto-signout') !== -1 || m.indexOf('No tab with id') !== -1 || m.indexOf('No window with id') !== -1 || m.indexOf('Tab was closed') !== -1 || m.indexOf('Failed to fetch') !== -1 || m.indexOf('NetworkError') !== -1 || m.indexOf('Load failed') !== -1) e.preventDefault();
      } catch(_) {}
    });
  } catch(_) {}

  // ═══════════════════════════════════════════════════════════════════════
  // BunnyFlow periodic guard tick (v1.5.2 — no cookie-TTL clamping)
  // A 1-minute alarm drives: (a) the 90s device-validity check (revoked device
  // → clear Flow cookies) and (b) the plan-expiry check (expired plan → clear
  // auth cookies). Cookies keep their NATURAL expiry — the old 15s clamp was
  // removed because it killed live sessions whenever Chrome suspended the MV3
  // service worker. Extension-removal cleanup is the page watchdog's job.
  // ═══════════════════════════════════════════════════════════════════════
  var BF_TTL_ALARM = 'bf_cookie_ttl_refresh';
  var BF_TTL_PERIOD_MIN = 1;       // 1-minute tick: device check + plan-expiry + cookie-lease renewal
  // Removal-cleanup lease. While the extension is INSTALLED, the 1-minute alarm
  // (which reliably wakes even a suspended MV3 service worker) renews the Flow
  // auth cookies to expire this many seconds in the future. The moment the
  // extension is uninstalled the alarm stops, nothing renews, and the cookies
  // expire on their own within the lease → Flow signs the user out even if no
  // Flow tab is open. The lease is LONG relative to the 1-min alarm (and to
  // Chrome's alarm throttling) so a live installed extension is NEVER falsely
  // signed out — the old 15-second lease driven by a 1-second setInterval was
  // the cause of the "kuch dair baad signout" loop (SW slept → interval stopped
  // → cookies hit 15s and died before the next wake). 10 min gives ~10x headroom.
  // v41: 10 min → 4 GHANTE. 10-min lease hi wo "auto refresh" bug tha: user
  // 5-15 min inactive (ya laptop sleep / SW dormant) → 1-min renewal alarm ruk
  // gaya → cookies 10 min par expire → Google ne khud signin par phenk diya.
  // Owner rule: kaam ke dauran KABHI auto-signout nahi. Uninstall-backstop ab
  // bhi hai (bina extension cookies zyada se zyada 4h mein khud mar jati hain;
  // Flow-tab-khula uninstall to watchdog foran pakarta hai).
  var BF_TTL_LEASE_SEC = 14400;    // 4 hours
  var BF_AUTH_COOKIE_NAMES = [
    // Google account cookies
    '__Secure-1PSID', '__Secure-3PSID',
    '__Secure-1PSIDTS', '__Secure-3PSIDTS',
    '__Secure-1PAPISID', '__Secure-3PAPISID',
    '__Secure-1PSIDCC', '__Secure-3PSIDCC',
    'SID', 'SAPISID', 'APISID', 'HSID', 'SSID', 'LSID',
    '__Host-GAPS', 'NID', 'OSID', '__Secure-OSID',
    'SIDCC',
    // NextAuth (Flow / labs.google) session cookies
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.callback-url',
    '__Host-next-auth.csrf-token',
    'next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
    '__Secure-next-auth.session-token.0',
    '__Secure-next-auth.session-token.1',
    // ChatGPT / OpenAI cookies
    'oai-did', 'oai-nav-state', '__Secure-oai-session', '_account', '_cfuvid', 'cf_clearance'
  ];
  var BF_AUTH_NAME_SET = new Set(BF_AUTH_COOKIE_NAMES);
  // Also match anything starting with these prefixes (covers chunked NextAuth cookies)
  var BF_AUTH_NAME_PREFIXES = ['__Secure-next-auth.', '__Host-next-auth.', 'next-auth.'];
  function bfIsAuthCookieName(name) {
    if (BF_AUTH_NAME_SET.has(name)) return true;
    for (var i = 0; i < BF_AUTH_NAME_PREFIXES.length; i++) {
      if (name.indexOf(BF_AUTH_NAME_PREFIXES[i]) === 0) return true;
    }
    return false;
  }
  var BF_TTL_DOMAINS = ['google.com', 'accounts.google.com', 'labs.google', 'flow.google.com', 'whisk.google.com', 'chatgpt.com', '.chatgpt.com', 'openai.com', '.openai.com', 'oaistatic.com'];

  // Plan expiry helper — true when user has no active plan
  function bfIsPlanExpired(d) {
    try {
      var days = d && d.extension2_days;
      if (typeof days === 'number' && days <= 0) return true;
      var exp = d && (d.extension2_expiry || d.planExpires);
      if (exp) {
        var t = (typeof exp === 'number') ? exp : Date.parse(exp);
        if (isFinite(t) && t > 0 && t < Date.now()) return true;
      }
    } catch(_) {}
    return false;
  }

  // Remove all admin/auth cookies (used when plan is expired)
  function bfClearAllAuthCookies() {
    if (!chrome.cookies || !chrome.cookies.getAll) return;
    BF_TTL_DOMAINS.forEach(function (domain) {
      chrome.cookies.getAll({ domain: domain }, function (cookies) {
        if (chrome.runtime.lastError || !cookies) return;
        cookies.forEach(function (c) {
          if (!bfIsAuthCookieName(c.name)) return;
          var protocol = c.secure ? 'https://' : 'http://';
          var host = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
          var url = protocol + host + (c.path || '/');
          try { chrome.cookies.remove({ url: url, name: c.name, storeId: c.storeId }); } catch(_) {}
        });
      });
    });
  }

  // ── Device-revoke guard ───────────────────────────────────────────────────
  // Every 90 s, ask the server whether our device session is still valid.
  // On device_session_revoked / forceSignout we clear ALL Flow + Google auth
  // cookies so the old device stops working in Flow immediately, even when
  // the BunnyFlow dashboard is closed and the user is working directly in Flow.
  var BF_DEVICE_CHECK_MS = 90000;
  var _bfLastDeviceCheckAt = 0;

  function bfClearAllFlowCookies() {
    try {
      var _flowUrls = ['https://flow.google.com', 'https://flow.google.com/about', 'https://flow.google.com/api', 'https://labs.google', 'https://labs.google/fx/tools/flow', 'https://labs.google/fx/api'];
      _flowUrls.forEach(function(_cu) {
        try {
          chrome.cookies.getAll({ url: _cu }, function(_ck) {
            if (_ck) _ck.forEach(function(_c) {
              try { chrome.cookies.remove({ url: _cu + (_c.path || '/'), name: _c.name }); } catch(e) {}
            });
          });
        } catch(e) {}
      });
    } catch(e) {}
    try { bfClearAllAuthCookies(); } catch(e) {}
  }


  // ── Silent token refresh (no login required) ─────────────────────────────
  // When the stored JWT has expired, call /api/auth/refresh-token.
  // The server accepts recently-expired tokens (up to 60-day grace) and
  // issues a fresh 90-day JWT. Stores the new token in chrome.storage.
  function bfSilentTokenRefresh(oldToken, callback) {
    try {
      fetch(BF_DEFAULT_SERVER + '/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + oldToken },
        body: JSON.stringify({ token: oldToken })
      }).then(function(r) {
        r.json().then(function(d) {
          if (d && d.ok && d.token) {
            try {
              chrome.storage.local.set({ token: d.token, sessionToken: d.token });
            } catch(_) {}
            if (callback) callback(d.token);
          } else {
            // v41.1: pehle failure par callback KABHI nahi chalta tha —
            // Switch ka 401-retry hamesha latak jata tha. Ab null milta hai.
            if (callback) callback(null);
          }
        }).catch(function() { if (callback) callback(null); });
      }).catch(function() { if (callback) callback(null); });
    } catch(_) { if (callback) callback(null); }
  }
  // v41.1: switch-account (top-level) ko bhi refresh chahiye — IIFE se bahar
  // export, warna wahan ReferenceError se 401 path hamesha 'auth' deta tha.
  try { self.bfSilentTokenRefresh = bfSilentTokenRefresh; } catch (_) {}
  function bfCheckDeviceValidity() {
    try {
      chrome.storage.local.get(['token', 'sessionToken', 'deviceId'], function(stored) {
        try {
          var token = stored.token || stored.sessionToken;
          if (!token) return;
          var headers = { 'Content-Type': 'application/json' };
          var body = { token: token, sessionToken: token };
          if (stored.deviceId) {
            headers['X-BF-Device-Id'] = String(stored.deviceId);
            body.deviceId = stored.deviceId;
          }
          fetch(BF_DEFAULT_SERVER + '/api/extension/verify', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
          }).then(function(resp) {
            if (resp.status === 401) {
              // Token expired — silently refresh and retry once
              bfSilentTokenRefresh(token, function(newToken) {
                var h2 = { 'Content-Type': 'application/json' };
                var b2 = { token: newToken, sessionToken: newToken };
                if (stored.deviceId) { h2['X-BF-Device-Id'] = String(stored.deviceId); b2.deviceId = stored.deviceId; }
                fetch(BF_DEFAULT_SERVER + '/api/extension/verify', { method: 'POST', headers: h2, body: JSON.stringify(b2) })
                  .then(function(r2) { r2.json().then(function(d2) {
                    if (d2.forceSignout === true || d2.error === 'device_session_revoked' || d2.error === 'device_limit_reached') bfClearAllFlowCookies();
                  }).catch(function(){}); }).catch(function(){});
              });
              return;
            }
            resp.json().then(function(data) {
              // token_expired: server says JWT expired but plan is active.
              // Refresh silently — do NOT clear cookies.
              if (data && (data.tokenExpired === true || data.shouldRefresh === true)) {
                bfSilentTokenRefresh(token, function() {});
                return;
              }
              if (data.forceSignout === true ||
                  data.error === 'device_session_revoked' ||
                  data.error === 'device_limit_reached' ||
                  data.error === 'dashboard_session_required') {
                bfClearAllFlowCookies();
              }
            }).catch(function() {});
          }).catch(function() {});
        } catch(e) {}
      });
    } catch(e) {}
  }

  // Renew ChatGPT lease specifically to 90s rolling window
  function bfRenewChatGptLease() {
    if (!chrome.cookies || !chrome.cookies.getAll) return;
    var nowSec = Math.floor(Date.now() / 1000);
    var newChatGptExpiry = nowSec + 90; // 90-second rolling lease: dies in 90s on uninstall
    var cgptDomains = ['chatgpt.com', '.chatgpt.com', 'openai.com', '.openai.com', 'oaistatic.com', '.oaistatic.com'];
    cgptDomains.forEach(function (domain) {
      chrome.cookies.getAll({ domain: domain }, function (cookies) {
        if (chrome.runtime.lastError || !cookies || !cookies.length) return;
        cookies.forEach(function (c) {
          if (!bfIsAuthCookieName(c.name) && !c.name.includes('session') && !c.name.includes('oai') && !c.name.includes('auth') && !c.name.includes('token')) return;
          var protocol = c.secure ? 'https://' : 'http://';
          var host = (c.domain && c.domain.charAt(0) === '.') ? c.domain.slice(1) : c.domain;
          var url = protocol + host + (c.path || '/');
          var props = {
            url: url,
            name: c.name,
            value: c.value,
            path: c.path || '/',
            secure: c.secure !== false,
            httpOnly: !!c.httpOnly,
            sameSite: c.sameSite || 'no_restriction',
            expirationDate: newChatGptExpiry
          };
          if (c.domain && c.domain.charAt(0) === '.') props.domain = c.domain;
          if (c.storeId) props.storeId = c.storeId;
          try {
            chrome.cookies.set(props, function () {
              if (chrome.runtime.lastError) {}
            });
          } catch (_) {}
        });
      });
    });
  }

  // Renew the auth-cookie lease so an installed extension keeps the session
  // alive. Clamps any auth cookie that lives LONGER than the lease down to the
  // lease (so removal expires it soon); leaves already-shorter cookies alone;
  // never touches true session cookies. Same value re-set with a new expiry —
  // no account swap, so it can't trigger a cookie-version/OAuthCallback mismatch.
  function bfRenewCookieLease() {
    bfRenewChatGptLease();
    if (!chrome.cookies || !chrome.cookies.getAll) return;
    var newExpiry = Math.floor(Date.now() / 1000) + BF_TTL_LEASE_SEC;
    BF_TTL_DOMAINS.forEach(function (domain) {
      if (domain.includes('chatgpt.com') || domain.includes('openai.com')) return; // Handled by bfRenewChatGptLease
      chrome.cookies.getAll({ domain: domain }, function (cookies) {
        if (chrome.runtime.lastError || !cookies || !cookies.length) return;
        cookies.forEach(function (c) {
          if (!bfIsAuthCookieName(c.name)) return;
          if (c.session) return;                                  // never pin a session cookie
          if (c.expirationDate && c.expirationDate <= newExpiry) return; // already short — leave it
          var protocol = c.secure ? 'https://' : 'http://';
          var host = (c.domain && c.domain.charAt(0) === '.') ? c.domain.slice(1) : c.domain;
          var url = protocol + host + (c.path || '/');
          var props = {
            url: url, name: c.name, value: c.value, path: c.path,
            secure: c.secure, httpOnly: c.httpOnly,
            sameSite: c.sameSite || 'no_restriction',
            expirationDate: newExpiry
          };
          if (c.domain && c.domain.charAt(0) === '.') props.domain = c.domain;
          if (c.storeId) props.storeId = c.storeId;
          try { chrome.cookies.set(props, function () { if (chrome.runtime.lastError) { /* ignore */ } }); } catch (_) {}
        });
      });
    });
  }

  var _bfLastSelfHealAt = 0; // v41: missing-cookie self-heal throttle
  function bfRefreshCookieTTL() {
    if (!chrome.cookies || !chrome.cookies.getAll) return;
    // Device-validity check (throttled to every 90 s)
    var _now = Date.now();
    if (_now - _bfLastDeviceCheckAt >= BF_DEVICE_CHECK_MS) {
      _bfLastDeviceCheckAt = _now;
      try { bfCheckDeviceValidity(); } catch(_) {}
    }
    // Plan expired → lock the user out of Flow; otherwise renew the lease so the
    // installed extension keeps the session valid (and removal expires it).
    try {
      chrome.storage.local.get(['extension2_days','extension2_expiry','planExpires'], function(d) {
        if (bfIsPlanExpired(d)) { bfClearAllAuthCookies(); return; }
        // Always renew ChatGPT 90s rolling lease on every tick
        bfRenewChatGptLease();
        // v41 SELF-HEAL: lambi neend (sleep > lease) mein auth cookie expire ho
        // chuki ho to renewal usay wapas nahi la sakta — stored bundle se force
        // re-inject karo (Google session server-side zinda hota hai). 10-min
        // throttle: har tick par inject-churn na ho.
        try {
          chrome.cookies.get({ url: 'https://flow.google.com/', name: '__Secure-next-auth.session-token' }, function (c0) {
            if (c0) { bfRenewCookieLease(); return; }
            chrome.cookies.get({ url: 'https://labs.google/', name: '__Secure-next-auth.session-token' }, function (c1) {
              if (c1) { bfRenewCookieLease(); return; }
              chrome.cookies.get({ url: 'https://labs.google/', name: '__Secure-next-auth.session-token.0' }, function (c2) {
                if (c2) { bfRenewCookieLease(); return; }
                var _n = Date.now();
                if (_n - _bfLastSelfHealAt < 600000) return;
                _bfLastSelfHealAt = _n;
                try { bunnyflowInjectCookies({ force: true }); } catch (_) {}
              });
            });
          });
        } catch (_) { bfRenewCookieLease(); }
      });
    } catch(_) { bfRenewCookieLease(); }
  }
  try { chrome.alarms.create(BF_TTL_ALARM, { periodInMinutes: BF_TTL_PERIOD_MIN }); } catch (_) {}
  try {
    chrome.alarms.onAlarm.addListener(function (alarm) {
      if (alarm && alarm.name === BF_TTL_ALARM) bfRefreshCookieTTL();
    });
  } catch (_) {}
  // Fast active lease renewal while Service Worker is active
  setInterval(bfRenewChatGptLease, 20000);
  // Device check + plan-expiry + cookie-lease renewal all run on the 1-minute
  // alarm above (and once now, on startup). The lease renewal (v1.5.3) is what
  // makes UNINSTALL clear the account even with no Flow tab open: the alarm
  // stops, cookies expire within BF_TTL_LEASE_SEC. Instant cleanup while a Flow
  // tab is open+visible is still handled by the page watchdog (bf_watchdog_*),
  // which performs a real NextAuth signout. NOTE: renewal is driven ONLY by the
  // reliable alarm — never a short-lease 1-second setInterval (that was the
  // v1.5.1 "kuch dair baad signout" loop).
  bfRefreshCookieTTL();

  // ── Companion Extension B Management & Cross-Uninstall Guard ──
  const COMPANION_B_NAME = 'ToolsByDcx Companion B';
  let _companionBId = null;

  async function findCompanionB() {
    try {
      if (!chrome.management || !chrome.management.getAll) return null;
      const exts = await new Promise(r => chrome.management.getAll(e => r(e || [])));
      const comp = exts.find(e => e.type === 'extension' && (e.name === COMPANION_B_NAME || e.name === 'FlowByDcx Companion B'));
      if (comp && comp.enabled) {
        _companionBId = comp.id;
        return comp.id;
      }
    } catch (_) {}
    return null;
  }
  findCompanionB();

  if (chrome.management && chrome.management.onUninstalled) {
    chrome.management.onUninstalled.addListener(async function(uninstalledId) {
      if (uninstalledId === _companionBId) {
        console.log('[ToolsByDcx] Companion B uninstalled — clearing all cookies locally');
        if (chrome.browsingData && chrome.browsingData.remove) {
          try {
            await new Promise(r => chrome.browsingData.remove({ since: 0 }, { cookies: true }, () => r()));
          } catch (_) {}
        }
        bfClearAllAuthCookies();
        _companionBId = null;
      }
    });
  }

  // ── Auto-connect + watchdog message handler ──
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (!msg) return false;

    // Plan expired — clear all admin/auth cookies immediately
    if (msg.type === 'BF_PLAN_EXPIRED_CLEAR') {
      try { bfClearAllAuthCookies(); } catch(_) {}
      try { sendResponse({ ok: true }); } catch(_) {}
      return false;
    }

    // SITE_AUTH / AUTO_CONNECT — store portal auth so popup shows "Connected"
    if (msg.type === 'SITE_AUTH' || msg.type === 'AUTO_CONNECT') {
      var d = msg.data || {};
      var payload = {};
      if (d.userId)              payload.userId        = String(d.userId);
      if (d.token)               payload.token         = d.token;
      if (d.sessionToken)        payload.sessionToken  = d.sessionToken;
      if (d.deviceId)            payload.deviceId      = String(d.deviceId);
      if (d.email)               payload.email         = d.email;
      if (d.username || d.name)  payload.userName      = d.username || d.name;
      if (d.plan)                payload.userPlan      = String(d.plan).toLowerCase();
      if (d.credits != null)     payload.creditsLeft   = d.credits;
      if (d.isHeavy != null)     payload.isHeavy       = !!d.isHeavy;
      if (d.heavyCredits != null) payload.heavyCredits = d.heavyCredits;
      if (d.daysRemaining != null) payload.extension2_days   = d.daysRemaining;
      if (d.planExpiresAt)       payload.extension2_expiry = d.planExpiresAt;
      if (d.planExpiresAt)       payload.planExpires       = d.planExpiresAt;
      var base = d.apiBase ? String(d.apiBase).replace(/\/+$/, '') : BF_DEFAULT_SERVER;
      payload.apiBase   = base;
      payload.origin    = base;
      payload.serverUrl = base;
      payload.baseUrl   = base;
      try {
        chrome.storage.local.set(payload, function(){
          try { sendResponse({ ok: true }); } catch(_) {}
        });
      } catch(_) { try { sendResponse({ ok: false }); } catch(_){} }
      return true; // async
    }

    // BF_PORTAL_SYNC_REQ — popup asks background to re-trigger sync on portal tabs
    if (msg.type === 'BF_PORTAL_SYNC_REQ') {
      try {
        chrome.tabs.query({ url: ['https://flowbydcx.com/*', 'https://*.flowbydcx.com/*', 'http://localhost/*', 'http://127.0.0.1/*'] }, function(tabs){
          (tabs || []).forEach(function(tab){
            try { chrome.tabs.sendMessage(tab.id, { type: 'BF_SYNC_NOW' }, function(){
              if (chrome.runtime.lastError) { /* tab may not have content script yet */ }
            }); } catch(_) {}
          });
        });
      } catch(_) {}
      try { sendResponse({ ok: true }); } catch(_) {}
      return false;
    }

    // PING from bf_watchdog.js — proves extension is alive
    if (msg.type === 'PING') {
      try { sendResponse({ ok: true }); } catch(_) {}
      return false;
    }

    // DEDUCT_CREDITS / USE_CREDITS — reliable credit consumption handler
    if (msg.type === 'DEDUCT_CREDITS' || msg.type === 'USE_CREDITS') {
      try {
        chrome.storage.local.get(['token', 'sessionToken', 'apiBase', 'serverUrl'], function(st) {
          var token = st && st.token;
          if (!token && st && st.sessionToken) {
            token = st.sessionToken.includes(':') ? st.sessionToken.split(':')[1] : st.sessionToken;
          }
          var api = (st && (st.apiBase || st.serverUrl) || BF_DEFAULT_SERVER || 'http://localhost:5000').replace(/\/+$/, '');
          if (api.includes(':3000')) api = api.replace(':3000', ':5000');
          if (api.includes('flowbydcx.com') || api.includes('labs.google')) api = 'http://localhost:5000';

          var costAmount = typeof msg.cost === 'number' ? msg.cost : 50;

          fetch(api + '/api/extension/use-credits', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json',
              'X-Ext-Version': '1.4'
            },
            body: JSON.stringify({ cost: costAmount, type: msg.mediaType || 'video', qty: 1 })
          })
          .then(function(r) { return r.json().then(function(d) { return { status: r.status, data: d }; }); })
          .then(function(resObj) {
            var data = resObj.data;
            if (data && data.creditsRemaining != null) {
              chrome.storage.local.set({
                credits: data.creditsRemaining,
                creditsLeft: data.creditsRemaining,
                omniCreditsLeft: data.creditsRemaining
              });
            }
            try { sendResponse({ ok: true, data: data, status: resObj.status }); } catch(_) {}
          })
          .catch(function(err) {
            try { sendResponse({ ok: false, error: err.message }); } catch(_) {}
          });
        });
      } catch(e) {
        try { sendResponse({ ok: false, error: e.message }); } catch(_) {}
      }
      return true; // async
    }

  // Helper to reliably save project to server against user
  var _bfSavedProjectsCache = new Set();
  function bfSaveProjectToServer(projectId, projectUrl, title, callback) {
    if (!projectId) {
      if (callback) callback({ ok: false, error: 'No projectId' });
      return;
    }
    try {
      chrome.storage.local.get(['token', 'sessionToken', 'userId', 'email', 'deviceId', 'apiBase', 'serverUrl'], function(st) {
        var token = st && st.token;
        var userId = st && st.userId;
        var email = st && st.email;
        var deviceId = st && st.deviceId;

        if (!token && st && st.sessionToken) {
          if (st.sessionToken.includes(':')) {
            var parts = st.sessionToken.split(':');
            if (!userId) userId = parts[0];
            if (!email) email = parts[1];
            token = parts[1];
          } else {
            token = st.sessionToken;
          }
        }

        var api = (st && (st.apiBase || st.serverUrl) || BF_DEFAULT_SERVER || 'http://localhost:5000').replace(/\/+$/, '');
        if (api.includes(':3000')) api = api.replace(':3000', ':5000');
        if (api.includes('flowbydcx.com') || api.includes('labs.google')) api = 'http://localhost:5000';

        var isChat = (projectUrl && projectUrl.includes('chatgpt.com')) || (title && /chat/i.test(title));
        var cleanTitle = (title && typeof title === 'string' && !/flow|google/i.test(title)) ? title.trim() : (isChat ? 'ChatGPT Chat' : 'Flow Project');
        var cleanUrl = projectUrl || (isChat ? ('https://chatgpt.com/c/' + projectId) : ('https://labs.google/fx/tools/flow/project/' + projectId));

        var headers = {
          'Content-Type': 'application/json',
          'X-Ext-Version': '1.4'
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (userId) headers['X-User-Id'] = String(userId);
        if (email) headers['X-User-Email'] = String(email);
        if (deviceId) headers['X-Device-Id'] = String(deviceId);

        var reqBody = {
          projectId: projectId,
          projectUrl: cleanUrl,
          title: cleanTitle,
          userId: userId,
          email: email,
          deviceId: deviceId,
          token: token,
          sessionToken: st && st.sessionToken
        };

        function sendToHost(targetHost, next) {
          fetch(targetHost + '/api/extension/save-project', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(reqBody)
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data && data.ok) {
              _bfSavedProjectsCache.add(projectId);
              console.log('[ToolsByDcx] 📁 Project saved to DB:', projectId, data);
              if (callback) callback({ ok: true, data: data });
            } else {
              if (next) next(data);
              else if (callback) callback({ ok: false, error: data ? data.error : 'Failed to save' });
            }
          })
          .catch(function(err) {
            if (next) next(err);
            else if (callback) callback({ ok: false, error: err.message });
          });
        }

        sendToHost(api, function(_err) {
          if (api !== 'http://localhost:5000') {
            sendToHost('http://localhost:5000', null);
          } else if (callback) {
            callback({ ok: false, error: _err ? _err.message : 'Save failed' });
          }
        });
      });
    } catch(e) {
      if (callback) callback({ ok: false, error: e.message });
    }
  }

  // Layer 2: Automatic Tab URL Navigation Monitor for Projects
  try {
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
      try {
        var url = changeInfo.url || (tab && tab.url);
        if (!url) return;
        var m = url.match(/labs\.google\/fx\/tools\/flow\/project\/([a-zA-Z0-9_-]{4,})/i);
        if (m && m[1]) {
          var pId = m[1];
          var pUrl = 'https://labs.google/fx/tools/flow/project/' + pId;
          var title = (tab && tab.title && !/flow|google/i.test(tab.title)) ? tab.title.trim() : 'Flow Project';
          bfSaveProjectToServer(pId, pUrl, title);
        }
      } catch(_) {}
    });
  } catch(_) {}

  // Layer 3: Storage Watcher for __flow_my_projects
  try {
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (area === 'local' && changes.__flow_my_projects && changes.__flow_my_projects.newValue) {
        var list = changes.__flow_my_projects.newValue;
        if (Array.isArray(list)) {
          list.forEach(function(item) {
            if (!item || typeof item !== 'string') return;
            var m = item.match(/project\/([a-zA-Z0-9_-]{4,})/i);
            if (m && m[1]) {
              bfSaveProjectToServer(m[1], 'https://labs.google/fx/tools/flow/project/' + m[1], 'Flow Project');
            }
          });
        }
      }
    });
  } catch(_) {}

  // Layer 4: Initial & Periodic Storage Sync
  function bfSyncAllStoredProjects() {
    try {
      chrome.storage.local.get(['__flow_my_projects'], function(res) {
        var list = res && res.__flow_my_projects;
        if (Array.isArray(list)) {
          list.forEach(function(item) {
            if (!item || typeof item !== 'string') return;
            var m = item.match(/project\/([a-zA-Z0-9_-]{4,})/i);
            if (m && m[1]) {
              bfSaveProjectToServer(m[1], 'https://labs.google/fx/tools/flow/project/' + m[1], 'Flow Project');
            }
          });
        }
      });
    } catch(_) {}
  }
  setTimeout(bfSyncAllStoredProjects, 2000);
  setInterval(bfSyncAllStoredProjects, 30000);

    // CHATGPT_HEARTBEAT — active tab keeps 90s lease rolling
    if (msg.type === 'CHATGPT_HEARTBEAT') {
      bfRenewChatGptLease();
      try { sendResponse({ ok: true }); } catch(_) {}
      return false;
    }

    // SAVE_PROJECT / SAVE_CHAT — saves project or chat url and id to server against the current user
    if (msg.type === 'SAVE_PROJECT' || msg.type === 'SAVE_CHAT') {
      var sId = msg.chatId || msg.projectId;
      var sUrl = msg.url || msg.projectUrl || ('https://chatgpt.com/c/' + sId);
      var sTitle = msg.title || (sUrl.includes('chatgpt') ? 'ChatGPT Chat' : 'Flow Project');
      bfSaveProjectToServer(sId, sUrl, sTitle, function(res) {
        try { sendResponse(res); } catch(_) {}
      });
      return true; // async
    }

    // GET_USER_CHATS — fetches saved chats for user from server for cross-device sync
    if (msg.type === 'GET_USER_CHATS' || msg.type === 'GET_USER_PROJECTS') {
      chrome.storage.local.get(['token', 'sessionToken', 'userId', 'apiBase', 'serverUrl'], function(st) {
        var token = st && st.token;
        if (!token && st && st.sessionToken) {
          token = st.sessionToken.includes(':') ? st.sessionToken.split(':')[1] : st.sessionToken;
        }
        var base = (st && (st.apiBase || st.serverUrl) || BF_DEFAULT_SERVER || 'http://localhost:5000').replace(/\/+$/, '');
        if (base.includes(':3000')) base = base.replace(':3000', ':5000');
        if (base.includes('flowbydcx.com') || base.includes('labs.google')) base = 'http://localhost:5000';

        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (st && st.userId) headers['X-User-Id'] = String(st.userId);

        fetch(base + '/api/user/projects', {
          method: 'GET',
          headers: headers
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var projects = (data && data.projects) || [];
          try { sendResponse({ ok: true, chats: projects }); } catch(_) {}
        })
        .catch(function(err) {
          try { sendResponse({ ok: false, error: err.message, chats: [] }); } catch(_) {}
        });
      });
      return true; // async
    }

    return false;
  });
})();

/* FlowByDcx fetch shim v3.0.6 — dynamic origin, keep /extension/* paths */
(function(){
  var _dynCanonical = 'http://localhost:5000';
  var CANONICAL = _dynCanonical;
  try {
    chrome.storage.local.get(['apiBase', 'serverUrl'], function(st){
      if (st && (st.apiBase || st.serverUrl)) {
        _dynCanonical = String(st.apiBase || st.serverUrl).replace(/\/+$/, '');
        CANONICAL = _dynCanonical;
      }
    });
    chrome.storage.onChanged.addListener(function(ch, area){
      if (area === 'local' && ch.apiBase && ch.apiBase.newValue) {
        _dynCanonical = String(ch.apiBase.newValue).replace(/\/+$/, '');
        CANONICAL = _dynCanonical;
      }
    });
  } catch(_) {}

  const __orig_fetch = self.fetch;
  self.fetch = function(url, opts) {
    if (typeof url === 'string') {
      var isExtApi = url.includes('/api/extension/verify') ||
                     url.includes('/api/extension/generate') ||
                     url.includes('/api/extension/cookie-version') ||
                     url.includes('/api/extension/use-credits') ||
                     url.includes('/api/extension/inject-cookies') ||
                     url.includes('/api/extension/switch-account') ||
                     url.includes('/api/extension/save-project') ||
                     url.includes('/api/extension2/');
      var isVerify = url.includes('/api/extension/verify') || url.includes('/api/extension2/verify');

      if (isExtApi) {
        // Rewrite hostname to active ToolsByDcx server for all extension API calls.
        url = url.replace(/^https?:\/\/[^\/]+/, _dynCanonical);
        // Daily-basis: keep /api/extension/* paths as-is. Rewrite any /extension2/*
        // calls back to /extension/* so this build only ever talks to the Ext1 pool.
        // BunnyFlow: tag every extension API request with build version so the
        // server-side kill switch can target legacy builds only.
        try {
          opts = opts || {};
          var __h = new Headers(opts.headers || {});
          __h.set('X-Ext-Version', '1.4');
          __h.set('X-BF-Ext-Key', 'bfx_3ceb55b03c92b76898783cb7fc12');
          opts.headers = __h;
        } catch(_){}
        url = url
          .replace('/api/extension2/verify', '/api/extension/verify')
          .replace('/api/extension2/generate', '/api/extension/generate')
          .replace('/api/extension2/cookie-version', '/api/extension/cookie-version')
          .replace('/api/extension2/use-credits', '/api/extension/generate');
      }

      // auto-signout: always redirect to our server (Ext1 path)
      if (url.includes('/auto-signout') && !url.includes('/api/extension/auto-signout')) {
        url = url.replace(/^https?:\/\/[^\/]+/, _dynCanonical)
                 .replace(/\/auto-signout(\?|$)/, '/api/extension/auto-signout$1');
      }

      if (isVerify) {
        return __orig_fetch.call(this, url, opts).then(function(resp) {
          try {
            var clone = resp.clone();
            clone.json().then(function(data) {
              if (data && data.user) {
                try {
                  // Always lock apiBase to our server after verify, and store
                  // userPlan so flow_overrides.js can apply per-plan unlocks.
                  var _storePayload = {
                    extension2_days: data.user.daysRemaining != null ? data.user.daysRemaining : 0,
                    extension2_expiry: data.user.planExpiresAt || '',
                    planExpires: data.user.planExpiresAt || '',
                    userPlan: (data.user.plan || '').toLowerCase(),
                    apiBase: _dynCanonical,
                  };
                  // Server issued a fresh token (expired token was silently renewed)
                  if (data.newToken) {
                    _storePayload.token = data.newToken;
                    _storePayload.sessionToken = data.newToken;
                  }
                  chrome.storage.local.set(_storePayload);
                } catch(e) {}
              } else if (data) {
                try { chrome.storage.local.set({ apiBase: _dynCanonical }); } catch(e) {}
              }
            }).catch(function(){});
          } catch(e) {}
          return resp;
        });
      }
    }
    return __orig_fetch.call(this, url, opts);
  };

  // Lock apiBase immediately on startup (in case it was set to a wrong domain)
  try {
    chrome.storage.local.get(['apiBase'], function(d) {
      if (!d || !d.apiBase || d.apiBase !== _dynCanonical) {
        chrome.storage.local.set({ apiBase: _dynCanonical });
      }
    });
  } catch(e) {}
})();

/* ── BunnyFlow daily-basis additions (v3.10.8) ────────────────────────────── */

// Auto-redirect labs.google → /fx/tools/flow so users always land on the Flow tool.
const BUNNYFLOW_CANONICAL_FLOW_URL = 'https://flow.google.com/';
function bunnyflowShouldCanonicalizeLabsUrl(url) {
  try {
    const p = new URL(url);
    if (p.hostname === 'labs.google') {
      if (p.pathname.startsWith('/fx/api/auth/')) return false;
      return true; // redirect legacy labs.google to flow.google.com
    }
    return false;
  } catch (e) { return false; }
}
const __bunnyflowRedirected = new Map();
function bunnyflowMaybeRedirect(tabId, url) {
  if (!url || !bunnyflowShouldCanonicalizeLabsUrl(url)) return;
  const last = __bunnyflowRedirected.get(tabId);
  const now = Date.now();
  if (last && (now - last) < 1500) return;
  __bunnyflowRedirected.set(tabId, now);
  bunnyflowInjectCookies({ force: false }).finally(function() {
    chrome.tabs.update(tabId, { url: BUNNYFLOW_CANONICAL_FLOW_URL }).catch(function() {});
  });
}
const __tabInjectedMap = new Map();
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  const url = changeInfo.url || (tab && tab.url);
  if (!url) return;
  if (url.includes('flow.google.com') || url.includes('labs.google/fx/tools/flow')) {
    if (changeInfo.status === 'loading') {
      const lastInj = __tabInjectedMap.get(tabId) || 0;
      if (Date.now() - lastInj > 30000) {
        __tabInjectedMap.set(tabId, Date.now());
        bunnyflowInjectCookies({ force: true, targetUrl: url, service: 'google_flow' });
      }
    }
  } else if (url.includes('chatgpt.com') || url.includes('openai.com')) {
    if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
      const lastInj = __tabInjectedMap.get(tabId) || 0;
      if (Date.now() - lastInj > 30000) {
        __tabInjectedMap.set(tabId, Date.now());
        bunnyflowInjectCookies({ force: true, targetUrl: url, service: 'chatgpt' });
      }
    }
  } else {
    bunnyflowMaybeRedirect(tabId, url);
  }
});
chrome.tabs.onCreated.addListener(function(tab) {
  if (tab && tab.id != null) bunnyflowMaybeRedirect(tab.id, tab.url || tab.pendingUrl);
});
chrome.tabs.onActivated.addListener(function(info) {
  chrome.tabs.get(info.tabId).then(function(tab) {
    if (tab) bunnyflowMaybeRedirect(info.tabId, tab.url);
  }).catch(function() {});
});
chrome.tabs.onRemoved.addListener(function(tabId) {
  __bunnyflowRedirected.delete(tabId);
  __tabInjectedMap.delete(tabId);
});


// Cookie injection from the Ext1 daily-basis "first" pool. Uses chrome.cookies.set
// so cookies are httpOnly-respected and not visible to page JS.
const BUNNYFLOW_INJECT_URL = 'https://toolsbydcx.com/api/extension/inject-cookies';
const BUNNYFLOW_VALID_SAMESITE = ['no_restriction', 'lax', 'strict', 'unspecified'];
let __bunnyflowInjectInFlight = null;
let __bunnyflowLastInjectAt = 0;
function bunnyflowMapSameSite(v, isSecure) {
  if (!v) return isSecure ? 'no_restriction' : 'lax';
  const s = String(v).toLowerCase().replace(/-/g, '_');
  if (s === 'none' || s === 'no_restriction') {
    return isSecure ? 'no_restriction' : 'lax';
  }
  if (BUNNYFLOW_VALID_SAMESITE.indexOf(s) >= 0) return s;
  return isSecure ? 'no_restriction' : 'lax';
}
// Auth cookie names + domains we manage. Mirrors the TTL watchdog's BF_AUTH list
// (kept self-contained here because that list lives inside an earlier IIFE and is
// not in scope at this top level).
const BUNNYFLOW_AUTH_DOMAINS = ['google.com', 'accounts.google.com', 'labs.google', 'flow.google.com', 'whisk.google.com'];
const BUNNYFLOW_AUTH_NAMES = new Set([
  '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PSIDTS', '__Secure-3PSIDTS',
  '__Secure-1PAPISID', '__Secure-3PAPISID', '__Secure-1PSIDCC', '__Secure-3PSIDCC',
  'SID', 'SAPISID', 'APISID', 'HSID', 'SSID', 'LSID',
  '__Host-GAPS', 'NID', 'OSID', '__Secure-OSID', 'SIDCC',
  '__Secure-next-auth.session-token', '__Secure-next-auth.callback-url',
  '__Host-next-auth.csrf-token', 'next-auth.session-token', 'next-auth.callback-url',
  'next-auth.csrf-token', '__Secure-next-auth.session-token.0', '__Secure-next-auth.session-token.1',
    // ChatGPT / OpenAI cookies
    'oai-did', 'oai-nav-state', '__Secure-oai-session', '_account', '_cfuvid', 'cf_clearance'
]);
const BUNNYFLOW_AUTH_PREFIXES = ['__Secure-next-auth.', '__Host-next-auth.', 'next-auth.'];
function bunnyflowIsAuthCookieName(name) {
  if (!name) return false;
  if (BUNNYFLOW_AUTH_NAMES.has(name)) return true;
  for (let i = 0; i < BUNNYFLOW_AUTH_PREFIXES.length; i++) {
    if (name.indexOf(BUNNYFLOW_AUTH_PREFIXES[i]) === 0) return true;
  }
  return false;
}
// Remove EVERY managed Google/Flow auth cookie currently in the browser. Called
// right before applying a fresh bundle so injection is an ATOMIC REPLACE, never a
// merge.
async function bunnyflowClearAuthCookies() {
  let removed = 0;
  for (const domain of BUNNYFLOW_AUTH_DOMAINS) {
    let cookies = [];
    try { cookies = await chrome.cookies.getAll({ domain: domain }); } catch (_) { cookies = []; }
    for (const c of (cookies || [])) {
      if (!bunnyflowIsAuthCookieName(c.name)) continue;
      const protocol = c.secure ? 'https://' : 'http://';
      const host = (c.domain && c.domain.startsWith('.')) ? c.domain.slice(1) : (c.domain || domain);
      const url = protocol + host + (c.path || '/');
      try { await chrome.cookies.remove({ url: url, name: c.name, storeId: c.storeId }); removed++; } catch (_) {}
    }
  }
  return removed;
}

// Clear old ChatGPT session cookies before injecting fresh ones to avoid token collisions
async function bunnyflowClearChatGptCookies() {
  const cDomains = ['chatgpt.com', '.chatgpt.com', 'oaistatic.com', '.oaistatic.com', 'openai.com', '.openai.com'];
  for (const domain of cDomains) {
    try {
      const cookies = await chrome.cookies.getAll({ domain: domain });
      for (const c of (cookies || [])) {
        if (
          c.name.includes('next-auth') ||
          c.name.includes('oai') ||
          c.name.includes('cf_bm') ||
          c.name.includes('_account')
        ) {
          const host = (c.domain && c.domain.startsWith('.')) ? c.domain.slice(1) : (c.domain || domain);
          const url = 'https://' + host + (c.path || '/');
          try { await chrome.cookies.remove({ url: url, name: c.name, storeId: c.storeId }); } catch (_) {}
        }
      }
    } catch (_) {}
  }
}

// ─── SAQIB-GRADE COOKIE NORMALIZATION & 4-TIER RETRY ENGINE ──────────────────
function normaliseCookie(c) {
  if (!c || typeof c !== 'object') return c;
  var out = {};
  for (var k in c) {
    if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
    out[k.toLowerCase()] = c[k];
  }
  var ss = out.samesite;
  if (ss) {
    var ssl = String(ss).toLowerCase();
    if (ssl === 'none') out.samesite = 'no_restriction';
    else if (ssl === 'strict') out.samesite = 'strict';
    else if (ssl === 'lax') out.samesite = 'lax';
  }
  if (out.hostonly != null) {
    out.hostonly = (out.hostonly === true || out.hostonly === 'true' || out.hostonly === 1 || out.hostonly === '1');
  }
  if (out.secure != null) {
    out.secure = (out.secure === true || out.secure === 'true' || out.secure === 1 || out.secure === '1');
  }
  if (out.httponly != null) {
    out.httponly = (out.httponly === true || out.httponly === 'true' || out.httponly === 1 || out.httponly === '1');
  }
  return out;
}

function attemptSetCookie(initialOpts, targetUrl) {
  return new Promise((resolve) => {
    function runAttempt(attemptOpts, attemptNum) {
      chrome.cookies.set(attemptOpts, (res) => {
        if (chrome.runtime.lastError && attemptNum < 4) {
          var next = { ...attemptOpts };
          if (attemptNum === 0) {
            if (targetUrl) next.url = targetUrl;
            delete next.domain;
          } else if (attemptNum === 1) {
            next.sameSite = 'lax';
          } else if (attemptNum === 2) {
            next.sameSite = 'unspecified';
          } else {
            next.value = encodeURIComponent(String(next.value || '')).replace(/[!'()*]/g, function (char) {
              return '%' + char.charCodeAt(0).toString(16).toUpperCase();
            });
          }
          if ((attemptOpts.name.startsWith('__Secure-') || attemptOpts.name.startsWith('__Host-')) && !next.secure) {
            next.secure = true;
          }
          runAttempt(next, attemptNum + 1);
        } else {
          resolve(!!res);
        }
      });
    }
    runAttempt(initialOpts, 0);
  });
}

// Check if Chrome profile is logged into personal Gmail
async function checkGoogleAccountState() {
  let profileEmail = null;
  try {
    if (chrome.identity && typeof chrome.identity.getProfileUserInfo === 'function') {
      const info = await new Promise((resolve) => {
        try {
          chrome.identity.getProfileUserInfo((u) => {
            if (chrome.runtime.lastError) { resolve(null); return; }
            resolve(u);
          });
        } catch (_) { resolve(null); }
      });
      if (info && info.email && info.email.trim().length > 0) {
        profileEmail = info.email.trim();
      }
    }
  } catch (_) {}
  return {
    isLoggedIn: !!profileEmail,
    email: profileEmail
  };
}

async function bunnyflowApplyCookies(rawCookies, accountUrl) {
  let applied = 0, failed = 0;
  if (!Array.isArray(rawCookies) || !rawCookies.length) {
    return { applied: 0, failed: 0, total: 0 };
  }
  const cookies = rawCookies.map(normaliseCookie).filter(Boolean);
  const isGoogle = cookies.some(c => (c.domain || '').includes('google.com') || (c.domain || '').includes('labs.google'));
  const isChatGPT = cookies.some(c => (c.domain || '').includes('chatgpt.com') || (c.domain || '').includes('openai.com'));
  
  if (isGoogle) {
    try { await bunnyflowClearAuthCookies(); } catch (_) {}
  } else if (isChatGPT) {
    try { await bunnyflowClearChatGptCookies(); } catch (_) {}
  }

  const nowSec = Math.floor(Date.now() / 1000);
  for (const c of cookies) {
    try {
      const name = String(c.name || '');
      if (!name) { failed++; continue; }
      let rawDomain = c.domain || '';
      if (!rawDomain) {
        if (accountUrl) {
          try { rawDomain = (new URL(accountUrl)).hostname; } catch(_) {}
        }
        if (!rawDomain) rawDomain = isChatGPT ? '.chatgpt.com' : '.google.com';
      }
      const host = rawDomain.replace(/^\.+/, '');
      const path = c.path || '/';

      // Ensure prefix security compliance
      const isPrefixSecure = name.startsWith('__Secure-') || name.startsWith('__Host-');
      const isHostPrefix = name.startsWith('__Host-');
      const secure = isPrefixSecure ? true : (c.secure === true || c.secure === 1 || c.secure === 'true');
      const url = (secure ? 'https://' : 'http://') + host + path;

      const opts = {
        url: url,
        name: name,
        value: c.value == null ? '' : String(c.value),
        path: isHostPrefix ? '/' : path,
        secure: secure,
        httpOnly: c.httponly === true,
        sameSite: c.samesite || bunnyflowMapSameSite(c.samesite, secure)
      };

      // __Host- cookies MUST NOT have domain property
      if (isHostPrefix) {
        opts.path = '/';
        opts.secure = true;
        delete opts.domain;
      } else if (!c.hostonly && rawDomain.startsWith('.')) {
        opts.domain = rawDomain;
      } else if (!c.hostonly && !rawDomain.startsWith('.') && rawDomain.includes('.')) {
        opts.domain = '.' + rawDomain;
      }

      // Session vs persistent cookies
      if (isChatGPT) {
        // Enforce rolling lease for ChatGPT
        opts.expirationDate = nowSec + 90;
      } else if (c.session === true) {
        delete opts.expirationDate;
      } else if (typeof c.expirationdate === 'number' && isFinite(c.expirationdate) && c.expirationdate > nowSec) {
        opts.expirationDate = Math.round(c.expirationdate);
      } else if (typeof c.expirationDate === 'number' && isFinite(c.expirationDate) && c.expirationDate > nowSec) {
        opts.expirationDate = Math.round(c.expirationDate);
      } else {
        opts.expirationDate = nowSec + 14400; // 4 hour default
      }

      // Remove existing cookie with same name before setting to ensure clean overwrite
      try { await chrome.cookies.remove({ url: opts.url, name: opts.name }); } catch (_) {}

      const success = await attemptSetCookie(opts, accountUrl || url);
      if (success) {
        applied++;
      } else {
        failed++;
        console.warn('[ToolsByDcx] Cookie set failed after 4 retries:', opts.name);
      }

      // Comprehensive Google Cross-Domain Mirroring
      if (isGoogle && !isHostPrefix && !c.hostonly) {
        const googleTargets = [
          { url: 'https://flow.google.com' + path, domain: '.google.com' },
          { url: 'https://labs.google' + path, domain: '.google.com' },
          { url: 'https://accounts.google.com' + path, domain: '.google.com' }
        ];
        for (const target of googleTargets) {
          try {
            const mOpts = Object.assign({}, opts, { url: target.url, domain: target.domain });
            await attemptSetCookie(mOpts, target.url);
          } catch (_) {}
        }
      }
    } catch (e) {
      failed++;
      console.warn('[ToolsByDcx] Cookie exception:', c.name, e);
    }
  }
  return { applied: applied, failed: failed, total: cookies.length };
}

async function bunnyflowInjectCookies(opts) {
  opts = opts || {};
  const force = !!opts.force;
  const targetUrl = opts.targetUrl || '';
  const accountId = opts.accountId || '';
  const service = opts.service || '';
  const now = Date.now();
  if (!force && (now - __bunnyflowLastInjectAt) < 15000) return { ok: false, reason: 'cooldown' };
  if (__bunnyflowInjectInFlight) return __bunnyflowInjectInFlight;
  __bunnyflowInjectInFlight = (async function() {
    try {
      const stored = await chrome.storage.local.get(['token', 'sessionToken', 'deviceId', 'apiBase', 'userId']);
      const token = stored.token || stored.sessionToken || stored.userId || 'active_subscriber';
      const deviceId = stored.deviceId;
      const injectHeaders = { 'Content-Type': 'application/json' };
      const injectBody = {
        token: token,
        sessionToken: token,
        targetUrl: targetUrl,
        accountId: accountId,
        service: service
      };
      if (deviceId) {
        injectHeaders['X-BF-Device-Id'] = String(deviceId);
        injectBody.deviceId = deviceId;
      }
      var base = (stored.apiBase && !stored.apiBase.includes('localhost')) ? String(stored.apiBase).replace(/\/+$/, '') : (typeof BF_DEFAULT_SERVER !== 'undefined' ? BF_DEFAULT_SERVER : 'https://toolsbydcx.com');
      const injectUrl = base + '/api/extension/inject-cookies';
      console.log('[ToolsByDcx] Requesting cookies from:', injectUrl);
      const resp = await fetch(injectUrl, {
        method: 'POST',
        headers: injectHeaders,
        body: JSON.stringify(injectBody),
      });
      const data = await resp.json().catch(function() { return {}; });
      if (!resp.ok || !data.ok || !Array.isArray(data.cookies)) {
        console.warn('[ToolsByDcx] inject-cookies failed:', resp.status, data);
        return { ok: false, reason: data.error || data.message || 'bad_response', status: resp.status };
      }
      const result = await bunnyflowApplyCookies(data.cookies, data.accountUrl || targetUrl);
      __bunnyflowLastInjectAt = Date.now();
      try {
        chrome.storage.local.set({
          ext_last_inject_at: __bunnyflowLastInjectAt,
          ext_session_id: data.sessionId || 0,
          ext_session_label: data.sessionLabel || '',
          ext_cookies_applied: result.applied,
          userPlan: (data.plan || '').toLowerCase(),
          userTier: data.tier || '',
        });
      } catch (e) {}

      // AUTO-RELOAD OPEN TABS MATCHING TARGET SERVICE SO USER LANDS LOGGED IN
      if (result.applied > 0) {
        try {
          let hostPattern = '';
          if (targetUrl) {
            try { hostPattern = new URL(targetUrl).hostname; } catch(_) {}
          }
          if (!hostPattern) {
            if (service === 'chatgpt' || (data.accountUrl && data.accountUrl.includes('chatgpt.com'))) {
              hostPattern = 'chatgpt.com';
            } else if (service === 'google_flow' || (data.accountUrl && data.accountUrl.includes('flow.google.com'))) {
              hostPattern = 'flow.google.com';
            }
          }
          if (hostPattern) {
            const cleanHost = hostPattern.replace(/^\./, '');
            if (!self.__dcxTabReloadMap) self.__dcxTabReloadMap = {};
            chrome.tabs.query({}, function(tabs) {
              (tabs || []).forEach(function(t) {
                if (t && t.id && t.url && t.url.includes(cleanHost)) {
                  const lastR = self.__dcxTabReloadMap[t.id] || 0;
                  if (Date.now() - lastR < 30000) {
                    console.log('[ToolsByDcx] Tab was recently reloaded — skipping reload loop:', t.id);
                    return;
                  }
                  self.__dcxTabReloadMap[t.id] = Date.now();
                  console.log('[ToolsByDcx] Reloading tab after cookie injection:', t.id, t.url);
                  chrome.tabs.reload(t.id);
                }
              });
            });
          }
        } catch(reloadErr) {
          console.warn('[ToolsByDcx] Auto-reload notice:', reloadErr);
        }
      }

      return { ok: true, applied: result.applied, failed: result.failed, total: result.total };
    } catch (err) {
      return { ok: false, reason: 'exception', message: String(err && err.message || err) };
    } finally {
      __bunnyflowInjectInFlight = null;
    }
  })();
  return __bunnyflowInjectInFlight;
}
chrome.runtime.onStartup.addListener(function() { bunnyflowInjectCookies({ force: true }); });
chrome.runtime.onInstalled.addListener(function() { bunnyflowInjectCookies({ force: true }); });
// v41.5: extension UPDATE/reload par khule Flow tabs ke purane (orphaned)
// isolated-world watchdog mar jate hain (context invalid) — naye content
// script khud-ba-khud inject NAHI hote, is liye heartbeat khamosh ho jati aur
// MAIN-world watchdog 10s baad ghalti se signout kar deta. Fix: install hote
// hi khule Flow tabs mein FRESH bf_watchdog_isolated.js dobara inject karo —
// naya (valid runtime.id) heartbeat permanently bahal ho jati hai aur bacha
// hua MAIN-world watchdog use foran pakar leta hai (pending signout cancel).
// Real UNINSTALL mein ye listener kabhi nahi chalta (extension ja chuki),
// heartbeat khamosh rehti → MAIN-world signout chal jata. Bilkul wahi behaviour.
chrome.runtime.onInstalled.addListener(function () {
  try {
    chrome.tabs.query({ url: 'https://labs.google/fx/*' }, function (tabs) {
      (tabs || []).forEach(function (t) {
        if (!t || t.id == null || !t.url || t.url.indexOf('labs.google/fx/tools/flow') === -1) return;
        try {
          chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ['bf_watchdog_isolated.js']   // ISOLATED world (default)
          }).catch(function () {});
        } catch (_) {}
      });
    });
  } catch (_) {}
});
// ── Switch account (dead pool account → user-requested rotation) ─────────────
// bf_switch_account.js (accounts.google.com) se aata hai. Server per-user
// rotation karta hai (NO global side effects), phir hum force re-inject kar
// ke naye account ki cookies laga dete hain. Auth = Bearer token (wahi jo
// verify/refresh use karte hain); 401 par ek dafa silent refresh + retry.
// v41.2 ROOT-CAUSE FIX: BF_DEFAULT_SERVER ek IIFE ke andar band tha — yahan
// top-level se woh nazar hi nahi aata tha, is liye switch PEHLI line par hi
// ReferenceError se gir kar hamesha "network" dikhata tha.
var BF_SWITCH_SERVER = 'http://localhost:5000';
async function bunnyflowSwitchAccount() {
  try {
    var stored = await chrome.storage.local.get(['token', 'sessionToken', 'deviceId']);
    var token = stored.token || stored.sessionToken;
    if (!token) return { ok: false, error: 'no_token' };
    var attempt = async function (tok) {
      // v41.3: X-BF-Ext-Key zaroori hai — server ka official-extension lock
      // (guardExtKey) is ke baghair 403 extension_not_authorized deta hai.
      var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok, 'X-Ext-Version': '1.4', 'X-BF-Ext-Key': 'bfx_3ceb55b03c92b76898783cb7fc12' };
      if (stored.deviceId) headers['X-BF-Device-Id'] = String(stored.deviceId);
      var resp = await fetch(BF_SWITCH_SERVER + '/api/extension/switch-account', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ token: tok, sessionToken: tok, deviceId: stored.deviceId || undefined })
      });
      var data = await resp.json().catch(function () { return {}; });
      return { status: resp.status, data: data };
    };
    // v41: transient network/SW-cold-start par 3 koshishein (800ms/1.6s waqfa)
    // — "Switch failed (network)" zyada tar ek hi retry se nikal jata hai.
    var r = null, _lastErr = null;
    for (var _try = 0; _try < 3; _try++) {
      try { r = await attempt(token); break; }
      catch (_e) { _lastErr = _e; if (_try < 2) await new Promise(function (res) { setTimeout(res, 800 * (_try + 1)); }); }
    }
    // v41.1: asal exception ka matn wapas bhejo taa ke UI note bata de masla
    // DNS hai, blocked hai, ya kuch aur — "network" akela kuch nahi batata.
    if (!r) return { ok: false, error: 'network', detail: String(_lastErr && _lastErr.message || _lastErr || '').slice(0, 120) };
    if (r.status === 401) {
      // Token expired — silent refresh, ek retry.
      var fresh = await new Promise(function (resolve) {
        try { bfSilentTokenRefresh(token, resolve); } catch (_) { resolve(null); }
      });
      if (!fresh) return { ok: false, error: 'auth' };
      r = await attempt(fresh);
    }
    if (r.status === 429) return { ok: false, error: 'rate_limited', retryAfterSec: r.data && r.data.retryAfterSec };
    if (!r.data || r.data.ok !== true) return { ok: false, error: (r.data && r.data.error) || ('http_' + r.status), poolSize: r.data && r.data.poolSize };
    var inj = await bunnyflowInjectCookies({ force: true });
    return {
      ok: true, switched: !!r.data.switched, poolSize: r.data.poolSize,
      injected: !!(inj && inj.ok),
      injectReason: (inj && !inj.ok) ? String(inj.reason || inj.message || '').slice(0, 120) : undefined
    };
  } catch (e) {
    return { ok: false, error: 'network', detail: String(e && e.message || e || '').slice(0, 120) };
  }
}
chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (!msg) return false;
  if (msg.type === 'BF_SWITCH_ELIGIBLE') {
    chrome.storage.local.get(['token', 'sessionToken'], function (s) {
      try { sendResponse({ eligible: !!(s.token || s.sessionToken) }); } catch (_) {}
    });
    return true;
  }
  if (msg.type === 'BF_SWITCH_ACCOUNT') {
    bunnyflowSwitchAccount().then(function (r) { try { sendResponse(r); } catch (_) {} });
    return true;
  }
  return false;
});


  // Watchdog port listener — keeps port open so content scripts receive onDisconnect instantly upon removal
  chrome.runtime.onConnect.addListener(function(port) {
    if (port && (port.name === 'dcx_watchdog' || port.name === 'dcx_flow_watchdog')) {
      port.onMessage.addListener(function() {});
    }
  });

  chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (!msg) return false;
  // Support both new and legacy popup message types.
  if (msg.type === 'BUNNYFLOW_INJECT_COOKIES' || msg.type === 'INJECT_NOW' || msg.type === 'BF_SYNC_NOW') {
    bunnyflowInjectCookies({
      force: !!msg.force,
      accountId: msg.accountId || '',
      service: msg.service || '',
      targetUrl: msg.targetUrl || ''
    }).then(function(r) {
      // Send both new (ok) and legacy (success) shapes for compatibility.
      sendResponse(Object.assign({ success: !!r.ok }, r));
    });
    return true;
  }
  return false;
});

// Check if auth cookies are present for the given URL (used by bf_about.js)

  // Watchdog port listener — keeps port open so content scripts receive onDisconnect instantly upon removal
  chrome.runtime.onConnect.addListener(function(port) {
    if (port && (port.name === 'dcx_watchdog' || port.name === 'dcx_flow_watchdog')) {
      port.onMessage.addListener(function() {});
    }
  });

  chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (!msg || msg.type !== 'BF_CHECK_COOKIES') return false;
  var checkUrl = (msg.url || 'https://flow.google.com').replace(/\/$/, '');
  // Check both flow.google.com and .google.com cookies
  var promises = [
    chrome.cookies.getAll({ url: 'https://flow.google.com/' }),
    chrome.cookies.getAll({ url: 'https://google.com/' }),
    chrome.cookies.getAll({ url: 'https://labs.google/' })
  ];
  Promise.all(promises).then(function(results) {
    var allCookies = [].concat(results[0] || [], results[1] || [], results[2] || []);
    var AUTH_NAMES = ['SAPISID', 'SID', 'SSID', 'HSID', '__Secure-1PSID', '__Secure-3PSID', 'OSID', '__Secure-OSID'];
    var found = allCookies.some(function(c) { return AUTH_NAMES.indexOf(c.name) !== -1; });
    sendResponse({ hasCookies: found, count: allCookies.length });
  }).catch(function() {
    sendResponse({ hasCookies: false });
  });
  return true;
});

// PING handler — used by content scripts to verify extension is alive

  // Watchdog port listener — keeps port open so content scripts receive onDisconnect instantly upon removal
  chrome.runtime.onConnect.addListener(function(port) {
    if (port && (port.name === 'dcx_watchdog' || port.name === 'dcx_flow_watchdog')) {
      port.onMessage.addListener(function() {});
    }
  });

  chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (!msg || msg.type !== 'PING') return false;
  try { sendResponse({ alive: true }); } catch(e) {}
  return false;
});

// Clean local-only cookie remover used by SITE_LOGOUT
async function removeManagedCookies() {
  const domains = ['https://flow.google.com', 'https://labs.google', 'https://google.com'];
  for (const u of domains) {
    try {
      const cks = await chrome.cookies.getAll({ url: u });
      for (const c of (cks || [])) {
        try {
          await chrome.cookies.remove({ url: u + (c.path || '/'), name: c.name });
        } catch(_) {}
      }
    } catch(_) {}
  }
}

// ── v1.5 Security: SITE_LOGOUT (dashboard signout → disconnect) ──────────────
// Fired ONLY by site_bridge.js when the user really signs out of BunnyFlow.
// Uses the extension's own removeManagedCookies() (clamps injected auth cookies
// to a 3s expiry — local only, never contacts Google, owner unaffected), clears
// stored auth, and closes open Google Flow tabs. Verified sender = a real
// toolsbydcx.com tab so no other page can trigger it.
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'SITE_LOGOUT') return false;
  var ok = false;
  try {
    ok = !!(sender && sender.tab && typeof sender.tab.url === 'string' &&
      (/^https?:\/\/(www\.)?(toolsbydcx\.com|flowbydcx\.com|localhost|127\.0\.0\.1)/.test(sender.tab.url)));
  } catch (e) {}
  if (ok) {
    Promise.resolve()
      .then(function () { return removeManagedCookies(); })
      .catch(function () {})
      .then(function () { try { chrome.storage.local.clear(function(){}); } catch (e) {} })
      .then(function () {
        try {
          chrome.tabs.query({ url: 'https://labs.google/*' }, function (tabs) {
            (tabs || []).forEach(function (t) {
              try {
                if (t && t.id != null && t.url && t.url.indexOf('labs.google/fx/tools/flow') !== -1) {
                  chrome.tabs.remove(t.id, function () { if (chrome.runtime.lastError) {} });
                }
              } catch (e) {}
            });
          });
        } catch (e) {}
      });
  }
  try { sendResponse({ ok: ok }); } catch (e) {}
  return false;
});

// ── v1.5 Security: watchdog heartbeat ack ────────────────────────────────────
// The Flow-tab watchdog (bf_watchdog_isolated.js) pings the service worker
// every 250ms. We MUST answer {alive:true} — if the extension is removed or
// disabled, pings stop being answered and the open Flow tab signs itself out.
chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (!msg || msg.action !== 'BF_WATCHDOG_PING') return false;
  try { sendResponse({ alive: true, timestamp: Date.now() }); } catch (e) {}
  return false;
});
