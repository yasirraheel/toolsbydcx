// BunnyFlow — "Switch Server" button on Google's sign-in page.
//
// Jab pool ka account mar jata hai to user accounts.google.com ke sign-in page
// par phans jata hai. Ye script wahan ek floating button dikhati hai jo server
// se ISI user ke liye DUSRA pool account mangti hai (koi global side effect
// nahi — report-session-denied kabhi use nahi karna), phir background force
// cookie re-inject kar ke tab wapas Flow par bhejta hai.
//
// Sirf tab dikhta hai jab:
//   1. Ye Google ka SIGN-IN path ho (roz-marra ke Google pages par nahi), aur
//   2. Sign-in Flow/labs.google se aaya ho (continue= ya referrer mein labs.google), aur
//   3. Extension ke paas BunnyFlow token ho (background se BF_SWITCH_ELIGIBLE).
(function () {
  'use strict';
  if (window.top !== window) return; // iframes mein kuch nahi

  var path = location.pathname || '';
  var SIGNIN_RE = /^\/(v3\/)?signin|^\/ServiceLogin|^\/InteractiveLogin|^\/speedbump|^\/AccountChooser/i;
  if (!SIGNIN_RE.test(path)) return;

  var href = location.href;
  try { href = decodeURIComponent(href); } catch (_) {}
  var fromFlow = /labs\.google/i.test(href) || /labs\.google/i.test(document.referrer || '');
  if (!fromFlow) return; // user ka apna personal Google sign-in — button mat dikhao

  try {
    chrome.runtime.sendMessage({ type: 'BF_SWITCH_ELIGIBLE' }, function (r) {
      if (chrome.runtime.lastError) return;
      if (r && r.eligible) mount();
    });
  } catch (_) {}

  var busy = false;

  function mount() {
    if (document.getElementById('__bf_switch_wrap__')) return;
    var wrap = document.createElement('div');
    wrap.id = '__bf_switch_wrap__';
    wrap.style.cssText = 'position:fixed;bottom:22px;right:22px;z-index:2147483647;' +
      'display:flex;flex-direction:column;align-items:flex-end;gap:8px;font:600 13px system-ui,-apple-system,sans-serif;';

    var note = document.createElement('div');
    note.id = '__bf_switch_note__';
    note.style.cssText = 'display:none;background:rgba(17,17,27,.92);color:#e5e7eb;padding:8px 12px;' +
      'border-radius:10px;border:1px solid rgba(139,92,246,.35);max-width:280px;text-align:right;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.35);';

    var btn = document.createElement('button');
    btn.id = '__bf_switch_btn__';
    btn.type = 'button';
    btn.textContent = '\u21BB Switch Server';
    btn.style.cssText = 'all:initial;cursor:pointer;display:inline-flex;align-items:center;gap:8px;' +
      'background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:12px 20px;border-radius:999px;' +
      'font:700 14px system-ui,-apple-system,sans-serif;box-shadow:0 8px 24px rgba(124,58,237,.45);' +
      'border:1px solid rgba(255,255,255,.18);';
    btn.onmouseenter = function () { btn.style.filter = 'brightness(1.1)'; };
    btn.onmouseleave = function () { btn.style.filter = ''; };
    btn.onclick = doSwitch;

    wrap.appendChild(note);
    wrap.appendChild(btn);
    (document.body || document.documentElement).appendChild(wrap);
  }

  function say(msg) {
    var n = document.getElementById('__bf_switch_note__');
    if (!n) return;
    n.textContent = msg;
    n.style.display = msg ? 'block' : 'none';
  }

  function doSwitch() {
    if (busy) return;
    busy = true;
    var btn = document.getElementById('__bf_switch_btn__');
    if (btn) { btn.textContent = '\u21BB Switching\u2026'; btn.style.opacity = '.7'; btn.style.pointerEvents = 'none'; }
    say('Getting a new account\u2026');
    try {
      chrome.runtime.sendMessage({ type: 'BF_SWITCH_ACCOUNT' }, function (r) {
        if (chrome.runtime.lastError || !r) return fail('Connection problem \u2014 please try again.');
        if (r.ok) {
          if (r.switched === false && (r.poolSize || 0) > 1) return fail('Landed on the same account \u2014 please press again.');
          if (r.switched === false && (r.poolSize || 0) <= 1) return fail('Only one account is available on your pool right now.');
          // v41.1: agar naya account mila magar cookies apply na huin to Flow
          // par bhejna bekar hai — wahan phir signin hi milega. Wajah dikhao.
          if (r.injected === false) return fail('Account mil gaya, but cookies failed (' + (r.injectReason || 'unknown') + ') \u2014 press again.');
          say('Switched! Opening Flow\u2026');
          setTimeout(function () {
            try { location.replace('https://labs.google/fx/tools/flow'); } catch (_) {}
          }, 600);
          return;
        }
        if (r.error === 'rate_limited') {
          var mins = r.retryAfterSec ? Math.ceil(r.retryAfterSec / 60) : 30;
          return fail('Switch limit reached \u2014 try again in ' + mins + ' minutes.');
        }
        if (r.error === 'no_token') return fail('Please log in to your FlowByDcx dashboard first.');
        if (r.error === 'plan_expired') return fail('Your plan has expired \u2014 please renew.');
        if (r.error === 'pool_empty') return fail('No server account is available for your plan right now \u2014 please contact support.');
        fail('Switch failed (' + (r.error || 'unknown') + (r.detail ? ': ' + r.detail : '') + ') \u2014 please try again.');
      });
    } catch (_) { fail('Switch failed \u2014 please try again.'); }
  }

  function fail(msg) {
    busy = false;
    say(msg);
    var btn = document.getElementById('__bf_switch_btn__');
    if (btn) { btn.textContent = '\u21BB Switch Server'; btn.style.opacity = ''; btn.style.pointerEvents = ''; }
  }
})();
