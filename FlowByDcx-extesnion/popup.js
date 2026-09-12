/* FlowByDcx popup */
const DEFAULT_API = 'https://toolsbydcx.com';
const RENEW_THRESHOLD_DAYS = 5; // show renew banner when <= 5 days left

function $(id) { return document.getElementById(id); }

async function getApiBase() {
  const r = await chrome.storage.local.get('apiBase');
  return r.apiBase || DEFAULT_API;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function computeDaysLeft(data) {
  if (data.daysRemaining !== undefined && data.daysRemaining !== null) {
    let dr = parseInt(data.daysRemaining, 10);
    if (!isNaN(dr)) return dr;
  }
  // Prefer extension2_days if present, otherwise compute from planExpires
  let days = parseInt(data.extension2_days, 10);
  if (!isNaN(days)) return days;
  const exp = data.planExpires || data.expirationDate || data.expiry;
  if (exp) {
    const d = new Date(exp);
    if (!isNaN(d.getTime())) {
      return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
    }
  }
  return null;
}

// Fetch the same "ToolsByDcx Credits" balance the dashboard shows
async function loadCredits(plan) {
  const el = $('ext2-credits');
  if (!el) return;

  try {
    const st = await chrome.storage.local.get(['token', 'sessionToken', 'apiBase', 'credits', 'creditsRemaining', 'heavyCredits']);
    if (typeof st.credits === 'number') {
      el.textContent = st.credits;
    } else if (typeof st.creditsRemaining === 'number') {
      el.textContent = st.creditsRemaining;
    }

    if ((plan || '').toLowerCase() === 'heavy' && typeof st.heavyCredits === 'number') {
      el.textContent = st.heavyCredits;
      return;
    }

    let token = st.token;
    if (!token && st.sessionToken) {
      token = st.sessionToken.includes(':') ? st.sessionToken.split(':')[1] : st.sessionToken;
    }
    let api = (st.apiBase || DEFAULT_API).replace(/\/$/, '');
    if (api.includes(':3000')) api = api.replace(':3000', ':5000');
    if (api.includes('flowbydcx.com') || api.includes('labs.google')) api = 'http://localhost:5000';

    if (!token) return;

    const res = await fetch(api + '/api/user/free-quota', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return;
    const q = await res.json();
    if (q && q.enforced === false) {
      el.textContent = '∞';
    } else if (q && typeof q.creditsRemaining === 'number') {
      el.textContent = q.creditsRemaining;
      chrome.storage.local.set({ credits: q.creditsRemaining, creditsLeft: q.creditsRemaining });
    }
  } catch (_) {}
}

function updateRenewBanner(days) {
  const banner = $('renew-banner');
  if (!banner) return;
  if (days !== null && days <= RENEW_THRESHOLD_DAYS && days >= 0) {
    $('renew-days').textContent = days;
    if (days === 0) {
      $('renew-msg').innerHTML = 'Your plan has <b>expired today</b>. Renew now to restore access.';
    } else if (days === 1) {
      $('renew-msg').innerHTML = 'Your plan expires in <b>1 day</b>. Renew to keep uninterrupted access.';
    } else {
      $('renew-msg').innerHTML = 'Your plan expires in <b>' + days + '</b> days. Renew to keep uninterrupted access.';
    }
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// ── Heart-lock: tryAutoConnect (ported from v3.9.8 popup_extra.js) ────────────
// Jab popup khule aur NOT connected ho, check karo koi portal tab open hai.
// Agar hai to: lock-emoji ❤️ → ⏳, header text "Auto-connecting…" ho jata hai,
// aur background ko BF_PORTAL_SYNC_REQ bhejta hai taake fresh auth mile.
function tryAutoConnect(storedToken) {
  if (storedToken) return; // already connected
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  chrome.tabs.query({ url: ['https://toolsbydcx.com/*', 'https://*.toolsbydcx.com/*', 'https://flowbydcx.com/*', 'https://*.flowbydcx.com/*', 'http://localhost/*', 'http://127.0.0.1/*'] }, function(tabs) {
    if (!tabs || tabs.length === 0) return;
    var lockEmoji = document.querySelector('.lock-emoji');
    var notConnH3 = document.querySelector('.not-connected-header h3');
    var notConnP  = document.querySelector('.not-connected-header p');
    if (lockEmoji)  lockEmoji.textContent = '⏳';
    if (notConnH3)  notConnH3.textContent = 'Auto-connecting\u2026';
    if (notConnP)   notConnP.textContent  = 'Syncing with your ToolsByDcx session\u2026';
    try {
      chrome.runtime.sendMessage({ type: 'BF_PORTAL_SYNC_REQ' }, function() {
        if (chrome.runtime.lastError) {}
      });
    } catch(_) {}
  });
}

// ── Auto-reload popup when SITE_AUTH saves auth to storage ───────────────────
// Problem: user visits portal → site_bridge sends SITE_AUTH → background saves
// data → but popup is already open showing "Not Connected".
// Fix: watch storage for userId/token arriving, then reload ONLY if not
// already connected (status-screen not visible).
(function() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) return;
  var _bfPopupReloaded = false;
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local' || _bfPopupReloaded) return;
    var authKeys = ['userId', 'token', 'sessionToken', 'authToken', 'jwt'];
    var gotAuth = authKeys.some(function(k) { return changes[k] && changes[k].newValue; });
    if (!gotAuth) return;
    var statusScreen = document.getElementById('status-screen');
    var isAlreadyConnected = statusScreen &&
      (statusScreen.style.display === 'block' || statusScreen.style.display === '');
    if (isAlreadyConnected) return;
    _bfPopupReloaded = true;
    setTimeout(function() { window.location.reload(); }, 350);
  });
})();

