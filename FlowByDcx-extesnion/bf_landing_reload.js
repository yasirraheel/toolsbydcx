// BunnyFlow — logged-out Flow landing auto-login (v38: NO AUTO-RELOAD).
// Jab user extension ke sath labs.google/fx/tools/flow kholta hai aur Google
// ka LOGGED-OUT landing page dikhta hai ("Create with Google Flow" hero),
// to background se FORCE cookie inject karwao aur RED English banner dikhao:
// user KHUD refresh kare. Owner ka hukm (v38): page KABHI khud reload na ho —
// v36 ka auto-reload chalte kaam ke beech page refresh kar ke signout screen
// par utar deta tha. Ab reload SIRF user ke apne click se hota hai.
//
// Transient-flash guard: landing marker do dafa (2s ke waqfe se) dikhe tabhi
// action lo — React ka aik lamhe ka logged-out flash kabhi trigger na kare.
// Logged-in tool page par ye script kuch NAHI karta.
(function () {
  'use strict';
  if (window.top !== window) return;

  var CHECK_MS = 1500;
  var MAX_CHECKS = 20;          // ~30s tak landing dhoondo, phir hamesha chup
  var CONFIRM_MS = 2000;        // marker dobara confirm karne ka waqfa
  var _checks = 0;
  var _acted = false;

  // Logged-out landing ka pakka nishaan: "Create with Google Flow" button/CTA.
  // Logged-in tool page par ye text nahi hota.
  function isLoggedOutLanding() {
    try {
      var els = document.querySelectorAll('a,button');
      for (var i = 0; i < els.length; i++) {
        var t = (els[i].textContent || '').replace(/\s+/g, ' ').trim();
        if (/create with google flow/i.test(t)) return true;
      }
    } catch (_) {}
    return false;
  }

  function showBanner(msg) {
    try {
      var old = document.getElementById('__bf_landing_banner__');
      if (old) old.remove();
      var b = document.createElement('div');
      b.id = '__bf_landing_banner__';
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
        'background:#dc2626;color:#fff;padding:10px 16px;text-align:center;' +
        'font:700 14px system-ui,-apple-system,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);' +
        'display:flex;align-items:center;justify-content:center;gap:12px;';
      var span = document.createElement('span');
      span.textContent = msg;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '\u21BB Refresh now';
      btn.style.cssText = 'all:initial;cursor:pointer;background:#fff;color:#b91c1c;' +
        'padding:6px 14px;border-radius:999px;font:700 13px system-ui,sans-serif;';
      // Reload SIRF user ke apne click par (owner rule: khud kabhi nahi).
      btn.onclick = function () { try { location.reload(); } catch (_) {} };
      b.appendChild(span);
      b.appendChild(btn);
      (document.body || document.documentElement).appendChild(b);
    } catch (_) {}
  }

  function attemptAutoLogin() {
    if (_acted) return;
    _acted = true;
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        showBanner('FlowByDcx: Extension not reachable \u2014 please refresh this page.');
        return;
      }
      chrome.runtime.sendMessage({ type: 'BUNNYFLOW_INJECT_COOKIES', force: true }, function (r) {
        try {
          if (chrome.runtime.lastError) {
            showBanner('FlowByDcx: Extension not reachable \u2014 please refresh this page.');
            return;
          }
          if (r && r.ok && (r.applied === undefined || r.applied > 0)) {
            // Cookies lag gayeen — ab user khud refresh kare (KHUD kabhi nahi).
            showBanner('FlowByDcx: You are logged in \u2014 press Refresh to open Flow.');
            return;
          }
          // Inject na ho saka (login nahi / cookies nahi / pool khali).
          showBanner('FlowByDcx: Could not log you in automatically \u2014 please log in to your FlowByDcx dashboard, then refresh this page.');
        } catch (_) {}
      });
    } catch (_) {
      showBanner('FlowByDcx: Please refresh this page to open Flow.');
    }
  }

  (function tick() {
    if (_acted) return;
    if (isLoggedOutLanding()) {
      // Do-dafa confirm: 2s baad bhi landing hi ho tabhi action (flash-guard).
      setTimeout(function () {
        if (!_acted && isLoggedOutLanding()) attemptAutoLogin();
        else if (!_acted && ++_checks < MAX_CHECKS) setTimeout(tick, CHECK_MS);
      }, CONFIRM_MS);
      return;
    }
    if (++_checks < MAX_CHECKS) setTimeout(tick, CHECK_MS);
  })();
})();
