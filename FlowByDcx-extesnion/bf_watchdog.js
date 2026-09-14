// ToolsByDcx Watchdog — detects extension removal on Google Flow & Labs
const CHECK_INTERVAL = 300;   // Check chrome.runtime.id every 300ms
const CONFIRM_CHECKS = 2;     // Require 2 consecutive failures (~600ms)
let goneCount = 0;
let isDead = false;

function clearLocalCookiesAndRedirect() {
  if (isDead) return;
  isDead = true;
  try { sessionStorage.removeItem('__bf_alive__'); } catch(e) {}
  try {
    var paths = ['/', '/fx', '/fx/tools', '/fx/tools/flow', '/fx/api', '/fx/api/auth'];
    var domains = ['', '.labs.google', 'labs.google', '.flow.google.com', 'flow.google.com', '.google.com'];
    var names = (document.cookie || '').split(';').map(function(c){ return (c.split('=')[0]||'').trim(); }).filter(Boolean);
    for (var n = 0; n < names.length; n++) {
      for (var p = 0; p < paths.length; p++) {
        for (var d = 0; d < domains.length; d++) {
          var s = names[n] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + paths[p];
          if (domains[d]) s += ';domain=' + domains[d];
          document.cookie = s;
          document.cookie = s + ';secure';
        }
      }
    }
  } catch(e) {}
  try { localStorage.clear(); } catch(e) {}
  try { sessionStorage.clear(); } catch(e) {}
  try { window.location.replace('about:blank'); } catch(e) { window.location.href = 'about:blank'; }
}

function isExtensionGone() {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return true;
    chrome.runtime.getURL('');
    return false;
  } catch(_) {
    return true;
  }
}

function check() {
  if (isDead) return;
  if (isExtensionGone()) {
    goneCount++;
    if (goneCount >= CONFIRM_CHECKS) {
      try { window.postMessage({ type: 'BF_EXTENSION_DISCONNECTED', reason: 'gone', timestamp: Date.now() }, '*'); } catch(e) {}
      clearLocalCookiesAndRedirect();
    }
  } else {
    goneCount = 0;
    try { sessionStorage.setItem('__bf_alive__', String(Date.now())); } catch(e) {}
  }
}

setInterval(check, CHECK_INTERVAL);
check();
window.addEventListener('focus', check);
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') check();
});