async function init() {
  const api = await getApiBase();
  if ($('api-base')) $('api-base').value = api;
  if ($('portal-dashboard-btn')) $('portal-dashboard-btn').href = api + '/dashboard';
  if ($('footer-dashboard-link')) $('footer-dashboard-link').href = api + '/dashboard';
  if ($('renew-plan-link')) $('renew-plan-link').href = api + '/pricing';

  const data = await chrome.storage.local.get([
    'userId', 'userName', 'userPlan',
    'cookieData', 'authSource', 'cookieSystemDisabled',
    'sessionCookieCount', 'extension2_days', 'planExpires', 'expirationDate',
    'token', 'sessionToken', 'authToken', 'jwt'
  ]);

  if (data.userId) {
    showStatusScreen(data);
  } else {
    showLoginScreen();
    // Heart-lock: attempt auto-connect from open portal tab (v3.9.8 behaviour)
    var storedToken = data.token || data.sessionToken || data.authToken || data.jwt || '';
    setTimeout(function() { tryAutoConnect(storedToken); }, 200);
  }
}

function showLoadingScreen() {
  $('loading-screen').style.display = 'flex';
  $('login-screen').style.display = 'none';
  $('status-screen').style.display = 'none';
}

function showLoginScreen() {
  $('loading-screen').style.display = 'none';
  $('login-screen').style.display = 'block';
  $('status-screen').style.display = 'none';
}

function showStatusScreen(data) {
  $('loading-screen').style.display = 'none';
  $('login-screen').style.display = 'none';
  $('status-screen').style.display = 'block';

  const name = data.userName || 'Connected';
  $('user-name').textContent = name;
  $('user-avatar').textContent = initials(name);
  const plan = (data.userPlan || 'basic');
  var _PL={'basic':'Basic','pro':'Flow Pro','ultra':'Flow Max','starter':'Starter','unlimited':'Unlimited VIP','heavy':'Heavy'};
  $('user-plan').textContent = (_PL[plan] || plan.charAt(0).toUpperCase() + plan.slice(1)) + ' Plan';

  const days = computeDaysLeft(data);
  if (days !== null) {
    $('user-days-text').textContent = days + ' day' + (days === 1 ? '' : 's') + ' left';
    $('ext2-days').textContent = days;
    $('ext2-days').style.color = days > 5 ? '#22c55e' : days > 0 ? '#f59e0b' : '#ef4444';
  } else {
    $('user-days-text').textContent = 'Active';
    $('ext2-days').textContent = '—';
  }
  updateRenewBanner(days);

  const sessions = data.sessionCookieCount || (data.cookieData ? data.cookieData.length : 0);
  $('cookies-count').textContent = sessions;

  // Live "Bunny AI Credits" balance (same source as the dashboard widget).
  loadCredits(plan);

  const autoBadge = $('auto-badge');
  autoBadge.style.display = data.authSource === 'site' ? 'inline-flex' : 'none';

  const disBanner = $('disabled-banner');
  if (data.cookieSystemDisabled) {
    if (disBanner) disBanner.style.display = 'flex';
    $('cookies-count').textContent = 'OFF';
    $('cookies-count').style.color = '#ef4444';
    $('inject-btn').style.display = 'none';
  } else {
    if (disBanner) disBanner.style.display = 'none';
    $('cookies-count').style.color = '';
  }

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const tabUrl = (tab && tab.url) || '';
    const onFlow = tabUrl.includes('flow.google.com') || tabUrl.includes('labs.google/fx/tools/flow');
    const onChatGPT = tabUrl.includes('chatgpt.com') || tabUrl.includes('openai.com');
    const onClaude = tabUrl.includes('claude.ai');

    let activeTool = null;
    let serviceName = '';
    if (onFlow) { activeTool = 'Google Flow'; serviceName = 'google_flow'; }
    else if (onChatGPT) { activeTool = 'ChatGPT'; serviceName = 'chatgpt'; }
    else if (onClaude) { activeTool = 'Claude'; serviceName = 'claude'; }

    const ind = $('page-indicator');
    const injectBtn = $('inject-btn');

    if (data.cookieSystemDisabled) {
      if (ind) ind.className = 'flow-badge inactive';
      if ($('page-text')) $('page-text').textContent = 'Session system disabled by admin';
      if (injectBtn) injectBtn.style.display = 'none';
      return;
    }

    if (activeTool) {
      if (ind) ind.className = 'flow-badge active';
      if ($('page-text')) $('page-text').textContent = 'On ' + activeTool + ' — Ready';
      if (injectBtn) {
        injectBtn.style.display = 'block';
        injectBtn.textContent = '⚡ Inject ' + activeTool + ' Session';
        injectBtn.dataset.service = serviceName;
        injectBtn.dataset.targetUrl = tabUrl;
      }
    } else {
      if (ind) ind.className = 'flow-badge active';
      if ($('page-text')) $('page-text').textContent = 'ToolsByDcx Active';
      if (injectBtn) {
        injectBtn.style.display = 'block';
        injectBtn.textContent = '⚡ Inject Active Tool Session';
        injectBtn.dataset.service = '';
        injectBtn.dataset.targetUrl = tabUrl;
      }
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.extension2_days !== undefined || changes.planExpires !== undefined) {
    chrome.storage.local.get(['extension2_days', 'planExpires', 'expirationDate'], d => {
      const days = computeDaysLeft(d);
      if (days !== null && $('status-screen').style.display !== 'none') {
        $('user-days-text').textContent = days + ' day' + (days === 1 ? '' : 's') + ' left';
        $('ext2-days').textContent = days;
        $('ext2-days').style.color = days > 5 ? '#22c55e' : days > 0 ? '#f59e0b' : '#ef4444';
        updateRenewBanner(days);
      }
    });
  }
});

