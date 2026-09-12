// FlowByDcx Site Bridge v3.3
// Runs on FlowByDcx platform — auto-connects extension on any supported domain

const STORAGE_KEY = '__flow_auth__';
const HEARTBEAT_KEY = '__bf_ext_active';
const HEARTBEAT_INTERVAL = 20000; // 20 seconds

// Set extension presence heartbeat so platform knows extension is active.
function setHeartbeat() {
  try {
    localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
  } catch(e) {}
}

setHeartbeat();
setInterval(setHeartbeat, HEARTBEAT_INTERVAL);

// Normalize origin: use active platform origin or fallback
function _bfNormalizeOrigin(origin) {
  if (!origin) return 'https://toolsbydcx.com';
  // Strip www if present
  return origin.replace('https://www.', 'https://').replace('http://www.', 'http://');
}

// Debounce: only call syncAuth at most once per 3 seconds
var _bfSyncTimer = null;
function syncAuthDebounced() {
  if (_bfSyncTimer) return; // already pending, skip
  _bfSyncTimer = setTimeout(function() {
    _bfSyncTimer = null;
    syncAuth();
  }, 3000);
}

// Core sync: read __flow_auth__ from localStorage and send SITE_AUTH to background
function syncAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.userId) return;
    const apiBase = _bfNormalizeOrigin(window.location.origin);
    chrome.runtime.sendMessage(
      { type: 'SITE_AUTH', data: { ...data, apiBase } },
      () => { if (chrome.runtime.lastError) {} }
    );
  } catch(e) {}
}

// Run immediately (catches already-logged-in users)
syncAuth();

// ── Primary trigger: custom event dispatched by auth.tsx the moment auth is ready ──
// This fires as soon as React finishes the login or user-data fetch — no polling needed
window.addEventListener('__bf_auth_ready__', (e) => {
  try {
    const data = e.detail;
    if (!data || !data.userId) return;
    chrome.runtime.sendMessage(
      { type: 'SITE_AUTH', data: { ...data, apiBase: _bfNormalizeOrigin(window.location.origin) } },
      () => { if (chrome.runtime.lastError) {} }
    );
  } catch(e) {}
});

// ── Fallback: poll 6× every 5 seconds (30s total) if event was missed ──
// (Covers slow APIs and cases where __bf_auth_ready__ event is missed)
var _bfPollCount = 0;
var _bfPollTimer = setInterval(function() {
  _bfPollCount++;
  syncAuth();
  if (_bfPollCount >= 6) clearInterval(_bfPollTimer); // poll 6× every 5s = 30s
}, 5000);

// ── Fallback 2: storage event from other tabs (no debounce needed, rare) ──
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) syncAuth();
});

// ── Listen for BF_SYNC_NOW from background (triggered by popup) ──
// When the popup opens while on the portal, it asks background to trigger a sync.
// Background sends BF_SYNC_NOW here, we call syncAuth() immediately.
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg && msg.type === 'BF_SYNC_NOW') {
    syncAuth();
    sendResponse({ ok: true });
  }
  return false;
});

// Listen for launch account events from platform
function _handlePlatformLaunch(e) {
  try {
    syncAuth();
    var detail = (e && e.detail) || {};
    chrome.runtime.sendMessage({
      type: 'BUNNYFLOW_INJECT_COOKIES',
      force: true,
      accountId: detail.accountId || '',
      service: detail.service || '',
      targetUrl: detail.targetUrl || ''
    }, function() {
      if (chrome.runtime.lastError) {}
    });
  } catch(err) {}
}
window.addEventListener('__flow_launch_account__', _handlePlatformLaunch);
window.addEventListener('FLOW_LAUNCH_TOOL', _handlePlatformLaunch);

// Listen for video open events from platform
window.addEventListener('FLOW_OPEN_VIDEO', (e) => {
  if (e && e.detail && e.detail.url) {
    chrome.runtime.sendMessage(
      { type: 'OPEN_VIDEO', url: e.detail.url },
      () => { if (chrome.runtime.lastError) {} }
    );
  }
});