$('save-api')?.addEventListener('click', async () => {
  const v = $('api-base').value.trim().replace(/\/$/, '');
  if (!v) return;
  await chrome.storage.local.set({ apiBase: v });
  $('save-api').textContent = '✓';
  setTimeout(() => { $('save-api').textContent = 'Save'; }, 1500);
});

$('login-btn')?.addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const password = $('login-password').value.trim();
  const errEl = $('login-error');
  if (!email || !password) {
    errEl.textContent = 'Enter your email and password.';
    errEl.style.display = 'block';
    return;
  }
  const btn = $('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in...';
  errEl.style.display = 'none';
  try {
    const api = await getApiBase();
    const res = await fetch(api + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, version: '1.4' }),
      credentials: 'include'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Login failed');

    const cRes = await fetch(api + '/api/user/cookies', { credentials: 'include', headers: { 'X-Ext-Version': '1.4' } });
    const cJson = await cRes.json();
    const disabled = !!cJson.disabled;

    await chrome.storage.local.set({
      userId: json.user.id,
      userName: json.user.name,
      userPlan: (json.user.plan || '').toLowerCase(),
      planExpires: json.user.planExpires || json.user.expiresAt || null,
      // Store the real JWT so /api/extension/inject-cookies can verify us.
      token: json.token || '',
      sessionToken: json.token ? (json.user.id + ':' + json.token) : (json.user.id + ':' + email),
      cookieData: disabled ? [] : (cJson.cookies || []),
      apiBase: api,
      authSource: 'manual',
      cookieSystemDisabled: disabled
    });
    // Trigger an immediate cookie injection so the user lands logged-in.
    try { chrome.runtime.sendMessage({ type: 'BUNNYFLOW_INJECT_COOKIES', force: true }, function(){}); } catch (_) {}
    showStatusScreen({
      userName: json.user.name,
      userPlan: json.user.plan,
      planExpires: json.user.planExpires || json.user.expiresAt || null,
      cookieData: disabled ? [] : (cJson.cookies || []),
      authSource: 'manual',
      cookieSystemDisabled: disabled
    });
  } catch (e) {
    if (e.message === 'UPDATE_REQUIRED') {
      errEl.innerHTML = '<b>Update Required:</b> Please download the latest version of the ToolsByDcx extension to continue.';
    } else {
      errEl.textContent = e.message || 'Connection failed. Check the server URL.';
    }
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

$('inject-btn')?.addEventListener('click', () => {
  const btn = $('inject-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Injecting...';

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const targetUrl = btn.dataset.targetUrl || (tab && tab.url) || '';
    const service = btn.dataset.service || '';

    chrome.runtime.sendMessage({
      type: 'INJECT_NOW',
      force: true,
      targetUrl: targetUrl,
      service: service
    }, resp => {
      if (resp && (resp.success || resp.ok)) {
        btn.textContent = '✓ Injected! Reloading...';
        if (tab && tab.id) {
          setTimeout(() => {
            try { chrome.tabs.reload(tab.id); } catch(_) {}
          }, 300);
        }
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '⚡ Inject Session';
        }, 2500);
      } else {
        btn.disabled = false;
        btn.textContent = 'Failed: ' + ((resp && (resp.reason || resp.error)) || 'Retry');
        setTimeout(() => {
          btn.textContent = '⚡ Inject Session';
        }, 3000);
      }
    });
  });
});

$('logout-btn')?.addEventListener('click', async () => {
  const btn = $('logout-btn');
  btn.disabled = true;
  btn.textContent = 'Disconnecting...';
  try {
    const stored = await chrome.storage.local.get(['cookieData', 'originalCookies']);
    const cookies = stored.cookieData || [];
    const original = stored.originalCookies || [];
    await Promise.allSettled(cookies.map(c => {
      try {
        const url = 'https://' + (c.domain || '').replace(/^\./, '') + (c.path || '/');
        return chrome.cookies.remove({ url, name: c.name }).catch(() => null);
      } catch { return Promise.resolve(null); }
    }));
    if (original.length) {
      await Promise.allSettled(original.map(c => {
        try {
          const dom = (c.domain || '').replace(/^\./, '');
          const cd = {
            url: 'https://' + dom + (c.path || '/'),
            name: c.name, value: c.value, path: c.path || '/',
            secure: c.secure !== false, httpOnly: c.httpOnly !== false,
            sameSite: c.sameSite || 'lax'
          };
          if (!c.hostOnly && c.domain) cd.domain = c.domain;
          if (c.expirationDate && !c.session) cd.expirationDate = c.expirationDate;
          return chrome.cookies.set(cd).catch(() => null);
        } catch { return Promise.resolve(null); }
      }));
    }
    // Also remove all ChatGPT and OpenAI cookies
    try {
      const cgptCookies = await chrome.cookies.getAll({ domain: 'chatgpt.com' });
      const oaiCookies = await chrome.cookies.getAll({ domain: 'openai.com' });
      await Promise.allSettled([...(cgptCookies || []), ...(oaiCookies || [])].map(c => {
        const url = (c.secure ? 'https://' : 'http://') + (c.domain || '').replace(/^\./, '') + (c.path || '/');
        return chrome.cookies.remove({ url, name: c.name }).catch(() => null);
      }));
    } catch (_) {}

    await chrome.storage.local.clear();
    chrome.tabs.query({}, tabs => {
      (tabs || []).forEach(t => {
        if (t && t.url && (t.url.includes('chatgpt.com') || t.url.includes('labs.google') || t.url.includes('flow.google.com'))) {
          try { chrome.tabs.reload(t.id); } catch(_) {}
        }
      });
    });
    showLoginScreen();
  } catch (e) {
    await chrome.storage.local.clear();
    showLoginScreen();
  }
});

$('switch-account-btn')?.addEventListener('click', () => {
  const btn = $('switch-account-btn');
  const feedback = $('account-switch-feedback');
  btn.disabled = true;
  btn.textContent = '↻ Switching...';
  if (feedback) {
    feedback.style.display = 'block';
    feedback.textContent = 'Requesting active pool account rotation...';
    feedback.style.color = '#38bdf8';
  }

  chrome.runtime.sendMessage({ type: 'BF_SWITCH_ACCOUNT' }, resp => {
    btn.disabled = false;
    btn.textContent = '↻ Switch';
    if (!resp || chrome.runtime.lastError) {
      if (feedback) {
        feedback.textContent = 'Connection error. Please try again.';
        feedback.style.color = '#ef4444';
      }
      return;
    }

    if (resp.ok) {
      if (feedback) {
        feedback.textContent = '✓ Swapped to fresh pool account!';
        feedback.style.color = '#22c55e';
      }
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 3000);
    } else {
      if (feedback) {
        feedback.textContent = resp.error === 'rate_limited'
          ? 'Switch limit reached. Please wait.'
          : (resp.error || 'Switch failed.');
        feedback.style.color = '#ef4444';
      }
    }
  });
});

$('account-selector')?.addEventListener('change', (e) => {
  if (e.target.value !== 'auto') {
    $('switch-account-btn')?.click();
  }
});

$('login-password')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('login-btn').click();
});

init();