// ── v1.5 Security: real signout sync ─────────────────────────────────────────
// When the user ACTUALLY signs out of BunnyFlow, tell background to disconnect
// the extension, wipe injected Google cookies, and close open Google Flow tabs.
// SAFETY: only explicit signals — never network errors or missing-data guesses —
// so connected users are never falsely disconnected.
function _bfSendSiteLogout() {
  try {
    chrome.runtime.sendMessage({ type: 'SITE_LOGOUT' }, function() {
      if (chrome.runtime.lastError) {}
    });
  } catch (e) {}
}

// Primary trigger: explicit event dispatched by the site's logout() function.
window.addEventListener('__bf_logout__', function() { _bfSendSiteLogout(); });

// Fallback trigger (works even before the site ships the event): the site's
// logout() removes BOTH `flow_token` and `__flow_auth__` from localStorage and
// nothing else ever removes them. So: only if we PREVIOUSLY saw auth present in
// this tab AND both keys are now gone, treat it as a real signout.
var _bfHadAuth = false;
var _bfAuthUnreadable = false;
function _bfAuthPresent() {
  _bfAuthUnreadable = false;
  try { return !!(localStorage.getItem('flow_token') || localStorage.getItem('__flow_auth__')); }
  catch (e) { _bfAuthUnreadable = true; return true; } // unreadable → assume present (fail SAFE, never disconnect)
}
if (_bfAuthPresent()) _bfHadAuth = true;

// Core check — also covers the navigation race: logout() redirects instantly,
// so the signed-out state is often only visible on the NEXT page load. If the
// EXTENSION is still connected (has userId) but the SITE has no auth keys,
// that state can only exist after a real signout → disconnect.
function _bfCheckSignedOut() {
  var present = _bfAuthPresent();
  if (_bfAuthUnreadable) return;              // can't read → do nothing (safe)
  if (present) { _bfHadAuth = true; return; } // logged in → all good
  try {
    chrome.storage.local.get(['userId'], function (st) {
      if (chrome.runtime.lastError) return;
      if (!st || !st.userId) { _bfHadAuth = false; return; } // ext not connected → nothing to do
      // Extension connected + site signed out → real signout happened.
      _bfHadAuth = false;
      _bfSendSiteLogout();
    });
  } catch (e) {}
}
// Run shortly after load (catches the post-logout landing page) and keep polling.
setTimeout(_bfCheckSignedOut, 1500);
setInterval(_bfCheckSignedOut, 4000);

// Cross-tab: another dashboard tab logged out (storage event fires here with
// newValue null). Same both-keys-gone rule applies.
window.addEventListener('storage', function(e) {
  if (!e || (e.key !== 'flow_token' && e.key !== '__flow_auth__')) return;
  if (e.newValue == null) _bfCheckSignedOut();
});

// ── v1.5: live presence signal for the dashboard badge ──────────────────────
// Marker tells the page a bridge script exists. The dashboard pings via
// window.postMessage; we answer ONLY after a real round-trip to the service
// worker, so an orphaned script (extension removed/disabled) reports dead.
try { document.documentElement.setAttribute('data-bf-ext-bridge', '1'); } catch (e) {}
window.addEventListener('message', function (e) {
  if (e.source !== window || !e.data || e.data.type !== '__bf_ext_ping__') return;
  try {
    chrome.runtime.sendMessage({ action: 'BF_WATCHDOG_PING' }, function (resp) {
      var alive = !chrome.runtime.lastError && !!(resp && resp.alive === true);
      window.postMessage({ type: '__bf_ext_pong__', alive: alive, ts: Date.now() }, '*');
    });
  } catch (err) {
    window.postMessage({ type: '__bf_ext_pong__', alive: false, ts: Date.now() }, '*');
  }
});

// ── Sync any stored projects on platform load ──
try {
  chrome.storage.local.get(['__flow_my_projects'], function(res) {
    if (chrome.runtime.lastError) return;
    var list = res && res.__flow_my_projects;
    if (Array.isArray(list) && list.length > 0) {
      list.forEach(function(item) {
        if (!item || typeof item !== 'string') return;
        var m = item.match(/project\/([a-zA-Z0-9_-]{4,})/i);
        if (m && m[1]) {
          chrome.runtime.sendMessage({
            type: 'SAVE_PROJECT',
            projectId: m[1],
            projectUrl: 'https://labs.google/fx/tools/flow/project/' + m[1],
            title: 'Flow Project'
          }, function() { if (chrome.runtime.lastError) {} });
        }
      });
    }
  });
} catch(e) {}

