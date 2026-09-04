// BunnyFlow Extra v4.4 — plan expiry blocking + visual cleanup
// This file handles visual cleanup (badge removal) + video hiding + plan enforcement
(function () {
  'use strict';

  // ── 0. PLAN EXPIRY CHECK ──────────────────────────────────────────────────
  // Runs in isolated world so has chrome.storage access
  function getDaysRemaining(data) {
    if (data.daysRemaining != null) return Math.max(0, parseInt(data.daysRemaining) || 0);
    if (data.planExpiresAt) {
      const ms = new Date(data.planExpiresAt).getTime() - Date.now();
      return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }
    return null;
  }

  function showExpiredOverlay(serverUrl) {
    const overlay = document.createElement('div');
    overlay.id = '__bf_expired__';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647',
      background: 'rgba(10,6,18,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', color: '#fff',
    });
    const dashUrl = serverUrl ? serverUrl.replace(/\/+$/, '') + '/dashboard' : '#';
    overlay.innerHTML = `
      <div style="text-align:center;max-width:400px;padding:32px">
        <div style="font-size:48px;margin-bottom:16px">🚫</div>
        <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#f87171">Plan Expired</h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;line-height:1.6">
          Your ToolsByDcx plan has expired.<br>
          Contact your admin to renew access.
        </p>
        <a href="${dashUrl}" target="_blank"
           style="display:inline-block;padding:10px 24px;background:#7c3aed;color:#fff;
                  border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Go to Dashboard
        </a>
      </div>`;
    function inject() {
      if (!document.getElementById('__bf_expired__') && document.body) {
        document.body.appendChild(overlay);
      }
    }
    inject();
    new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
  }

  function showWarningBanner(days, serverUrl) {
    if (document.getElementById('__bf_warn__')) return;
    var banner = document.createElement('div');
    banner.id = '__bf_warn__';
    banner.style.cssText =
      'position:fixed!important;bottom:16px!important;right:16px!important;' +
      'z-index:2147483647!important;background:linear-gradient(135deg,#7f1d1d,#991b1b)!important;' +
      'color:#fff!important;border-radius:10px!important;' +
      'padding:12px 14px!important;font-size:13px!important;font-family:system-ui,sans-serif!important;' +
      'display:flex!important;align-items:center!important;gap:10px!important;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5)!important;max-width:300px!important;';

    // Icon
    var icon = document.createElement('span');
    icon.style.fontSize = '18px';
    icon.textContent = '\u26a0\ufe0f';

    // Text block
    var textWrap = document.createElement('span');
    textWrap.style.flex = '1';

    var strong = document.createElement('strong');
    strong.textContent = days + ' day' + (days === 1 ? '' : 's') + ' left';
    var label = document.createTextNode(' on your ToolsByDcx plan.');
    textWrap.appendChild(strong);
    textWrap.appendChild(label);

    // Renew link
    var br = document.createElement('br');
    var link = document.createElement('a');
    link.href = 'http://localhost:3000/pricing';
    link.target = '_blank';
    link.style.cssText = 'color:#fca5a5!important;font-weight:600!important;text-decoration:none!important;';
    link.textContent = 'Renew now \u2192';
    textWrap.appendChild(br);
    textWrap.appendChild(link);

    // Close button
    var xBtn = document.createElement('button');
    xBtn.style.cssText = 'background:none!important;border:none!important;color:#fca5a5!important;' +
      'cursor:pointer!important;font-size:16px!important;margin-left:auto!important;padding:0!important;';
    xBtn.textContent = '\u2715';
    xBtn.addEventListener('click', function() { banner.remove(); });

    banner.appendChild(icon);
    banner.appendChild(textWrap);
    banner.appendChild(xBtn);

    if (document.body) document.body.appendChild(banner);
    else document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(banner); });
  }

  function injectCSS() {
    if (document.getElementById('__bf__')) return;
    const s = document.createElement('style');
    s.id = '__bf__'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  injectCSS();
  new MutationObserver(injectCSS).observe(document.documentElement, { childList: true });

  // ── 2. MATCHERS ───────────────────────────────────────────────────────────
  const LOCK_RE  = /veo.*(quality|fast(?!.*lower))|\bquality\b|\bfast\b/i;
  const LP_RE    = /low(?:er)?[\s._-]*priority|\blite\b|veo.*lite/i;
  const FREE_RE  = /nano.{0,5}banana|pro.{0,5}imagen|^imagen\b|veo.*lite|\blite\b/i;
  const OMNI_RE  = /omni[\s._-]*flash/i;

  let _userPlan = 'basic';
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['userPlan'], function(res) {
      if (res.userPlan) _userPlan = res.userPlan.toLowerCase();
      applyPlanClass();
      if (_userPlan === 'ultra') setTimeout(function() { unlockFreeModels(); }, 0);
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.userPlan) {
        _userPlan = changes.userPlan.newValue.toLowerCase();
        applyPlanClass();
        if (_userPlan === 'ultra') setTimeout(function() { unlockFreeModels(); }, 0);
      }
    });
  }
  function isUltra() { return _userPlan === 'ultra'; }
  function applyPlanClass() {
    // Set data-bf-plan on <html> — CSS uses this for instant React-proof locking
    document.documentElement.dataset.bfPlan = _userPlan || 'basic';
  }
  // Apply immediately (before async storage resolves) so CSS lock is instant
  applyPlanClass();

  const OPT_SEL = '[role="option"],[role="menuitem"],[role="listitem"],li,[tabindex="0"],[tabindex="-1"]';

  function shouldFreeUnlock(txt) {
    if (!txt || txt.length > 120) return false;
    if (isUltra() && LOCK_RE.test(txt)) return true;
    return LP_RE.test(txt) || FREE_RE.test(txt);
  }

  // ── 3. LOCK non-free video models ─────────────────────────────────────────
  function lockModels() {
    return; // Model interference disabled per user request
    document.querySelectorAll(OPT_SEL).forEach(el => {
      const txt = (el.textContent || '').trim();
      if (txt.length > 120) return;
      if (LP_RE.test(txt) || FREE_RE.test(txt)) return; // never touch LP/free models
      if (!LOCK_RE.test(txt)) return; // only Fast / Quality

      // Always re-enforce — inline styles survive React re-renders, attribute may not
      el.dataset.bfLocked = '1';
      el.style.setProperty('display', 'none',        'important');
      el.style.setProperty('opacity', '0.35',        'important');
      el.style.setProperty('cursor',  'not-allowed', 'important');

      // Attach block listener once per DOM node (new nodes from React get fresh listener)
      if (!el._bfBlock) {
        const block = e => { e.stopPropagation(); e.preventDefault(); };
        ['click','mousedown','pointerdown','touchstart','keydown'].forEach(ev =>
          el.addEventListener(ev, block, true));
        el._bfBlock = true;
      }
    });
  }

  // ── 4. FORCE-UNLOCK free models (LP + free image models) ─────────────────
  // bf_early.js already prevents persistent_lock.js from adding click-blocking
  // listeners on LP/free elements via addEventListener intercept.
  // This function handles VISUAL cleanup: removes lock badge icons/overlays
  // that persistent_lock.js may still inject as DOM children.

  function removeLockBadges(el) {
    // ONLY remove elements WE injected — never touch Google Flow's own elements
    Array.from(el.children).forEach(child => {
      const isOurs = child.classList.contains('bf-ov') || child.classList.contains('bf-lk');
      if (isOurs) child.remove();
    });
  }

  function unlockFreeModels() {
    document.querySelectorAll(OPT_SEL).forEach(el => {
      if (el.dataset.bfUnlocked === '1') return; // already done, skip repeated style-sets
      const txt = el.textContent || '';
      if (!shouldFreeUnlock(txt)) return;

      // Remove visual lock badges left by persistent_lock.js
      removeLockBadges(el);

      // Force pointer events + visual unlock
      el.style.setProperty('pointer-events', 'auto',    'important');
      el.style.setProperty('opacity',        '1',        'important');
      el.style.setProperty('cursor',         'pointer',  'important');
      delete el.dataset.bfLocked;
      el.removeAttribute('disabled');
      el.removeAttribute('aria-disabled');
      el.dataset.bfUnlocked = '1';
    });
  }

  // ── 5. VIDEO / THUMBNAIL HIDING (home page only) ──────────────────────────
  const DATE_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b.{0,5}\d{1,2}|\d{1,2}:\d{2}\s*(am|pm)|tháng|\d{4}-\d{2}-\d{2}/i;
  const NEWP_RE = /new\s*project|dự án mới|\+\s*d|create new/i;
  const BNNER_RE = /nano banana|is here!|new model|veo\s+\d|imagen/i;

  function isHome() { return !/\/project\//.test(location.pathname); }

  function cardParent(el, depth) {
    depth = depth || 8;
    let cur = el;
    for (let i = 0; i < depth; i++) {
      const p = cur.parentElement;
      if (!p || p === document.body || p === document.documentElement) break;
      if (p.children.length > 6) return cur;
      if (['ARTICLE','LI'].includes(p.tagName) || p.getAttribute('role') === 'gridcell') return p;
      cur = p;
    }
    return cur;
  }

  function hideVideos() {
    if (!isHome()) return;

    // Hide all project card links and their parent cards
    document.querySelectorAll('a[href*="/project/"]').forEach(a => {
      if (a.dataset.bfSeen) return;
      a.dataset.bfSeen = '1';
      if (NEWP_RE.test(a.textContent || '')) return;
      const card = cardParent(a);
      card.dataset.bfHide = '1';
      // Also hide the link itself in case card hiding misses it
      a.dataset.bfHide = '1';
    });

    // Hide list/article/gridcell items that contain dates (project cards)
    document.querySelectorAll('li,article,[role="gridcell"],[role="listitem"]').forEach(el => {
      if (el.dataset.bfSeen) return;
      el.dataset.bfSeen = '1';
      const txt = el.textContent || '';
      if (txt.length > 350 || !DATE_RE.test(txt) || NEWP_RE.test(txt)) return;
      el.dataset.bfHide = '1';
    });

    // Hide any div/section with an image/video AND a date (= project thumbnail card)
    document.querySelectorAll('div,section').forEach(el => {
      if (el.dataset.bfSeen) return;
      const txt = el.textContent || '';
      if (txt.length > 280 || txt.length < 3 || !DATE_RE.test(txt) || NEWP_RE.test(txt)) return;
      if (!el.querySelector('img,video,[role="img"]')) return;
      if (el.querySelectorAll('[data-bf-hide]').length > 0) return;
      el.dataset.bfSeen = '1';
      cardParent(el).dataset.bfHide = '1';
    });

    // Hide "Your projects" / "Recent" section titles and banner ads
    document.querySelectorAll('div,section').forEach(el => {
      if (el.dataset.bfSeen) return;
      const txt = el.textContent || '';
      if (txt.length > 500 || txt.length < 5 || !BNNER_RE.test(txt) || NEWP_RE.test(txt)) return;
      el.dataset.bfSeen = '1';
      el.dataset.bfBan = '1';
    });

    // Also hide any container whose ALL children are [data-bf-hide] (= entire project grid)
    document.querySelectorAll('ul,ol,div[class*="grid"],div[class*="list"]').forEach(el => {
      if (el.dataset.bfSeen) return;
      const kids = Array.from(el.children);
      if (kids.length < 2) return;
      const allHidden = kids.every(k => k.dataset.bfHide === '1' || k.dataset.bfBan === '1');
      if (allHidden) {
        el.dataset.bfSeen = '1';
        el.dataset.bfHide = '1';
      }
    });
  }

  // ── 5b. GENERATION WATCHER & CREDIT DEDUCTION ───────────────────────────────
  // Detects when videos/images complete on Google Flow and calls
  // POST /api/extension/use-credits to deduct from the user's BunnyFlow account.
  //
  // Strategy: track how many <video> elements exist at page-load (baseCount).
  // Any increase after that = new generation completed → charge credits.
  // Images are detected similarly via <img> inside generation result containers.

  // ─── CREDIT DEDUCTION ─────────────────────────────────────────────────────
  // Rules:
  //   • Deduct 20 credits ONLY after a video is SUCCESSFULLY generated.
  //   • Download is FREE — no credits deducted on download.
  //   • Prevent double deductions with a per-page cooldown.
  //
  // Detection approach — two independent layers:
  //   Layer 1 (PRIMARY)  : Progress-bar disappearance watcher in watchGenerations()
  //     Google Flow shows "33%", "67%"... while generating.
  //     When those percentage text elements disappear, generation is complete.
  //   Layer 2 (BACKUP)   : Network intercept in bf_early.js watches API responses
  //     for videoUri / .mp4 patterns and dispatches __bf_gen__ event.
  //
  // Either layer fires callUseCredits() which sends one POST to BunnyFlow backend.
  // Both layers share a cooldown to prevent double charging.
  // ─────────────────────────────────────────────────────────────────────────────

  const _API_BASE = '';

  // Cooldown: after any charge, ignore further charge attempts for N ms.
  // Prevents double deduction if both layers fire for the same completion.
  let _chargeTs   = 0;
  const _COOLDOWN = 5000; // 8 seconds per charge event

  // ─── Auth ──────────────────────────────────────────────────────────────────
  // background.js stores sessionToken as "userId:jwt".
  // Extract the real JWT by splitting on the first colon.
  function _extractJwt(all) {
    if (all.sessionToken && typeof all.sessionToken === 'string' && all.sessionToken.includes(':')) {
      const jwt = all.sessionToken.substring(all.sessionToken.indexOf(':') + 1);
      if (jwt && jwt.length > 20) return jwt;
    }
    return all.token || all.session || all.authToken || all.jwt || null;
  }

  function callUseCredits(type, costAmount, cb) {
    return; // Credit system disabled per user request
    if (typeof chrome === 'undefined') return;

    // Per-charge cooldown — prevent double deduction within 3 seconds
    const now = Date.now();
    if (now - _chargeTs < 3000) return;
    _chargeTs = now;

    const chargeCost = typeof costAmount === 'number' ? costAmount : 50;

    // 1. Send via background service worker for reliable execution
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'DEDUCT_CREDITS',
          cost: chargeCost,
          mediaType: type || 'video'
        }, function(resp) {
          if (resp && resp.ok && resp.data) {
            var d = resp.data;
            if (d.creditsRemaining != null) {
              if (d.enforced !== false) {
                _bfStatus('🎬 Video generating · 50 credits used · ' + d.creditsRemaining + ' left', 'busy', 10000);
              } else {
                _bfStatus('🎬 Video generating · Unlimited VIP', 'busy', 6000);
              }
              if (cb) cb(true, d.creditsRemaining);
            }
          } else if (resp && resp.status === 402) {
            _showOmniNotice('⚠️ Insufficient credits: 50 credits required per video generation. Please upgrade your plan.', '#78350f', '#fde68a');
            if (cb) cb(false, 0);
          }
        });
      }
    } catch(_) {}

    // 2. Direct fetch fallback from content script
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, function(all) {
        const token = _extractJwt(all);
        var apiBase = (all && (all.apiBase || all.serverUrl || all.origin)) || 'http://localhost:5000';
        if (apiBase.includes(':3000')) apiBase = apiBase.replace(':3000', ':5000');
        if (apiBase.includes('flowbydcx.com') || apiBase.includes('labs.google')) apiBase = 'http://localhost:5000';
        apiBase = apiBase.replace(/\/+$/, '');

        if (!token || token.length < 20) return;

        fetch(apiBase + '/api/extension/use-credits', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'X-Ext-Version': '1.4',
          },
          body: JSON.stringify({ type: type || 'video', cost: chargeCost, qty: 1 }),
        })
        .then(function(res) {
          return res.json().then(function(d) { return { status: res.status, data: d }; });
        })
        .then(function(resObj) {
          var data = resObj.data;
          if (resObj.status === 402 || (data && data.error === 'OMNI_CREDITS_EXHAUSTED')) {
            _showOmniNotice('⚠️ Insufficient credits: 50 credits required per video generation. Please upgrade your plan.', '#78350f', '#fde68a');
            if (cb) cb(false, 0);
            return;
          }
          if (data && data.creditsRemaining != null && chrome.storage) {
            chrome.storage.local.set({ credits: data.creditsRemaining, creditsLeft: data.creditsRemaining, omniCreditsLeft: data.creditsRemaining });
            if (data.enforced !== false) {
              _bfStatus('🎬 Video generating · 50 credits used · ' + data.creditsRemaining + ' left', 'busy', 10000);
            } else {
              _bfStatus('🎬 Video generating · Unlimited VIP', 'busy', 6000);
            }
          }
          if (cb) cb(true, data ? data.creditsRemaining : null);
        })
        .catch(function() {
          if (cb) cb(false, null);
        });
      });
    }

    // Also notify background.js
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          type: type === 'video' ? 'VIDEO_GENERATED' : 'IMAGE_GENERATED',
          data: { mediaType: type || 'video', prompt: '', videoUrl: null, thumbnailUrl: null }
        }, function() {});
      } catch(e) {}
    }
  }

  // ─── OMNI FLASH (Heavy plan ONLY) — charge-on-success ─────────────────────
  // Credits SIRF tab cut hotay hain jab (1) user ka plan Heavy ho, (2) selected
  // model Omni Flash ho, aur (3) video successfully render ho chuki ho. Baqi
  // sab plans/models pe yeh poori tarah no-op hai (purana behavior same).
  // Layer 1 (progress bars) + Layer 2 (network intercept) dono yahin funnel
  // hotay hain; 8s lock doosri layer ke duplicate ko rokta hai, aur server par
  // omni_usage UNIQUE(user_id, gen_id) retry/restart-safe dedupe karta hai.
  // Per-generation Omni records: genId → { at, charged }. Charge confirm hone par record
  // 'charged' mark ho jata hai; per-genId in-flight guard same-gen concurrent POST rokta hai
  // (server UNIQUE(user_id,gen_id) final dedupe hai).
  // IMPORTANT: Layer 2 (network intercept) ko JAAN-BOOJH kar Omni billing se nahi jora
  // gaya — us event ke paas koi job/generation ID nahi hoti, is liye woh completion ko
  // sahi initiation se correlate nahi kar sakta. Billing SIRF Layer 1 (progress-bar
  // watcher) se hoti hai jahan genId initiation par hi omni-flag ke sath bind ho jata
  // hai. Fail direction hamesha SAFE hai: kabhi wrong charge nahi, worst case missed charge.
  const _omniGens = {};
  const _omniInFlight = {};  // genId → true jab uska charge POST in-flight ho

  // Debug log HAMESHA console mein jata hai; on-screen box SIRF jab
  // localStorage.bf_dbg = '1' ho (testing ke liye). Normal user ko kuch nahi
  // dikhta — sab khamooshi se chalta hai.
  var _bfDbgBox = null;
  var _bfDbgOn = null;
  function _bfDbgEnabled() {
    if (_bfDbgOn !== null) return _bfDbgOn;
    // v34: detection card DEFAULT OFF (owner ka hukam — user ko top-left par
    // KUCH nahi dikhna chahiye; billing backend par khamooshi se chalti hai).
    // Debugging ke liye wapas lana ho to console mein:
    //   localStorage.setItem('bf_dbg','1')  → phir page reload
    try { _bfDbgOn = (typeof localStorage !== 'undefined' && localStorage.getItem('bf_dbg') === '1'); } catch (_) { _bfDbgOn = false; }
    return !!_bfDbgOn;
  }
  var _bfDbgHead = ''; // live selection line (model + qty + kitne credits katenge)
  function _bfDbgRender(extra) {
    try {
      if (!_bfDbgBox || !document.contains(_bfDbgBox)) {
        _bfDbgBox = document.createElement('div');
        _bfDbgBox.id = '__bf_dbg__';
        _bfDbgBox.style.cssText = 'position:fixed;top:8px;left:8px;z-index:2147483647;' +
          'background:rgba(10,10,20,.85);color:#a7f3d0;padding:5px 8px;border-radius:6px;' +
          'font:600 9px/1.4 monospace;max-width:38vw;max-height:150px;overflow:hidden;' +
          'pointer-events:none;border:1px solid rgba(167,243,208,.25);white-space:pre-wrap;';
        (document.body || document.documentElement).appendChild(_bfDbgBox);
      }
      var kept = (_bfDbgBox.textContent || '').split('\n').filter(function(l) {
        return l && l.charAt(0) !== '\u25B6'; // purani head line hatao (▶ se shuru)
      });
      if (extra) { kept.push(extra); if (kept.length > 7) kept = kept.slice(-7); }
      _bfDbgBox.textContent = (_bfDbgHead ? _bfDbgHead + '\n' : '') + kept.join('\n');
    } catch (_) {}
  }
  function _bfDbg(msg) {
    try { console.log('[BunnyFlow]', msg); } catch (_) {}
    if (!_bfDbgEnabled()) return;
    _bfDbgRender(new Date().toTimeString().slice(0, 8) + ' ' + msg);
  }
  // Console-only log: card par NAHI aata. Purane click/intent-tracker ki lines
  // billing mein use hi nahi hotin (billing 100% network-truth hai) — card par
  // dikha kar sirf confusion banati thin ("intent omni=true" jabke LP select).
  function _bfDbgQ(msg) {
    try { console.log('[BunnyFlow]', msg); } catch (_) {}
  }

  // ── Status pill: chhota premium indicator (sirf Heavy plan users ko dikhta hai) ──
  var _bfPill = null, _bfPillTimer = null;
  function _bfStatus(text, kind, autoHideMs) {
    try {
      if (!isHeavyPlan()) return;
      if (!_bfPill || !document.contains(_bfPill)) {
        _bfPill = document.createElement('div');
        _bfPill.id = '__bf_status__';
        _bfPill.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:2147483647;' +
          'display:flex;align-items:center;gap:7px;background:rgba(17,17,27,.88);' +
          'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#e5e7eb;' +
          'padding:7px 13px;border-radius:999px;font:600 12px/1.2 system-ui,-apple-system,sans-serif;' +
          'border:1px solid rgba(139,92,246,.35);box-shadow:0 4px 16px rgba(0,0,0,.4);' +
          'pointer-events:none;max-width:70vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        (document.body || document.documentElement).appendChild(_bfPill);
      }
      if (!document.getElementById('__bf_pulse_css__')) {
        var st = document.createElement('style'); st.id = '__bf_pulse_css__';
        st.textContent = '@keyframes __bfPulse{0%,100%{opacity:.35}50%{opacity:1}}';
        (document.head || document.documentElement).appendChild(st);
      }
      var dotColor = kind === 'ok' ? '#34d399' : (kind === 'busy' ? '#a78bfa' : '#9ca3af');
      _bfPill.innerHTML = '';
      var d = document.createElement('span');
      d.style.cssText = 'width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:' + dotColor + ';' +
        (kind === 'busy' ? 'animation:__bfPulse 1.1s ease-in-out infinite;' : '');
      var s = document.createElement('span');
      s.textContent = text;
      _bfPill.appendChild(d); _bfPill.appendChild(s);
      _bfPill.style.display = 'flex';
      if (_bfPillTimer) { clearTimeout(_bfPillTimer); _bfPillTimer = null; }
      if (autoHideMs) _bfPillTimer = setTimeout(function() { try { _bfPill.style.display = 'none'; } catch (_) {} }, autoHideMs);
    } catch (_) {}
  }

  function _trackOmniGen(genId, isOmni) {
    _bfDbgQ('track gen=' + String(genId).slice(-6) + ' omni=' + isOmni + ' plan=' + _userPlan + ' model="' + (_lastModelTxt || '?') + '"');
    if (isHeavyPlan()) {
      _bfStatus(isOmni ? 'Generating content · Omni Flash' : 'Generating content · Free model (0 credits)', 'busy', 240000); // safety: 4 min baad khud ghayab (atka hua pill kabhi nahi)
    }
  }

  // ── INTENT MODEL ──
  // Har hooked click par "aakhri niyyat" save hoti hai (us waqt kaunsa model selected
  // tha). Send click HAMESHA aakhri click hota hai (dropdown pehle khulta hai) — is
  // liye jab nayi progress bar shuru ho to aakhri intent hi sahi model batata hai.
  // Intent ek hi bar KHARCH hota hai (consume) → phantom clicks se kabhi charge nahi.
  var _lastIntent = null; // { omni:bool, at:ms } — click fallback
  function _setIntent() {
    var omni = isHeavyPlan() && _isOmniSelected();
    _lastIntent = { omni: omni, at: Date.now() };
    _bfDbgQ('intent omni=' + omni + ' model="' + (_lastModelTxt || '?') + '"');
  }

  // ── NETWORK INTENT (primary) ──
  // flow_overrides.js har generation SUBMIT request par __bf_req__ bhejta hai
  // (model tokens body se). Request ka lamha == submit ka lamha — us waqt jo
  // model tha wahi is video ka model hai. FIFO queue: har bars-increase ek
  // intent kharch karta hai. Body tokens decisive hon to unhi se free/paid,
  // warna us lamhe ka DOM selection.
  var _intentQueue = [];
  var _lastReqIntentAt = 0;
  // v40: SUBMIT-LAMHA SNAPSHOT — GEN ka response 1-3s DER se aata hai; tab tak
  // user model badal chuka hota hai (mixed Omni/Lower sessions). Response-time
  // DOM parhna hi wo race thi jo Lower ko PAID aur Omni ko FREE bana kar naqshe
  // ko dono taraf zeher karti rahi. Ab __bf_req (fetch ke LAMHE) par label+cost
  // snapshot mehfooz hota hai aur _onBfGen2 USI se faisla karta hai.
  var _sendSnaps = []; // { rid, mk, key, at, lbl, fc, used }
  var _seenReqRids = {}, _seenRidList = []; // dual-channel dedupe (v40)
  var _REQ_FREE_RE = /low(?:er)?[\s._%-]*priority/i; // sirf "Lower Priority" FREE — plain "Veo 3.1 - Lite" PAID hai (Google par 10 credits); alag "lower"/"priority" lafz kaafi nahi
  var _REQ_PAID_RE = /veo|fast|quality|flash|ultra|turbo/i;
  function _onBfReq(d) {
    try {
      d = d || {};
      var u = String(d.u || ''), tk = String(d.t || '');
      var now = Date.now();
      // Analytics/log requests (batchLogFrontendEvents waghera) sirf LOG hoti
      // hain — in mein purane models ke naam hote hain, intent KABHI nahi banate.
      var isLog = /batchlog|logfrontend|log.?events|analytics|telemetry/i.test(u);
      if (isLog) return; // analytics: na log (box bhar deti hain), na intent
      // Status-poll req lines har chand second aati hain — box ko shor se bhar
      // deti hain. Sirf pehli dafa dikhao (channel-proof ke liye kafi hai).
      var _isStPoll = /batchcheckasync|checkasyncvideo|generationstatus/i.test(u);
      if (_isStPoll) { if (_chSeen && _chSeen.streq) return; if (_chSeen) _chSeen.streq = 1; }
      _bfDbg('req ' + (d.m || '') + ' …' + u.slice(-55) + ' bl=' + (d.bl || 0) + (tk ? ' [' + tk.slice(0, 120) + ']' : ''));
      if (d.b0) _bfDbg('raw: ' + String(d.b0).slice(0, 170));
      if (d.m === 'RESP') return; // response probe sirf debug hai — intent kabhi nahi
      if (d.g) {
        // PAKKA generation submit (body mein videoModelKey / generate URL) —
        // model request ke ANDAR se. EK submit = EK intent (qty ke sath, x2/x4
        // ke liye) — kai intents push karna leftover bana kar AGLI video ko
        // ghalat charge kara deta tha.
        // v40: rid-dedupe — dono channels (postMessage + CustomEvent) se aane
        // par intent/snapshot sirf EK bar bane (double-intent = double-charge khatra).
        var _rid = String(d.rid || '');
        if (_rid) {
          if (_seenReqRids[_rid]) return;
          _seenReqRids[_rid] = 1;
          _seenRidList.push(_rid);
          if (_seenRidList.length > 60) delete _seenReqRids[_seenRidList.shift()];
        }
        var mk = String(d.g.mk || '');
        var n = Math.max(1, Math.min(8, d.g.n | 0));
        var om;
        if (mk && _REQ_FREE_RE.test(mk)) om = false;
        else if (mk) om = true;                 // koi bhi non-Lower model key → paid
        else om = _isOmniSelected();            // key na mili → us lamhe ka DOM
        om = om && isHeavyPlan();
        _intentQueue.push({ omni: om, at: now, qty: n });
        if (_intentQueue.length > 12) _intentQueue.shift();
        _lastReqIntentAt = now;
        // v40: is submit ke LAMHE ka label + cost mehfooz — _onBfGen2 response
        // aane par (chahe der se) YEHI istemal karega, us waqt ka DOM nahi.
        try {
          var _snLbl = '';
          try { _snLbl = (_getCurrentModelText() || _lastModelTxt || '').slice(0, 60); } catch (_) {}
          var _snFc = _freshCost();
          if (_snFc === null && _selCost !== null) _snFc = _selCost;
          _sendSnaps.push({ rid: _rid, mk: mk, key: _mkKey(mk), at: now, lbl: _snLbl, fc: _snFc, used: false });
          if (_sendSnaps.length > 16) _sendSnaps.shift();
          _bfDbg('SNAP@submit ' + (_rid || 'no-rid') + ' lbl="' + _snLbl.slice(0, 30) + '" fc=' + (_snFc === null ? '?' : _snFc) + ' key=' + (_mkKey(mk) || '?'));
        } catch (_) {}
        _bfDbg('GEN SUBMIT qty=' + n + ' omni=' + om + ' mk=[' + mk.slice(0, 90) + '] q=' + _intentQueue.length);
        if (d.g.b0) _bfDbg('raw: ' + String(d.g.b0).slice(0, 170));
        return;
      }
      // NOTE: guessing-heuristic HATA di gayi. Status-poll requests (URL mein
      // "video/generation" hone ke bawajood) intents bana kar Lower videos par
      // ghalat charge kara rahi thin. Intent ab SIRF pakka GEN SUBMIT (upar) ya
      // click-fallback se banta hai — shak par kabhi charge nahi (fail-safe).
    } catch (_) {}
  }

  // ── NET-TRUTH BILLING (v16, PRIMARY) ──
  // Har video ki apni Google operation-ID: submit par ID+model register hota hai,
  // status-poll par usi ID ka success/fail aata hai. Order, mix, parallel — sab
  // se azaad: har video apne record se charge hoti hai. DOM/queue ka koi guessing
  // billing mein istemal NAHI hota.
  var _netOps = {}; // opId → { omni, mk, at, settled }
  // ── v35: PAID-SUBMIT BUDGET (rapid-fire fix) ─────────────────────────────
  // Submit ki hex operation-ID aur status ki media-UUID KABHI match nahi hote.
  // Tez complete hui video pehli nazar mein hi DONE dikhti hai → purane code
  // ne usay "purani video" samajh kar chhor diya (8 bheji, sirf 3 charge).
  // Hal: har PAID submit budget mein ginta hai (+qty); har paid settle (-1).
  // Pehli-nazar-DONE entry ab charge hoti hai AGAR: (a) boot ke 10s baad aayi
  // (page-load ki purani gallery nahi), (b) us ka APNA codename PAID hai,
  // (c) budget > 0, (d) 15 min ke andar paid submit hua tha. Budget cap ki
  // zamanat: kabhi bhi submits se ZYADA videos charge nahi ho saktin.
  var _bfBootAt = Date.now();
  var _paidBudget = 0;
  var _lastPaidSubmitAt = 0;
  function _budgetDec(why) {
    if (_paidBudget > 0) { _paidBudget--; _bfDbg('BUDGET -1 (' + why + ') → ' + _paidBudget); }
  }
  function _opId(name) {
    var s = String(name || '').replace(/[^A-Za-z0-9_-]/g, '');
    return s ? ('nop_' + s.slice(-40)) : '';
  }
  // Google ke model keys INTERNAL codenames hote hain (jaise "abra_t2v_8s") —
  // un mein "Lower/Lite" likha nahi hota. Is liye: submit ke LAMHE ka dropdown
  // label (user ne jo chuna) faisla karta hai, aur key→free/paid ka naqsha
  // SEEKH kar mehfooz hota hai (chrome.storage) — agli bar key hi kafi hai,
  // chahe label na parha ja sake.
  var _mkLearn = {}; // modelKey → true(FREE) / false(PAID)
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // v40: NAYA storage key (bfMkMap7) — bfMkMap6 response-time-race ke dinon
      // mein dono taraf zeher-shuda ho chuka tha (Lower PAID / Omni FREE
      // learned). Purane keys delete, naqsha saaf shuru — ab learn SIRF
      // submit-lamha snapshot ya key-phrase se hota hai (race-proof).
      try { chrome.storage.local.remove(['bfMkMap5', 'bfMkMap6']); } catch (_) {}
      chrome.storage.local.get('bfMkMap7', function(r) {
        try { if (r && r.bfMkMap7 && typeof r.bfMkMap7 === 'object') _mkLearn = r.bfMkMap7; } catch (_) {}
      });
    }
  } catch (_) {}
  function _mkKey(mk) {
    var m = String(mk || '').match(/[A-Za-z0-9][\w.-]{2,60}/); // pehla saaf token
    return m ? m[0].toLowerCase() : '';
  }
  function _onBfGen2(d) {
    try {
      d = d || {};
      var mk = String(d.mk || '');
      var key = _mkKey(mk);
      // v40: SUBMIT-lamha snapshot — SIRF exact request-ID (rid) match. Koi
      // FIFO/key guess nahi: out-of-order ya gum-shuda responses kabhi doosri
      // submit ka snapshot nahi kha sakte (review fix). rid na mile to purana
      // (response-time DOM) behavior — sirf channel-mara-hua fallback.
      var snap = null;
      var _gRid = String(d.rid || '');
      if (_gRid) {
        for (var _sq = 0; _sq < _sendSnaps.length; _sq++) {
          var _sn = _sendSnaps[_sq];
          if (!_sn.used && _sn.rid && _sn.rid === _gRid) { snap = _sn; _sn.used = true; break; }
        }
      }
      // Safai: purane (>10 min) snapshots nikaal do — kabhi reuse nahi hote
      // (rid unique hai), sirf memory saaf rakhne ko.
      var _snNow = Date.now();
      while (_sendSnaps.length && (_sendSnaps[0].used || (_snNow - _sendSnaps[0].at) > 600000)) _sendSnaps.shift();
      var label = '';
      if (snap) { label = String(snap.lbl || ''); }
      else { try { label = (_getCurrentModelText() || _lastModelTxt || '').slice(0, 60); } catch (_) {} }
      // free-faisla (tarteeb): (1) key ke andar hi lower/lite → pakka FREE;
      // (2) seekha hua naqsha; (3) GOOGLE KA APNA COST TEXT ("Generating will
      // use N credits": 0=free, >0=paid — sab se bharosemand); (4) label sirf
      // aakhri sahara (flap karta hai). Warna UNKNOWN → NO charge (fail-safe).
      var free = null, src = '?';
      // v40: cost bhi SUBMIT-lamha snapshot se — response-time _freshCost() us
      // waqt ke (badle hue) selected model ka hota hai, is video ka nahi.
      var _fc;
      if (snap) { _fc = (snap.fc === undefined ? null : snap.fc); }
      else {
        _fc = _freshCost(); // taaza (<3s) cost
        if (_fc === null && _selCost !== null) _fc = _selCost; // MODEL-BOUND cost: jab tak model nahi badla, cost valid hai (panel band ho chuka ho to bhi)
      }
      var _lblCls = label ? _classifyModelText(label) : 'unknown';
      // v40: image-mode/heal guards mein "debounced label" bhi snapshot ka ho —
      // response-time _lastModelTxt phir wahi race wapis le aata.
      var _dbLbl = snap ? String(snap.lbl || '') : _lastModelTxt;
      if (key && /low(?:er)?[\s._%-]*priority/i.test(key)) { free = true; src = 'key'; }
      // v37 NANO-BANANA FIX: cost=0 tabhi mano jab (a) koi video-model label
      // screen par dekha ja chuka ho (image mode mein label khali hota hai) aur
      // (b) label saaf PAID (Omni/Fast/Quality) na keh raha ho. Image-first
      // project mein image model ka "0 credits" text Omni submit ko FREE
      // banata tha + Omni codename FREE learn ho kar map ko zeher kar deta tha.
      // cost>0 (PAID confirm) hamesha trusted — us se koi ghalat charge nahi hota.
      // v40 (review fix): cost=0 ko FREE tabhi mano jab label SAAF "Lower
      // Priority" kahe (_lblCls==='free'). Stale/ambiguous label ke sath 0-cost
      // (image-mode ka bacha hua text waghera) ab kabhi FREE nahi banata aur na
      // learn hota hai — warna Omni codename phir FREE learn ho sakta tha.
      // cost>0 (PAID confirm) hamesha trusted — us se ghalat charge nahi hota.
      else if (_fc !== null && (_fc > 0 || _lblCls === 'free')) { free = (_fc === 0); src = 'cost=' + _fc; } // Google ka apna text — learned map se bhi ooper (ghalat entry theek karta hai)
      else if (key && (key in _mkLearn)) {
        free = !!_mkLearn[key]; src = 'learned';
        // v37 SELF-HEAL: purani zeher-shuda entry (Omni codename FREE learned)
        // — label saaf PAID keh raha ho to entry uda do aur PAID charge karo.
        // Guard: LIVE label ke sath DEBOUNCED label (_lastModelTxt) bhi paid
        // kahe tabhi — ek lamhe ka stale "Omni Flash" read kisi asli LP entry
        // ko delete kar ke LP video par charge na karwa de (review fix).
        if (free && _lblCls === 'paid' && _dbLbl && _classifyModelText(_dbLbl) === 'paid') {
          free = false; src = 'learned-fix';
          delete _mkLearn[key];
          try { if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ bfMkMap7: _mkLearn }); } catch (_) {}
          _bfDbg('LEARN-FIX zeher entry hati "' + key + '" (label paid) → PAID');
        }
      }
      else if (label) { var _lc = _classifyModelText(label); free = _lc === 'free' ? true : (_lc === 'paid' ? false : null); src = 'label'; }
      // v32 OWNER-RULE fallback: codename request ke ANDAR se aaya hai — LP/low-
      // priority phrase usme NAHI (upar check ho chuka) → owner ka rule: sirf
      // Lower free, BAQI HAR model paid. Ab koi submit "unknown" nahi rehta
      // (unknown hi wo suraakh tha jisse done par CURRENT dropdown parh kar
      // Lower ki video Omni ban jati thi). Learn is se NAHI hota (sirf phrase/cost se).
      if (free === null && key) { free = false; src = 'key-nonlp'; }
      // Seekho sirf PAKKI source se: key-phrase ya FRESH cost (0 ya >0 dono).
      // Fresh cost Google ka apna text hai — purani GHALAT entry ko overwrite
      // kar ke theek bhi kar deta hai. Label se KABHI learn nahi ("[Lower
      // Priority]" badge alag element hai, text se LP/paid-Lite ka pata nahi).
      // v40: cost se LEARN sirf SUBMIT-lamha snapshot par — response-time cost
      // se learn hi wo raasta tha jo race mein naqsha zeher karta tha.
      if (free !== null && key && (src === 'key' || (snap && src.indexOf('cost') === 0)) && _mkLearn[key] !== free) {
        _mkLearn[key] = free;
        try { if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ bfMkMap7: _mkLearn }); } catch (_) {}
        _bfDbg('LEARN key "' + key + '" = ' + (free ? 'FREE' : 'PAID') + ' (' + src + ')');
      }
      var om = (free === false) && isHeavyPlan(); // unknown(null) ya free(true) → kabhi charge nahi
      var ops = d.ops || [];
      _bfDbg('NET GEN ops=' + ops.length + ' ' + (free === null ? 'UNKNOWN→no-charge' : (free ? 'FREE' : 'PAID')) + '(' + src + ') key=' + (key || '?') + ' cost=' + (_lastCost === null ? '?' : _lastCost) + ' label="' + label + '"');
      if (_rawGenN < 2 && d.r0) { _rawGenN++; _bfDbg('GEN RAW: ' + String(d.r0).slice(0, 380)); }
      if (!mk && d.q0) _bfDbg('genreq raw: ' + String(d.q0).slice(0, 300));
      if (!ops.length && d.r0) _bfDbg('genresp raw: ' + String(d.r0).slice(0, 300));
      var now = Date.now();
      for (var i = 0; i < ops.length; i++) {
        var _o = ops[i];
        var _nm = (typeof _o === 'string') ? _o : (_o && _o.n);
        var _sd = (typeof _o === 'object' && _o) ? String(_o.sid || '') : '';
        var id = _opId(_nm);
        if (id && !_netOps[id]) {
          // unk=true → model pakka nahi tha; video-details (history) se upgrade
          // ho sakta hai. Pakki source (key/learned/cost) ho to unk=false — koi
          // baad wali cheez faisla NAHI badle gi.
          // v31: debounced label ab pakka source hai — "Omni Flash"/"Fast" jaisa
          // SAAF paid/free label mila to unk=false (pehle label hamesha kachcha
          // mana jata tha → stable-label bhi unclear nikla → Omni FREE nikal
          // gaya). Sirf lite-ambiguous/khali label par unk rehta hai.
          _netOps[id] = { omni: om, mk: key.slice(0, 60), at: now, settled: false, sid: _sd, unk: (free === null) };
        }
      }
      var ks = Object.keys(_netOps);
      if (ks.length > 80) for (var j = 0; j < ks.length - 80; j++) delete _netOps[ks[j]];
      // v35: paid submit → budget (ops.length = is batch ki videos, x2 → 2)
      if (om) {
        _paidBudget += (ops.length || 1);
        _lastPaidSubmitAt = Date.now();
        _bfDbg('BUDGET +' + (ops.length || 1) + ' (paid submit) → ' + _paidBudget);
      }
    } catch (_) {}
  }
  // VIDEO DETAILS se model (user ka bataya hua tareeqa): history/workflows
  // response mein har video ka model hota hai — wohi jo hover card mein dikhta
  // hai. Isse: (1) codename↔free/paid naqsha seekho, (2) UNKNOWN registered ops
  // ka faisla mukammal karo. Charge yahan se KABHI trigger nahi hota — sirf
  // status-poll DONE par (warna purani videos dobara charge ho jatin).
  function _onBfHist(d) {
    try {
      d = d || {};
      var items = d.items || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        var m = String(it.m || '');
        if (!m) continue;
        // "Veo 3.1 - Lite" (badge ke baghair) UNKNOWN rakho — wo LP (free) bhi
        // ho sakta hai aur paid Lite bhi; yahi ghalat PAID-learn LP videos par
        // charge ka sabab bana tha.
        var _cls = _classifyModelText(m);
        var key = _mkKey(m);
        // v38: OVERWRITE bhi karo (sirf absent par nahi) — history Google ka
        // APNA record hai, sab se oonchi sachai; zeher-shuda entry yahin se
        // khud theek ho jati hai.
        if (key && _cls !== 'unknown' && _mkLearn[key] !== (_cls === 'free')) {
          _mkLearn[key] = (_cls === 'free');
          try { if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ bfMkMap7: _mkLearn }); } catch (_) {}
          _bfDbg('LEARN(video-details) "' + m.slice(0, 40) + '" = ' + (_cls === 'free' ? 'FREE' : 'PAID'));
        }
        // Registered op se jorna: operation-name ya sceneId match
        var rec = null, id = '';
        if (it.op) { id = _opId(it.op); rec = _netOps[id]; }
        if (!rec && it.sid) {
          for (var k in _netOps) { if (_netOps[k].sid && _netOps[k].sid === it.sid) { rec = _netOps[k]; id = k; break; } }
        }
        // v38 BUG-FIX: yahan `free` naam ka variable EXIST hi nahi karta tha —
        // pehli matching entry par ReferenceError, jo bahar wale catch mein
        // chupke se dab jata tha aur BAQI SAB items bhi chhut jate the. Isi
        // liye mixed sessions mein UNKNOWN ops ka faisla history se kabhi
        // mukammal nahi hota tha (detection "weak" lagti thi). Ab _cls se.
        // Aur sirf unk nahi: GHALAT-classified pending rec bhi Google ke apne
        // record se dono taraf theek hota hai (FREE→PAID ya PAID→FREE).
        if (rec && !rec.settled && _cls !== 'unknown') {
          var om = (_cls === 'paid') && isHeavyPlan();
          if (rec.unk || rec.omni !== om) {
            _bfDbg('DETAILS upgrade op …' + id.slice(-8) + ' "' + m.slice(0, 30) + '" → ' + (_cls === 'free' ? 'FREE' : 'PAID'));
            rec.omni = om;
            rec.unk = false;
            rec.mk = key;
          }
        }
      }
    } catch (_) {}
  }
  // Debug: pehli 2 GEN + 2 ST responses KACHCHI log karo — Google ke asal
  // status-format ko dekhne ke liye (guesswork khatam).
  var _rawGenN = 0, _rawStN = 0;
  // STABLE label read: 3 dafa sample karo (~1.2s), teeno SAME hon aur saaf
  // paid/free keyword rakhta ho tabhi bharosa. Edit/extend page par model ka
  // naam neeche bar mein stable likha hota hai ("Omni Flash") — UNKNOWN
  // codename (jaise abra_edit) ka aakhri, magar mohtat, sahara.
  function _stableLabel(cb) {
    var reads = [];
    (function tick() {
      var lbl = '';
      try { lbl = String(_getCurrentModelText() || _lastModelTxt || ''); } catch (_) {}
      reads.push(lbl);
      if (reads.length >= 3) {
        var l0 = reads[0];
        cb((l0 && reads[1] === l0 && reads[2] === l0) ? l0 : '');
      } else setTimeout(tick, 600);
    })();
  }
  function _onBfSt2(d) {
    try {
      d = d || {};
      var list = d.list || [];
      if (_rawStN < 4 && d.r0) { _rawStN++; _bfDbg('ST RAW: ' + String(d.r0).slice(0, 380)); }
      if (!list.length) return;
      var _sumDone = 0, _sumKnown = 0;
      for (var _si = 0; _si < list.length; _si++) {
        if (/success|succeed|done_true|complete/i.test(String(list[_si].st || '')) || list[_si].md) _sumDone++;
        if (_netOps[_opId(list[_si].op)]) _sumKnown++;
      }
      if (_sumDone && !_chSeen.stdone && d.r0) { _chSeen.stdone = 1; _bfDbg('ST RAW DONE: ' + String(d.r0).slice(0, 380)); }
      if (_sumDone || list.length !== _sumKnown) _bfDbg('NET ST n=' + list.length + ' done=' + _sumDone + ' known=' + _sumKnown + (list[0] && list[0].m ? ' m=' + String(list[0].m).slice(0, 40) : '') + (list[0] && list[0].st ? ' st="' + String(list[0].st).slice(0, 30) + '"' : '') + (list[0] && list[0].stn >= 0 ? ' stn=' + list[0].stn : '') + (list[0] && list[0].md ? ' md=1' : ''));
      for (var i = 0; i < list.length; i++) {
        var id = _opId(list[i].op), st = String(list[i].st || '');
        if (!id) continue;
        // done = status-text match YA us entry mein media-url maujood (video
        // tayyar = us ka URL aa gaya — format se azaad pakka signal)
        var done = /success|succeed|done_true|complete/i.test(st) || !!list[i].md;
        var fail = /fail|error|cancel/i.test(st);
        var rec = _netOps[id];
        if (!rec) {
          // MEDIA-ENTRY ko pehli nazar mein register karo — model us ke ANDAR
          // se (videoModelName). Media-ID submit ke operation-ID se ALAG hoti
          // hai, is liye yahi register-ka-lamha hai.
          // SUNIYAAR: pehli nazar mein hi COMPLETE mila = ye purana/pehle-ki-
          // session ka video hai → KABHI charge nahi. Sirf wo video charge
          // hoti hai jise hum PENDING se COMPLETE hote dekhein.
          var _sm = _mkKey(String(list[i].m || ''));
          var _fr = null;
          // Entry ka faisla SIRF us ke apne codename se (phrase → learned map).
          // Page ka CURRENT cost yahan KABHI nahi — wo us lamhe CHUNE HUE model
          // ka hota hai, is entry ke model ka nahi (mixed/2x session mein
          // Omni↔LP ulat-phir ho gayi thi — v25 bug). Cost sirf SUBMIT ke waqt
          // learn hota hai, jahan wo pakka usi submit ka hota hai.
          if (_sm && /low(?:er)?[\s._%-]*priority/i.test(_sm)) _fr = true;
          else if (_sm && (_sm in _mkLearn)) _fr = !!_mkLearn[_sm];
          // v32: entry ka APNA codename maujood hai aur wo LP nahi → owner rule:
          // PAID. (Codename entry ke andar se hai — CURRENT selection nahi — is
          // liye mixed session mein bhi har video apne model se judti hai.)
          else if (_sm) _fr = false;
          rec = _netOps[id] = { omni: (_fr === false) && isHeavyPlan(), mk: _sm, at: Date.now(), settled: false, unk: (_fr === null) };
          _bfDbg('NET ST new op …' + id.slice(-8) + ' m="' + String(list[i].m || '').slice(0, 30) + '" → ' + (_fr === null ? 'UNKNOWN' : (_fr ? 'FREE' : 'PAID')) + (done ? ' [pehli-nazar-DONE]' : ' [pending]'));
          if (done) {
            rec.settled = true;
            // v35 rapid-fire fix: tez complete hui NAYI video bhi pehli nazar
            // mein DONE dikhti hai. Budget + apna codename + waqt ki sharton
            // par charge karo; warna purani gallery ki video → skip (no charge).
            var _fresh = (Date.now() - _bfBootAt) > 10000;
            var _recent = _lastPaidSubmitAt && (Date.now() - _lastPaidSubmitAt) < 15 * 60 * 1000;
            if (_fresh && _recent && _paidBudget > 0 && _fr === false && isHeavyPlan()) {
              _budgetDec('fast-complete');
              rec.omni = true;
              _genMap[id] = { status: 'done', deducted: true, omni: true };
              _omniGens[id] = { at: Date.now(), charged: false, confirmed: true };
              _bfDbg('NET ST FAST-DONE op …' + id.slice(-8) + ' PAID mk=[' + _sm + '] → charge 50');
              chargeCompletedVideo(1, id);
              continue;
            }
            _bfDbg('NET ST op …' + id.slice(-8) + ' pehli-nazar-complete → skip (' + (_fr === false ? 'no budget/purana video' : (_fr === true ? 'FREE model' : 'model unknown')) + ', NO charge)');
            continue;
          }
        }
        if (rec.settled) {
          // REGENERATE: fail hui video ko regenerate karne par Google USI
          // media-ID ko phir pending se chalata hai. Fail par settle hua rec
          // dobara PENDING (na done, na fail) dikhe → unsettle karo taake nayi
          // completion par charge ho. (Yehi "regen wali video free chali gayi"
          // bug tha — 3 Omni videos mein se sirf 1 charged.)
          if (rec.failed && !done && !fail) {
            rec.settled = false; rec.failed = false;
            _bfDbg('NET REGEN op …' + id.slice(-8) + ' dobara pending → unsettle (complete par charge hoga)');
          } else continue;
        }
        // Model pehle UNKNOWN tha, ab entry mein aa gaya → faisla mukammal karo
        if (rec.unk && list[i].m) {
          var _sm2 = _mkKey(String(list[i].m));
          var _fr2 = null;
          if (_sm2 && /low(?:er)?[\s._%-]*priority/i.test(_sm2)) _fr2 = true;
          else if (_sm2 && (_sm2 in _mkLearn)) _fr2 = !!_mkLearn[_sm2];
          else if (_sm2) _fr2 = false; // v32 owner rule: non-LP codename = PAID
          if (_fr2 !== null) {
            rec.omni = (_fr2 === false) && isHeavyPlan();
            rec.unk = false;
            rec.mk = _sm2;
            _bfDbg('NET ST model-known op …' + id.slice(-8) + ' "' + _sm2 + '" → ' + (_fr2 ? 'FREE' : 'PAID'));
          }
        }
        if (fail) { rec.settled = true; rec.failed = true; if (rec.omni) _budgetDec('fail'); _bfDbg('NET FAIL op …' + id.slice(-8) + ' → no charge (regenerate par dobara charge hoga)'); continue; }
        if (done) {
          rec.settled = true;
          if (rec.unk) {
            // UNKNOWN codename (jaise edit/extend ka "abra_edit"): page par
            // likha STABLE model-naam aakhri sahara (3 reads same hon tabhi).
            // Saaf paid ("Omni Flash") → charge + codename seekh lo; saaf free
            // → 0; unstable/khali → NO charge (fail-safe).
            (function(_rec, _id) {
              _stableLabel(function(lbl) {
                try {
                  // Sirf label-classifier (cost yahan NAHI — done minutes baad
                  // hota hai, user tab tak model badal chuka ho sakta hai, wo
                  // is video ka cost nahi). "Veo 3.1 - Lite" badge ke baghair
                  // UNKNOWN = NO charge (LP bachao, safe direction).
                  var _cls = lbl ? _classifyModelText(lbl) : 'unknown';
                  if (_cls === 'unknown') {
                    _bfDbg('NET DONE op …' + _id.slice(-8) + ' label unclear/lite-ambiguous → NO charge (safe)');
                    if (isHeavyPlan()) _bfStatus('Video ready · 0 credits used', 'ok', 6000); // busy pill atka na rahe
                    return;
                  }
                  var free = (_cls === 'free');
                  // v32: stable-label se LEARN KABHI NAHI — ye done ke waqt ki
                  // CURRENT selection hai, is video ka model nahi. Isi ne LP ka
                  // codename PAID sikha kar Lower videos par charge karwaya tha
                  // (mixed session: LP video complete hui jab Omni select tha).
                  if (!free && isHeavyPlan()) {
                    _budgetDec('done-label');
                    _genMap[_id] = { status: 'done', deducted: true, omni: true };
                    _omniGens[_id] = { at: Date.now(), charged: false, confirmed: true };
                    _bfDbg('NET DONE op …' + _id.slice(-8) + ' OMNI(label "' + lbl.slice(0, 24) + '") → charge 50');
                    chargeCompletedVideo(1, _id);
                  } else {
                    _bfDbg('NET DONE op …' + _id.slice(-8) + ' FREE(label "' + lbl.slice(0, 24) + '") → 0 credits');
                    if (isHeavyPlan()) _bfStatus('Video ready · Free model · 0 credits used', 'ok', 6000); // busy pill atka na rahe
                  }
                } catch (_) {}
              });
            })(rec, id);
            continue;
          }
          if (rec.omni) {
            _budgetDec('done');
            _genMap[id] = { status: 'done', deducted: true, omni: true };
            _omniGens[id] = { at: Date.now(), charged: false, confirmed: true };
            _bfDbg('NET DONE op …' + id.slice(-8) + ' OMNI mk=[' + rec.mk + '] → charge 50');
            chargeCompletedVideo(1, id);
          } else {
            _bfDbg('NET DONE op …' + id.slice(-8) + ' FREE → 0 credits');
            if (isHeavyPlan()) _bfStatus('Video ready · Free model · 0 credits used', 'ok', 6000);
          }
        }
      }
    } catch (_) {}
  }
  // Do channels: postMessage (MAIN→ISOLATED sab se pakka) + CustomEvent (backup)
  // Channel-health: har message-type ki PEHLI wasuli par "CH ... ALIVE" log hota
  // hai — ek screenshot se foran pata chalta hai kaunsa channel zinda/mara hai.
  var _chSeen = {};
  function _chAlive(tag) {
    if (_chSeen[tag]) return;
    _chSeen[tag] = 1;
    _bfDbg('CH ' + tag + ' ALIVE ✓');
  }
  window.addEventListener('message', function(e) {
    try {
      if (e && e.data && e.data.__bf_boot) _chAlive('MAIN-wrapper');
      if (e && e.data && e.data.__bf_req) { _chAlive('req'); _lastReqEvtAt = Date.now(); _onBfReq(e.data.__bf_req); }
      if (e && e.data && e.data.__bf_gen_submit) { _triggerGenerationDeduction('Network API Generate'); }
      if (e && e.data && e.data.__bf_gen2) { _chAlive('GEN'); _onBfGen2(e.data.__bf_gen2); }
      if (e && e.data && e.data.__bf_st2) { _chAlive('ST'); _onBfSt2(e.data.__bf_st2); }
      if (e && e.data && e.data.__bf_hist) { _chAlive('HIST'); _onBfHist(e.data.__bf_hist); }
    } catch (_) {}
  });
  var _lastReqEvtAt = 0;
  document.addEventListener('__bf_req__', function(e) {
    // postMessage pehle pohnch chuka ho to duplicate skip (200ms window)
    var now = Date.now();
    if (now - _lastReqEvtAt < 200) return;
    _lastReqEvtAt = now;
    _onBfReq(e && e.detail);
  });

  // Backup intent: HAR click par model sample karo (capture phase — koi click
  // miss nahi hota). Send hamesha aakhri click hota hai; agar network wala
  // channel fail ho to yehi aakhri click sahi model batata hai.
  document.addEventListener('click', function() {
    try { if (isHeavyPlan()) _setIntent(); } catch (_) {}
  }, true);

  function isHeavyPlan() { return _userPlan === 'heavy'; }

  // Model ka naam sirf settings panel khula hone par DOM mein hota hai. User model
  // chun kar panel band kar deta hai, phir generate karta hai — us waqt live text
  // milta hi nahi. Is liye last-seen model text cache hota hai (panel khulte hi
  // refresh) aur navigation par clear (fail-safe: naye project par purana Omni
  // flag carry nahi hota → kabhi wrong charge nahi).
  var _lastModelTxt = '';
  var _lastModelUrl = '';
  // GOOGLE KA APNA HISAAB (sab se pakka): panel mein "Generating will use N credits"
  // likha hota hai — Lower par 0, Omni/Fast/Quality par >0. Model chunne ke liye
  // panel kholna hi parta hai, is liye ye text hamesha CHUNE HUE model ka hota
  // hai. Label-reading flap karti thi (chhupa hua purana element parh leti thi) —
  // cost-reading us se azaad hai.
  var _lastCost = null; // Google ke apne credits (0 = free model)
  var _lastCostAt = 0;  // kab parha gaya — sirf TAAZA (<3s) cost par bharosa
  var _lastModelChangeAt = 0; // model text kab BADLA — us se pehle/thurant baad ka cost PURANE model ka ho sakta hai
  var _lblCand = '', _lblCandN = 0; // label debounce candidate (2 stable ticks)
  var _selCost = null; // MAUJOODA model ke sath bandha cost — model badle to null
  // x1/x2 selector: composer ke "Video · 8s ▭ x2" wale pill se parhta hai.
  function _detectQty() {
    try {
      var els = document.querySelectorAll('button,[role="button"],[role="combobox"]');
      var i, txt, m;
      // PASS 1 (sab se pakka): composer ka "Video · 8s ▭ x1" pill — isi mein
      // ASAL selected qty hoti hai. Settings panel ke "x1"/"x2" buttons ALAG
      // hain (dono hamesha DOM mein hote hain — unhe parhna hi v30 ka bug tha:
      // x1 select tha lekin card x2 dikhata tha).
      for (i = els.length - 1; i >= 0; i--) {
        txt = (els[i].textContent || '').trim();
        if (txt.length > 40) continue;
        if (!/video/i.test(txt)) continue;
        m = txt.match(/x\s*([124])(?:\s|$)/);
        if (m && els[i].getBoundingClientRect().width > 8) return parseInt(m[1], 10);
      }
      // PASS 2: settings panel ke x1/x2 buttons mein se jo SELECTED hai
      // (aria-pressed/aria-selected/data-state) — panel khula ho to.
      for (i = els.length - 1; i >= 0; i--) {
        txt = (els[i].textContent || '').trim();
        if (!/^x\s*[124]$/.test(txt)) continue;
        var el = els[i];
        var on = el.getAttribute('aria-pressed') === 'true' ||
                 el.getAttribute('aria-selected') === 'true' ||
                 el.getAttribute('aria-checked') === 'true' ||
                 /on|active|selected/i.test(String(el.getAttribute('data-state') || ''));
        if (on) { var m2 = txt.match(/([124])/); if (m2) return parseInt(m2[1], 10); }
      }
    } catch (_) {}
    return 0; // 0 = UNSURE (panel khula/band hote hi DOM badalta hai — andha 1 mat do)
  }
  var _lastQty = 1, _qtyCand = 0, _qtyCandN = 0;
  // STICKY + DEBOUNCED qty: nayi reading tabhi mano jab 2 sampler ticks (~800ms)
  // lagatar same aaye. Unsure (0) par AAKHRI pakki qty hi rakho — isi se card
  // ka x1/x2 flap karna band hua ("kabi 1 kabi 2 kabi charge-nahi" wala bug).
  function _stableQty() {
    var q = _detectQty();
    if (q > 0) {
      if (q === _lastQty) { _qtyCand = 0; _qtyCandN = 0; }
      else if (q === _qtyCand) { if (++_qtyCandN >= 2) { _lastQty = q; _qtyCand = 0; _qtyCandN = 0; } }
      else { _qtyCand = q; _qtyCandN = 1; }
    }
    return _lastQty;
  }
  // v33 INSTANT SAMPLER: pehle 400ms poll + 2-tick debounce tha (~1-2 sec lag,
  // "Omni select kiya lekin card Lower dikhata raha"). Ab EVENT-DRIVEN hai:
  // har click/keyup + DOM mutation par foran sample; debounce ab bhi 2 SAME
  // reads mangta hai (flap-guard) lekin reads kam-az-kam 50ms alag hoti hain —
  // total ~50-150ms, aankh ko instant.
  var _lastSampleAt = 0;
  function _bfSample(force) {
    var now = Date.now();
    if (!force && now - _lastSampleAt < 50) return; // flood-guard: 2 reads ek hi paint ki na hon
    _lastSampleAt = now;
    try {
      if (location.href !== _lastModelUrl) { _lastModelUrl = location.href; _lastModelTxt = ''; _lastCost = null; _lastCostAt = 0; _lastModelChangeAt = 0; _lblCand = ''; _lblCandN = 0; }
      var t = _getCurrentModelText();
      // LABEL DEBOUNCE: settings panel khulne/band hone par chhota-match badal
      // jata hai ("Omni Flash" vs pill text) — har flap _lastModelChangeAt ko
      // dobara arm kar ke cost-guard hamesha block karti thi ("koi charge nahi"
      // flap). Naya label tabhi mano jab 2 samples lagatar SAME rahe.
      if (t && t !== _lastModelTxt) {
        if (t === _lblCand) { _lblCandN++; } else { _lblCand = t; _lblCandN = 1; }
        if (_lblCandN >= 2) {
          if (_lastModelTxt) _lastModelChangeAt = Date.now(); // asli switch (pehli read nahi)
          _lastModelTxt = t;
          _lblCand = ''; _lblCandN = 0;
          _selCost = null; // model badla → purane model ka bandha cost RADD
        }
      } else { _lblCand = ''; _lblCandN = 0; }
      var _ct = (document.body && document.body.textContent) || '';
      var _cm = _ct.match(/Generating\s+will\s+use\s*([\d,]+)\s*credits?/i);
      if (_cm) {
        _lastCost = parseInt(_cm[1].replace(/,/g, ''), 10) || 0; _lastCostAt = Date.now();
        // MODEL-BOUND cost (v31): switch ke 1.5s baad ka cost pakka ISI model ka
        // hai → model ke sath baandh do. Panel band hone se ye NAHI mit'ta —
        // sirf model badalne par mit'ta hai. (3s wall-clock window ka masla:
        // panel band kar ke der se send → cost "stale" → UNKNOWN → no charge,
        // Omni FREE nikal jata tha.)
        // v37 IMAGE-MODE GUARD: agar abhi tak KOI video-model label nahi dikha
        // (_lastModelTxt khali) to ye "0 credits" IMAGE model (Nano Banana/
        // Imagen) ka hai — video ke sath baandhna hi wo bug tha jis se image-
        // first project mein Omni submit FREE(cost=0) nikal jata tha.
        if ((!_lastModelChangeAt || (Date.now() - _lastModelChangeAt) >= 1500) && _lastModelTxt) _selCost = _lastCost;
      }
      // LIVE HEAD LINE — abhi kya select hai aur kitne credits katenge.
      // Faisla wohi rules se jo billing karti hai (phrase → fresh cost).
      if (_bfDbgEnabled() && isHeavyPlan()) {
        var _q = _stableQty();
        var _lbl = (_lastModelTxt || '?').replace(/arrow_drop_down|arrow_drop_up|expand_more|expand_less/gi, '').replace(/\s+/g, ' ').trim().slice(0, 42);
        var _fc2 = _freshCost();
        if (_fc2 === null && _selCost !== null) _fc2 = _selCost; // model-bound cost
        var _hd;
        var _lc2 = _classifyModelText(_lbl);
        if (/low(?:er)?[\s._%-]*priority/i.test(_lbl)) _hd = 'FREE (Lower Priority) → 0 credits';
        else if (_fc2 === 0) _hd = 'FREE (cost 0) → 0 credits';
        else if (_fc2 !== null && _fc2 > 0) _hd = 'PAID (cost ' + _fc2 + ') → ' + (50 * _q) + ' credits katenge';
        else if (_lc2 === 'paid') _hd = 'PAID (' + _lbl.slice(0, 14) + ') → ' + (50 * _q) + ' credits katenge';
        else _hd = 'model naam abhi screen par nahi — submit par network se pakka faisla (Lower=0, baqi=' + (50 * _q) + ')';
        var _newHead = '\u25B6 ' + _lbl + ' · x' + _q + ' · ' + _hd;
        if (_newHead !== _bfDbgHead) { _bfDbgHead = _newHead; _bfDbgRender(null); }
      }
    } catch (_) {}
  }
  setInterval(_bfSample, 150); // safety-net poll (events miss ho jayen to bhi taaza rahe)
  // Click/keyboard ke foran baad Google DOM async update karta hai — isliye
  // abhi + 60ms + 160ms + 350ms par dobara sample (debounce 2 reads mein poora).
  function _bfSampleBurst() {
    _bfSample(true);
    setTimeout(_bfSample, 60);
    setTimeout(_bfSample, 160);
    setTimeout(_bfSample, 350);
  }
  document.addEventListener('click', _bfSampleBurst, true);
  document.addEventListener('pointerup', _bfSampleBurst, true);
  document.addEventListener('keyup', _bfSampleBurst, true);
  // MutationObserver: bina click ke bhi (Google khud panel/pill text badle)
  // foran pakro — rAF-throttled taake page slow na ho.
  try {
    var _bfMoPending = false;
    new MutationObserver(function() {
      if (_bfMoPending) return;
      _bfMoPending = true;
      requestAnimationFrame(function() { _bfMoPending = false; _bfSample(); });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (_) {}
  function _freshCost() {
    // SIRF 3 second ka window: cost-text screen par tabhi hota hai jab page idle
    // ho; generation SHURU hote hi wo text ghayab ho jata hai. Lamba window (30s)
    // mixed sessions mein agli submit ko PURANE model ka cost de deta tha (LP ko
    // Omni ka 12, ya Omni ko LP ka 0 → ulat-phir). Sampler har 400ms parhta hai,
    // is liye idle page par ye hamesha fresh rehta hai.
    var now = Date.now();
    if (_lastCost === null || (now - _lastCostAt) >= 3000) return null;
    // v29 GUARD: model abhi-abhi (<1.5s) badla ho to screen ka cost-text shayad
    // PURANE model ka ho (Google UI der se update karta hai) — is par bharosa
    // kar ke Lower ka codename PAID seekhna hi wo pollution thi jo Lower videos
    // par hamesha charge karwati rahi. Switch ke turant baad cost = UNKNOWN.
    if (_lastModelChangeAt && (now - _lastModelChangeAt) < 1500) return null;
    // Cost model-change se PEHLE parha gaya → wo purane model ka hai, kabhi nahi.
    if (_lastModelChangeAt && _lastCostAt < _lastModelChangeAt) return null;
    return _lastCost;
  }

  // Naya rule (owner): SIRF "Lower Priority" / Lite model FREE hai. Baqi HAR
  // model (Omni Flash, Fast, Quality, jo bhi aaye) par 50 credits katen.
  // Model text bilkul na mile (kabhi panel nahi khula, closed control bhi na
  // pada ja saka) → charge NAHI (fail-safe: ghalat charge kabhi nahi).
  const FREE_MODEL_RE = /low(?:er)?[\s._-]*priority/i; // "lite" akela FREE nahi — sirf "Lite [Lower Priority]" free hai
  // Text se faisla: 'free' | 'paid' | 'unknown'. "lite" (bina "lower priority"
  // phrase) JAANBOOJH kar UNKNOWN — Google par "[Lower Priority]" badge alag
  // element hai, is liye "Veo 3.1 - Lite" text LP (free) BHI ho sakta hai aur
  // plain paid Lite BHI. Un ka imtiyaz SIRF cost-text (0 vs >0) se hota hai.
  function _classifyModelText(t) {
    var s = String(t || '');
    if (!s) return 'unknown';
    if (/low(?:er)?[\s._%-]*priority/i.test(s)) return 'free';
    if (/lite/i.test(s)) return 'unknown'; // ambiguous — cost-text chahiye
    if (/omni|flash|fast|quality|turbo/i.test(s)) return 'paid';
    return 'unknown';
  }
  function _isOmniSelected() {
    try {
      const t = ((typeof _getCurrentModelText === 'function') ? _getCurrentModelText() : '') || _lastModelTxt;
      if (!t) return false;              // model unknown → no charge (safe)
      return !FREE_MODEL_RE.test(t);     // Lower Priority/Lite → free; else charge
    } catch (_) { return false; }
  }

  function chargeCompletedVideo(count, genIdHint) {
    _bfDbg('charge? plan=' + _userPlan + ' hint=' + String(genIdHint || '').slice(-6) +
      ' rec=' + (genIdHint && _genMap[genIdHint] ? 'y/omni=' + !!_genMap[genIdHint].omni : 'NONE'));
    if (!isHeavyPlan()) return; // non-Heavy → no-op (purana behavior same)
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    // Model initiation par capture hota hai (_genMap[].omni / _omniGens) — completion
    // par sirf wohi record dekhtay hain, taake user ne beech mein selector badla to bhi sahi charge ho.
    // Sirf tracked generation ID se charge — genIdHint ka record initiation par omni-flag
    // ke sath bind hua tha. Bina tracked ID ke koi charge nahi (wrong charge se bachna
    // missed charge se behtar hai).
    if (!genIdHint) return;
    const genRec = _genMap[genIdHint];
    if (!genRec || !genRec.omni) return;   // yeh generation Omni nahi thi → koi charge nahi
    const genId = genIdHint;
    const rec = _omniGens[genId];
    if (rec && rec.charged) return;        // server pehle hi confirm kar chuka
    if (_omniInFlight[genId]) return;      // isi gen ka charge pehle se in-flight
    _omniInFlight[genId] = true;
    // HAMESHA qty=1 per generation: progress-bar count unreliable hai (edit page par
    // purani video ka % bhi count hota tha → double charge). Ek send = ek video = 50.
    const qty   = 1;
    chrome.storage.local.get(null, function(all) {
      const token   = _extractJwt(all);
      const apiBase = String(all.apiBase || 'http://localhost:5000').replace(/\/+$/, '');
      if (!token || token.length < 20) { _bfDbg('charge ABORT: no token'); delete _omniInFlight[genId]; return; }
      _bfDbg('charge POST gen=' + String(genId).slice(-6) + ' qty=' + qty);
      fetch(apiBase + '/api/extension/use-omni-credits', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'X-Ext-Version': '1.4'
        },
        body: JSON.stringify({ genId: genId, qty: qty })
      })
      .then(function(res) {
        return res.json().catch(function() { return null; })
          .then(function(data) { return { status: res.status, data: data }; });
      })
      .then(function(r) {
        delete _omniInFlight[genId];
        _bfDbg('charge RESP ' + (r ? r.status : '?') + ' left=' + (r && r.data ? r.data.omniCreditsLeft : '?'));
        if (!r || !r.data) return;
        // Definitive response → is genId ko settle mark karo (success/duplicate/402 sab pe),
        // taake baad ke events isko dobara resolve na karein. Network error pe mark NAHI
        // hota — agla detection event isi genId se retry kar sakta hai (server dedupe-safe).
        if (_omniGens[genId]) _omniGens[genId].charged = true;
        if (typeof r.data.omniCreditsLeft === 'number' && chrome.storage) {
          chrome.storage.local.set({ heavyCredits: r.data.omniCreditsLeft, omniCreditsLeft: r.data.omniCreditsLeft });
        }
        if (r.status === 200 && typeof r.data.omniCreditsLeft === 'number') {
          _bfStatus('Video ready · 50 credits used · ' + r.data.omniCreditsLeft + ' left', 'ok', 8000);
          var _left = r.data.omniCreditsLeft;
          if (_left <= 0) {
            // v34: balance ISI charge par 0 hua → server ne 20s switch clock isi
            // waqt start kar diya (poolSwitchInSeconds) — countdown foran dikhao.
            _bfSwitchCountdown(typeof r.data.poolSwitchInSeconds === 'number' ? r.data.poolSwitchInSeconds : 20);
          } else if (_left <= 200) {
            // v34: 200-credit warning (sirf Heavy — ye path Heavy billing hi hai).
            _showOmniNotice('\u26A0 Low credits: only ' + _left + ' Bunny credits left.', '#78350f', '#fde68a');
          }
        }
        if (r.status === 402 && r.data.error === 'OMNI_CREDITS_EXHAUSTED') {
          _bfSwitchCountdown(typeof r.data.poolSwitchInSeconds === 'number' ? r.data.poolSwitchInSeconds : 20);
        }
      })
      .catch(function() { delete _omniInFlight[genId]; });
    });
  }

  function _showOmniNotice(msg, bg, fg) {
    try {
      const old = document.getElementById('__bf_omni_notice__');
      if (old) old.remove();
      const n = document.createElement('div');
      n.id = '__bf_omni_notice__';
      n.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'background:' + (bg || '#7f1d1d') + ';color:' + (fg || '#fecaca') + ';padding:10px 16px;border-radius:10px;font:600 13px system-ui;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:90vw;text-align:center;';
      n.textContent = msg;
      (document.body || document.documentElement).appendChild(n);
      setTimeout(function() { try { n.remove(); } catch(_) {} }, 12000);
    } catch (_) {}
  }

  // ── v34: 20s Max-pool switch countdown ─────────────────────────────────────
  // Credits 0 hote hi server 20s ka switch clock stamp karta hai. Ye side par
  // live countdown dikhata hai; 0 par background ko FORCE cookie re-inject ka
  // message bhejta hai (naya Max-pool account foran lag jaye, poll ka intezar na ho)
  // aur phir page reload — user seedha Max pool par.
  var _bfSwTimer = null;
  function _bfSwitchCountdown(secs) {
    try {
      if (_bfSwTimer) { clearInterval(_bfSwTimer); _bfSwTimer = null; }
      var left = Math.max(1, Math.round(secs || 20));
      var render = function() {
        _showOmniNotice(left > 0
          ? 'Bunny AI credits finished \u2014 switching to the Max pool in ' + left + 's\u2026'
          : 'Switching to Max pool now\u2026');
      };
      render();
      _bfSwTimer = setInterval(function() {
        left--;
        render();
        if (left <= 0) {
          clearInterval(_bfSwTimer); _bfSwTimer = null;
          // +2s server-side clock margin, phir force re-inject.
          // v38: AUTO-RELOAD HATA DIA (owner ka hukm: page kabhi khud refresh
          // na ho — user ka chalta kaam/generation tabah ho jata tha aur kabhi
          // signout screen par utar deta tha). Ab cookies laga kar sirf
          // notice: user khud refresh kare jab farigh ho.
          setTimeout(function() {
            try {
              chrome.runtime.sendMessage({ type: 'BUNNYFLOW_INJECT_COOKIES', force: true }, function() {
                _showOmniNotice('Max pool ready \u2014 refresh this page when you are done to switch.');
              });
            } catch (_) { _showOmniNotice('Max pool ready \u2014 refresh this page when you are done to switch.'); }
          }, 2000);
        }
      }, 1000);
    } catch (_) {}
  }

  // ─── Layer 2: Network intercept backup ────────────────────────────────────
  // bf_early.js dispatches __bf_gen__ when it finds videoUri in API responses.
  // NOTE: Omni (Heavy) billing is intentionally NOT wired here — this event has no
  // job/generation ID, so it cannot correlate a completion to its initiation. Omni
  // charging happens ONLY via Layer 1's tracked genId (see chargeCompletedVideo).
  document.addEventListener('__bf_gen__', function(e) {
    if (!e.detail || !e.detail.count || e.detail.count <= 0) return;
    callUseCredits(e.detail.type || 'video', e.detail.count);
  });

  // ─── Layer 1: Progress-bar disappearance (PRIMARY) ────────────────────────
  // Counts leaf DOM elements that contain only a percentage number (e.g. "33%").
  // When those disappear after being present → generation completed.
  let _progSeen  = 0; // max % bars seen in current generation run
  var _lastBarCount = 0; // pichli poll par bars ki tadaad (increase = nayi gen confirm)
  let _progPolls = 0; // consecutive polls with % bars visible
  let _genLastUrl = '';

  function countProgressBars() {
    var count = 0;
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.childElementCount === 0) {
        var txt = (el.textContent || '').trim();
        // Match only pure percentage text: "33%" "100%" etc.
        if (/^[1-9]\d?%$|^100%$/.test(txt)) count++;
      }
    }
    return count;
  }

  function watchGenerations() {
    if (isHome()) {
      _progSeen = 0; _progPolls = 0; _genLastUrl = ''; _lastBarCount = 0;
      _intentQueue.length = 0; _lastIntent = null; // purane project ke intents kabhi carry na hon
      return;
    }

    // Reset counters on page navigation
    if (location.href !== _genLastUrl) {
      _genLastUrl = location.href;
      _progSeen = 0; _progPolls = 0; _lastBarCount = 0;
      // Nav par intents SAAF: send aur bar-start hamesha USI project page par
      // hote hain — bacha hua intent doosre project ki video par charge kara deta tha.
      _intentQueue.length = 0; _lastIntent = null;
      return;
    }

    var current = countProgressBars();

    if (current > 0) {
      // Generation in progress
      if (_progSeen === 0) _bfDbg('progress bars seen: ' + current);
      if (current > _progSeen) _progSeen = current;
      _progPolls++;

      // Ensure current generation is tracked — NEUTRAL. Poll ke waqt dropdown
      // parhna GHALAT tha (user beech mein model badal le to galat label/charge).
      // Omni attribution sirf intent (network/click) se hoti hai, yahan kabhi nahi.
      if (!_currGenId || !_genMap[_currGenId]) {
        _currGenId = _newGenId();
        _genMap[_currGenId] = { status: 'pending', deducted: false, omni: false };
        _bfDbg('gen tracked (neutral) gen=' + String(_currGenId).slice(-6));
      }
    }

    // Progress bars BARHI (nayi generation haqeeqatan shuru hui) → sab se NAYI
    // unconfirmed Omni entry ko confirm karo (sirf ek — ek increase = ek video).
    // Phantom clicks (model dropdown, toolbar) kabhi bars nahi barhate → unki
    // entries kabhi confirm nahi hotin aur 60s mein expire ho jati hain.
    if (current !== _lastBarCount) {
      // Debug: har % element ke tile (ancestor) ki text ka snippet — taake pata chale
      // tile par model ka naam hota hai ya nahi (behtar attribution ke liye).
      try {
        var _tileInfo = [];
        var _allEls = document.getElementsByTagName('*');
        for (var _ti = 0; _ti < _allEls.length && _tileInfo.length < 4; _ti++) {
          var _te = _allEls[_ti];
          if (_te.childElementCount === 0 && /^[1-9]\d?%$|^100%$/.test((_te.textContent || '').trim())) {
            var _anc = _te; for (var _up = 0; _up < 5 && _anc.parentElement; _up++) _anc = _anc.parentElement;
            _tileInfo.push('"' + ((_anc.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 45)) + '"');
          }
        }
        _bfDbg('bars ' + _lastBarCount + '→' + current + (_tileInfo.length ? ' tiles: ' + _tileInfo.join(' | ') : ''));
      } catch (_) {}
    }
    // Progress bars BARHI (nayi generation haqeeqatan shuru hui) → aakhri click-INTENT
    // kharch karo. Send click hamesha aakhri click hota hai, is liye us waqt ka
    // selected model hi is video ka model hai. Intent 10 min valid (Flow parallel
    // sends ko QUEUE karta hai — dusri video ki bar pehli ke baad aati hai).
    if (current > _lastBarCount) {
      var _nowC = Date.now();
      var _delta = current - _lastBarCount;
      _triggerGenerationDeduction('Progress Bar Appeared (' + _delta + ')');
      // Har unit ke liye ek intent-qty kharch hoti hai. x2/x4: submit ke intent
      // mein qty>1 hoti hai — usi jump ke andar reuse hoti hai. Jump khatam hote
      // hi bachi hui qty ZAYA ho jati hai (kabhi agli video par nahi jati —
      // yehi leftover Lower videos ko ghalat charge kara raha tha).
      var _curIt = null; // { omni, qtyLeft } — sirf ISI jump ke liye
      for (var _dv = 0; _dv < _delta; _dv++) {
        var _it = null;
        if (_curIt && _curIt.qtyLeft > 0) {
          _it = _curIt;
          _curIt.qtyLeft--;
          _bfDbg('same-submit qty reuse (x2/x4)');
        } else {
          _curIt = null;
          while (_intentQueue.length) {
            var _cand = _intentQueue.shift();
            if (_nowC - _cand.at <= 10 * 60 * 1000) {
              _curIt = { omni: _cand.omni, qtyLeft: Math.max(1, _cand.qty || 1) - 1 };
              _it = _curIt;
              break;
            }
          }
          if (!_it && _lastIntent && (_nowC - _lastIntent.at) <= 10 * 60 * 1000) {
            _it = _lastIntent;
            _bfDbg('click-intent fallback');
          }
        }
        _lastIntent = null;
        // v16 NET-TRUTH: bars/intents ab sirf PILL display ke liye hain — billing
        // 100% network operation-IDs se hoti hai (_onBfGen2/_onBfSt2). DOM guessing
        // se ab KABHI koi charge nahi banta (mix/parallel misalignment khatam).
        if (_it && _it.omni) _bfStatus('Generating content…', 'busy', 240000);
        else if (isHeavyPlan()) _bfStatus('Generating content…', 'busy', 240000); // safety auto-hide 4 min
      }
    }
    _lastBarCount = current;

    if (current > 0) {
      // handled above
    } else if (_progPolls >= 1 && _progSeen > 0) {
      // Progress bars gone → generation succeeded
      _bfDbg('COMPLETE n=' + _progSeen + ' gen=' + String(_currGenId || '').slice(-6));
      var completed = _progSeen;
      var genId     = _currGenId;
      _progSeen     = 0;
      _progPolls    = 0;

      // Task 2: use tracking — mark success → deduct only once
      if (genId && _genMap[genId] && !_genMap[genId].deducted) {
        _markGenSuccess(genId);
        // If more than 1 video was generating, charge for the rest directly
        for (var extra = 1; extra < completed; extra++) {
          var xId = _newGenId();
          _genMap[xId] = { status: 'pending', deducted: false };
          _markGenSuccess(xId);
        }
      } else {
        // Fallback: no tracking record → charge directly
        callUseCredits('video', completed);
      }

      // BunnyFlow: Omni Flash (Heavy plan only) — HAR tracked Omni generation apna
      // apna 50-credit charge (qty=1). Progress-bar count par bharosa nahi (purani
      // video ka % ya duplicate DOM element double-charge kara deta tha). Lower
      // Priority/free gens _omniGens mein hoti hi nahi → kabhi charge nahi hoti.
      var _nowTs = Date.now(), _chargedAny = false;
      for (var _gid in _omniGens) {
        var _oRec = _omniGens[_gid];
        if (_oRec.charged) continue;
        if (!_oRec.confirmed) continue;    // generation kabhi shuru hi nahi hui → no charge
        if (_nowTs - _oRec.at > 30 * 60 * 1000) { delete _omniGens[_gid]; continue; }
        _chargedAny = true;
        chargeCompletedVideo(1, _gid);
      }
      if (!_chargedAny && isHeavyPlan()) {
        // v16: free/paid ka final faisla network status par hota hai — yahan
        // sirf neutral pill (warna Omni ke '50 used' pill ko overwrite kar deta).
        _bfStatus('Video ready', 'ok', 6000);
      }

      _currGenId = null;
    }
  }

  // ── MISSING FUNCTIONS (restored) ─────────────────────────────────────────

  // Variable declarations referenced in onNav() and below
  let lpSwitchPending = false;
  let _genBaseVideo   = -1;  // kept for onNav() compat

  // Simple generation tracking: Task 2
  // Each generation gets a unique ID, status, and deducted flag.
  // Only deduct when status = 'success' AND deducted = false.
  const _genMap = {};   // { [genId]: { status, deducted } }
  let   _currGenId = null;

  function _newGenId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function _markGenSuccess(genId) {
    if (!genId || !_genMap[genId]) return;
    const rec = _genMap[genId];
    if (rec.status === 'success' && rec.deducted) return; // already handled
    rec.status   = 'success';
    if (!rec.deducted) {
      rec.deducted = true;
      callUseCredits('video', 1);
    }
  }

  // ── AUTO-SELECT LOWER PRIORITY MODEL ─────────────────────────────────────
  // Every time user lands on Flow (fresh load, redirect, SPA nav):
  //  1. Check if LP is already selected → done
  //  2. If not, open the model dropdown by clicking the current model button
  //  3. Wait 400ms for dropdown to appear, then click LP option
  //  4. If LP option not found yet, retry up to 8 times (every 300ms)
  //
  // MODEL_RE: matches any non-LP video model name (Veo, Fast, Quality, etc.)
  const MODEL_BTN_RE = /veo|fast|quality|standard|turbo|flash|ultra/i;

  let _lpDone    = false;   // true once LP successfully clicked this page load
  let _lpOpening = false;   // true while we're in the open→click sequence

  function _isLPSelected() {
    const all = document.querySelectorAll('button[aria-haspopup="menu"],button[aria-haspopup="listbox"],[role="combobox"],button');
    for (var i = 0; i < all.length; i++) {
      const txt = (all[i].textContent || all[i].value || '').trim();
      if (txt.length < 3 || txt.length > 120) continue;
      if (!/veo/i.test(txt)) continue;
      if (all[i].getBoundingClientRect().width < 10) continue;
      return LP_RE.test(txt) && !/quality|fast/i.test(txt);
    }
    return true; // No Veo button visible (e.g. image mode)
  }

  function _clickLPInDropdown() {
    const opts = document.querySelectorAll(
      '[role="option"],[role="menuitem"],[role="listitem"],li,[tabindex="0"],[tabindex="-1"],div,span'
    );
    for (var i = 0; i < opts.length; i++) {
      const opt = opts[i];
      if (opt.childElementCount > 3) continue;
      const txt = (opt.textContent || '').trim();
      if (txt.length < 3 || txt.length > 100) continue;
      if (!LP_RE.test(txt)) continue;
      if (/quality|fast/i.test(txt)) continue;
      const rect = opt.getBoundingClientRect();
      if (rect.width < 5 && rect.height < 5) continue;

      const target = opt.closest('[role="option"],[role="menuitem"],li,button') || opt;
      try {
        ['mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(evt) {
          target.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
        });
        if (typeof target.click === 'function') target.click();
      } catch(e) {}

      _lpDone    = true;
      _lpOpening = false;
      return true;
    }
    return false;
  }

  function _openModelDropdown() {
    const btns = document.querySelectorAll('button[aria-haspopup="menu"],button[aria-haspopup="listbox"],[role="combobox"],button');
    for (var i = 0; i < btns.length; i++) {
      const btn = btns[i];
      const txt = (btn.textContent || '').trim();
      if (txt.length < 3 || txt.length > 120) continue;
      if (!/veo/i.test(txt)) continue;
      if (LP_RE.test(txt) && !/quality|fast/i.test(txt)) continue; // already LP/Lite
      const rect = btn.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 6) continue;
      try { btn.click(); } catch(e) {}
      return true;
    }
    return false;
  }

  var _lpObserver = null;

  function _startLPObserver() {
    if (_lpObserver) return;
    _lpObserver = new MutationObserver(function() {
      if (isHome()) return;
      if (!_isLPSelected()) {
        _clickLPInDropdown();
      }
    });
    _lpObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function _stopLPObserver() {
    if (_lpObserver) { _lpObserver.disconnect(); _lpObserver = null; }
  }

  function _trySelectLP(retries) {
    if (isHome()) { _stopLPObserver(); _lpOpening = false; return; }
    if (_isLPSelected()) { _lpOpening = false; _stopLPObserver(); return; }
    if (_clickLPInDropdown()) {
      setTimeout(function() {
        if (_isLPSelected()) { _lpOpening = false; _stopLPObserver(); }
        else { _openModelDropdown(); }
      }, 300);
      return;
    }
    if (retries <= 0) { _lpOpening = false; _stopLPObserver(); return; }
    _openModelDropdown();
    setTimeout(function() { _trySelectLP(retries - 1); }, 350);
  }

  function autoSelectLP() {
    return; // Model interference disabled per user request
    if (isHome()) return;
    if (!_isLPSelected()) {
      if (_lpOpening) return;
      _lpOpening = true;
      _startLPObserver();
      _trySelectLP(15);
    }
  }

  // ── ENFORCE LP MODEL: lock send button via HTML attribute + CSS ─────────────
  // Sets/removes data-bf-model-locked on <html> element.
  // CSS (above) turns send button RED when attribute is present.
  // bf_early.js capture-phase listener blocks actual clicks when attribute is set.

  function _getCurrentModelText() {
    // SAB SE CHHOTA (most specific) match lo: bara container (poora toolbar jis
    // mein dono model naam ho sakte hain) ghalat jawab deta hai.
    var best = '';
    // APNI UI kabhi na parho: pill/debug/notice mein "Omni Flash" waghera hota
    // hai — wohi text model samajh lena zehreela loop banata hai (self-read bug:
    // pill dikhi → har click omni=true → doosre project ki Lower videos par charge).
    var _OUR_UI = '#__bf_dbg__,#__bf_status__,#__bf_omni_notice__';
    var _OUR_TXT_RE = /generating video|video ready|credits used|free model/i;
    const btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var i = 0; i < btns.length; i++) {
      const txt = (btns[i].textContent || '').trim();
      if (txt.length < 3 || txt.length > 100) continue;
      if (!/veo|omni|flash|lite|fast|quality|low(?:er)?.{0,6}priority/i.test(txt)) continue;
      if (_OUR_TXT_RE.test(txt)) continue;
      if (btns[i].closest && btns[i].closest(_OUR_UI)) continue;
      if (btns[i].getBoundingClientRect().width < 10) continue;
      if (!best || txt.length < best.length) best = txt;
    }
    // Fallback (edit/extend page): model ka naam chhote chip/span mein hota hai jo
    // button nahi hota. Leaf-ish elements scan karo jinki text seedha model naam ho.
    const MODEL_TXT_RE = /omni[\s._-]*flash|veo\s*[\d.]|low(?:er)?.{0,6}priority/i;
    var all = document.getElementsByTagName('*');
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      if (el.childElementCount > 2) continue;
      var t2 = (el.textContent || '').trim();
      if (t2.length < 3 || t2.length > 60) continue;
      if (!MODEL_TXT_RE.test(t2)) continue;
      if (_OUR_TXT_RE.test(t2)) continue;
      if (el.closest && el.closest(_OUR_UI)) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 5) continue;
      if (!best || t2.length < best.length) best = t2;
    }
    return best;
  }

  // ── SEND BUTTON LOCK: fixed overlay + attribute + inline style (triple lock) ──
  // Approach: a single <div id="__bf_slo__"> overlays the send button.
  // Its position is updated every 200ms so it never drifts.
  // bf_early.js (MAIN world) blocks the real button via data-bf-model-locked.
  // Inline styles on the button itself are also applied as a 3rd layer.

  var _slo = null; // the overlay div
  var _sloBtnObs = null; // MutationObserver watching the found button

  function _getOrCreateOverlay() {
    if (_slo && document.contains(_slo)) return _slo;
    _slo = document.createElement('div');
    _slo.id = '__bf_slo__';
    Object.assign(_slo.style, {
      position:     'fixed',
      zIndex:       '2147483646',
      borderRadius: '50%',
      cursor:       'not-allowed',
      background:   '#ef4444',
      opacity:      '0.92',
      display:      'none',
      pointerEvents:'auto',
    });
    _slo.title = 'Select "Lower Priority" model to generate video';
    _slo.style.pointerEvents = 'none';
    document.documentElement.appendChild(_slo);
    return _slo;
  }

  function _flashModelSel() {
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var j = 0; j < btns.length; j++) {
      var mt = (btns[j].textContent || '').trim();
      if (mt.length > 2 && mt.length < 100 && /veo/i.test(mt)
          && btns[j].getBoundingClientRect().width > 10) {
        var b2 = btns[j];
        b2.style.outline = '2px solid #ef4444';
        b2.style.borderRadius = '6px';
        setTimeout(function() { b2.style.outline = ''; b2.style.borderRadius = ''; }, 1200);
        break;
      }
    }
  }

  var _lastDeductTs = 0;
  function _triggerGenerationDeduction(reason) {
    return; // Credit system disabled per user request
    var now = Date.now();
    if (now - _lastDeductTs < 3500) return; // Cooldown 3.5s
    _lastDeductTs = now;

    var qty = 1;
    try {
      qty = _stableQty() || 1;
    } catch(_) { qty = 1; }

    var cost = 50 * qty;
    console.log('[ToolsByDcx] 🎬 Deducting ' + cost + ' credits for ' + qty + ' video(s) [' + reason + ']');
    callUseCredits('video', cost);
  }

  // Find the send button: rightmost + bottommost button in lower-right of screen
  function _findSendBtn() {
    var best = null, bestScore = -1;
    var wh = window.innerHeight, ww = window.innerWidth;
    var allBtns = document.querySelectorAll('button,[role="button"]');
    for (var i = 0; i < allBtns.length; i++) {
      var b = allBtns[i];
      if (!b.offsetParent && b.style.display === 'none') continue;
      var r = b.getBoundingClientRect();
      if (r.width < 20 || r.width > 90) continue;
      if (r.height < 20 || r.height > 90) continue;
      if (r.bottom < wh * 0.45) continue;            // lower screen
      if (r.right < ww * 0.35) continue;             // right side of screen

      var txt = (b.textContent || '').trim();
      var al = (b.getAttribute('aria-label') || '').toLowerCase();
      var title = (b.getAttribute('title') || '').toLowerCase();
      var html = (b.innerHTML || '').toLowerCase();

      var isArrow = /arrow_forward|send|generate|create/i.test(txt) ||
                    /arrow_forward|send|generate|create/i.test(al) ||
                    /arrow_forward|send|generate|create/i.test(title) ||
                    html.includes('arrow_forward') ||
                    b.querySelector('svg,img,i.google-symbols,span.google-symbols') !== null;

      if (!isArrow && txt.length > 20) continue;

      var score = (r.right / ww) * 2 + (r.bottom / wh);
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  function _applyLockStyles(btn) {
    if (!btn) return;
    btn.style.setProperty('background',       '#ef4444', 'important');
    btn.style.setProperty('background-color', '#ef4444', 'important');
    btn.style.setProperty('background-image', 'none',    'important');
    btn.style.setProperty('border-color',     '#b91c1c', 'important');
    btn.style.setProperty('opacity',          '1',       'important');
    btn.style.setProperty('cursor',           'not-allowed', 'important');
    btn.dataset.bfLocked = '1';
  }

  function _removeLockStyles(btn) {
    if (!btn) return;
    ['background','background-color','background-image','border-color','opacity','cursor']
      .forEach(function(p) { btn.style.removeProperty(p); });
    delete btn.dataset.bfLocked;
    btn.title = '';
  }

  function _positionOverlay(btn) {
    var ov = _getOrCreateOverlay();
    if (!btn) { ov.style.display = 'none'; return; }
    var r = btn.getBoundingClientRect();
    if (r.width < 1) { ov.style.display = 'none'; return; }
    ov.style.left   = r.left   + 'px';
    ov.style.top    = r.top    + 'px';
    ov.style.width  = r.width  + 'px';
    ov.style.height = r.height + 'px';
    ov.style.display = 'block';
  }

  var _sendBtnCache = null;
  var _btnObserver  = null;

  function _observeBtn(btn) {
    if (_btnObserver) { _btnObserver.disconnect(); _btnObserver = null; }
    if (!btn) return;
    _btnObserver = new MutationObserver(function() {
      if (document.documentElement.hasAttribute('data-bf-model-locked')) {
        _applyLockStyles(btn);
        _positionOverlay(btn);
      }
    });
    _btnObserver.observe(btn, { attributes: true, attributeFilter: ['style','class'] });
  }

  function enforceLPModel() {
    return; // Model interference disabled per user request
    if (isHome()) return;
    if (!_isLPSelected()) {
      autoSelectLP();
    }
  }

  // Global capture click listener for generate buttons
  document.addEventListener('click', function(e) {
    try {
      var target = e.target;
      var btn = target.closest('button,[role="button"]');
      if (!btn) return;
      var txt = (btn.textContent || '').trim();
      var al = (btn.getAttribute('aria-label') || '').toLowerCase();
      var title = (btn.getAttribute('title') || '').toLowerCase();
      var html = (btn.innerHTML || '').toLowerCase();

      var isGen = /arrow_forward/i.test(txt) ||
                  /send|generate|create\b/i.test(al) ||
                  /send|generate|create\b/i.test(title) ||
                  html.includes('arrow_forward');

      if (!isGen) {
        var sb = _findSendBtn();
        if (sb && (btn === sb || sb.contains(btn))) isGen = true;
      }
      if (isGen) {
        _triggerGenerationDeduction('Generate Button Click');
      }
    } catch(_) {}
  }, true);

  // Global capture keydown listener for Enter key in prompt
  document.addEventListener('keydown', function(e) {
    try {
      if (e.key === 'Enter' && !e.shiftKey) {
        var act = document.activeElement;
        if (act) {
          var tag = (act.tagName || '').toLowerCase();
          var isEdit = act.isContentEditable || tag === 'textarea' || (tag === 'input' && act.type === 'text');
          if (isEdit) {
            var val = (act.value || act.textContent || '').trim();
            if (val.length > 0) {
              _triggerGenerationDeduction('Enter Key Press');
            }
          }
        }
      }
    } catch(_) {}
  }, true);

  // hookSendButton: intercept the generate button to record a pending generation ID
  function hookSendButton() {
    if (isHome()) return;
    const BTN_SEL = '[aria-label*="send" i],[aria-label*="generat" i],[aria-label*="create" i],[title*="create" i],[title*="send" i]';
    var candidateBtns = Array.from(document.querySelectorAll(BTN_SEL));
    var sb = _findSendBtn();
    if (sb && !candidateBtns.includes(sb)) candidateBtns.push(sb);

    candidateBtns.forEach(function(btn) {
      if (btn.dataset.bfSendHooked) return;
      btn.dataset.bfSendHooked = '1';
      btn.addEventListener('click', function() {
        _triggerGenerationDeduction('Hooked Button Click');
      }, { capture: true });
    });
  }

  // ── HIDE "Not enough credits" GOOGLE FLOW ERROR TOASTS ──────────────────
  const _CRED_RE = /not enough credits|enough credits to save|credits to save this/i;
  const _TOAST_SELS = [
    '[role="alert"]', '[role="status"]',
    'snack-bar-container', 'mat-snack-bar-container',
    '.snackbar', '.toast', '.notification', '.alert-message',
    '[class*="snack"]', '[class*="toast"]', '[class*="notif"]',
    '[class*="error"]', '[class*="credits"]',
  ].join(',');

  function hideErrorMessages() {
    try {
      // Hide any element containing the "not enough credits" text
      document.querySelectorAll(_TOAST_SELS).forEach(el => {
        if (_CRED_RE.test(el.textContent || '')) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.setAttribute('data-bf-ban', '1');
        }
      });
      // Also scan all elements with inline error-like styles that mention credits
      document.querySelectorAll('[aria-live]').forEach(el => {
        if (_CRED_RE.test(el.textContent || '')) {
          el.style.setProperty('display', 'none', 'important');
          el.setAttribute('data-bf-ban', '1');
        }
      });
    } catch(e) {}
  }

  // ── v33b: PROMPT-BOX EXTRA ICONS HIDE ────────────────────────────────────
  // Owner rule: Agent-mode use ke doran prompt box ke expand/edit/tune icons
  // masla karte hain — inhe HIDE karo. Agent button, + button, send arrow aur
  // "Video · 8s x1" pill BILKUL nahi chherte (sirf icon-only buttons jinki
  // poori text material-icon ligature ho). Composer = textarea/contenteditable
  // ka qareebi container — page-level buttons (top filter "tune" waghera)
  // is scope se bahar rehte hain.
  // Icons SVG hain (koi ligature/text nahi) — isliye GEOMETRY se pehchan:
  //   • ICON-ONLY buttons (koi harf/hindsa nahi) hi candidates hain — "Agent",
  //     "Video · 8s x1" pill waghera TEXT wale hain, kabhi hide nahi honge.
  //   • Composer ke UPAR-half ka icon button = expand → hide.
  //   • Neeche-row: sab se LEFT (+) aur sab se RIGHT (send →) rakho,
  //     beech ke sab icon-buttons (edit-note, tune, …) → hide.
  //   • Safety: aria-label send/submit/create/add wale kabhi hide nahi.
  // v33d: pichhle 2 attempts fail — shayad prompt editor textarea/contenteditable
  // hi nahi tha (anchor hi nahi mila). Ab anchor = AGENT BUTTON (screen par
  // pakka hai) YA editor. Clickable = button/[role=button]/a/[tabindex] sab.
  // Rakhna: text wale (Agent, Video·8s pill), bottom-row ka sab-se-LEFT (+)
  // aur sab-se-RIGHT (send →). Baqi HAR icon-only clickable (expand, edit-note,
  // tune, …) hide. Card mein "cx:" diagnostics line har halat mein aati hai.
  var _cxLastDiag = '';
  function _cxHide(b, why) {
    if (b.dataset.bfCxHid) return false;
    b.dataset.bfCxHid = '1';
    b.style.setProperty('display', 'none', 'important');
    b.style.setProperty('visibility', 'hidden', 'important');
    _bfDbgQ('composer icon hidden (' + why + '): ' + (b.getAttribute('aria-label') || b.className || '?').slice(0, 40));
    return true;
  }
  function _cxAnchor() {
    // 1) Agent/text-mode button (composer mein hamesha)
    var cands = document.querySelectorAll('button,[role="button"]');
    for (var i = 0; i < cands.length; i++) {
      var t = (cands[i].textContent || '').trim();
      if (/^agent$/i.test(t) && cands[i].getBoundingClientRect().width > 8) return cands[i];
    }
    // 2) fallback: editor
    var eds = document.querySelectorAll('textarea,[contenteditable="true"],input[type="text"]');
    for (var j = 0; j < eds.length; j++) {
      if (eds[j].getBoundingClientRect().width > 100) return eds[j];
    }
    return null;
  }
  function hideComposerExtras() {
    try {
      var anchor = _cxAnchor();
      var diag;
      if (!anchor) {
        diag = 'cx: anchor NAHI mila (na Agent btn na editor)';
        if (diag !== _cxLastDiag) { _cxLastDiag = diag; if (_bfDbgEnabled() && isHeavyPlan()) _bfDbg(diag); }
        return;
      }
      // Composer container: anchor se upar chalo jab tak >=4 clickables na milen
      var SEL = 'button,[role="button"],a,[tabindex]';
      var box = anchor, d = 0, best = null;
      while (box && box.parentElement && d++ < 10) {
        box = box.parentElement;
        var n = box.querySelectorAll(SEL).length;
        var w = box.getBoundingClientRect().width;
        if (n > 30 || w > window.innerWidth * 0.9) break; // page-level — ruk jao
        if (n >= 4) { best = box; break; }
        if (n >= 2) best = box; // fallback yaad rakho
      }
      if (!best) {
        diag = 'cx: container nahi bana (anchor=' + (anchor.tagName || '?') + ')';
        if (diag !== _cxLastDiag) { _cxLastDiag = diag; if (_bfDbgEnabled() && isHeavyPlan()) _bfDbg(diag); }
        return;
      }
      var boxR = best.getBoundingClientRect();
      var els = best.querySelectorAll(SEL);
      var icon = [], hid = 0, j2, b, r;
      for (j2 = 0; j2 < els.length; j2++) {
        b = els[j2];
        if (b === anchor) continue;
        if (b.dataset.bfCxHid) { hid++; continue; }
        if (b.tagName === 'TEXTAREA' || b.tagName === 'INPUT' || b.getAttribute('contenteditable') === 'true') continue;
        if (b.querySelector('textarea,input,[contenteditable="true"]')) continue; // wrapper hai, button nahi
        var txt = (b.textContent || '').replace(/arrow_drop_down|arrow_drop_up|expand_more|expand_less/gi, '').trim();
        if (/[a-z0-9]/i.test(txt)) continue; // TEXT wale (Agent, Video·8s pill) kabhi nahi
        r = b.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        // nested clickable (button ke andar span[tabindex]) — sirf OUTER lo
        var skipNested = false, p = b.parentElement, pd = 0;
        while (p && p !== best && pd++ < 5) { if (p.matches && p.matches(SEL)) { skipNested = true; break; } p = p.parentElement; }
        if (skipNested) continue;
        icon.push({ el: b, x: r.left, y: r.top + r.height / 2 });
      }
      if (icon.length) {
        // Bottom-row = neeche wale half ke buttons; unmein leftmost(+) & rightmost(send) KEEP
        var midY = boxR.top + boxR.height / 2;
        var bottom = icon.filter(function(o) { return o.y >= midY; });
        var keepL = null, keepR = null, m;
        for (m = 0; m < bottom.length; m++) {
          if (!keepL || bottom[m].x < keepL.x) keepL = bottom[m];
          if (!keepR || bottom[m].x > keepR.x) keepR = bottom[m];
        }
        for (m = 0; m < icon.length; m++) {
          var o = icon[m];
          if (o === keepL || o === keepR) continue;
          if (_cxHide(o.el, o.y < midY ? 'top/expand' : 'mid-row')) hid++;
        }
      }
      diag = 'cx: box ' + Math.round(boxR.width) + 'x' + Math.round(boxR.height) + ' clickables=' + els.length + ' icon-only=' + icon.length + ' hidden(total)=' + hid;
      if (diag !== _cxLastDiag) { _cxLastDiag = diag; if (_bfDbgEnabled() && isHeavyPlan()) _bfDbg(diag); }
    } catch (e) {
      var dg = 'cx ERR: ' + String(e && e.message || e).slice(0, 60);
      if (dg !== _cxLastDiag) { _cxLastDiag = dg; try { if (_bfDbgEnabled() && isHeavyPlan()) _bfDbg(dg); } catch (_) {} }
    }
  }
  setInterval(hideComposerExtras, 250);

  // ── AUTO-SET VEO LITE IN NEW PROJECT CREATION PANEL ─────────────────────
  // When user clicks "+ New Project" on Flow home page, a creation panel opens
  // showing "Veo 3.1 - Fast" by default. This auto-switches it to "Veo 3.1 - Lite"
  // (or "Lower Priority" as fallback) as soon as the panel appears.

  const LITE_SEL_RE = /veo.*lite|low(?:er)?.{0,6}priority/i;
  let _liteHomeDone    = false;
  let _liteHomeOpening = false;
  var _liteHomeObs     = null;

  function _creationPanelOpen() {
    // Panel detected by "Generating will use N credits" text being visible
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].childElementCount > 0) continue;
      var t = (all[i].textContent || '').trim();
      if (/generating will use \d+\s*credit/i.test(t)) return true;
    }
    // Also detect by: visible "Video" tab + "Veo" model button on home page
    if (!isHome()) return false;
    var modelBtns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var j = 0; j < modelBtns.length; j++) {
      var txt = (modelBtns[j].textContent || '').trim();
      if (txt.length < 3 || txt.length > 80) continue;
      if (!/veo.*fast|veo.*quality|veo.*standard/i.test(txt)) continue;
      var r = modelBtns[j].getBoundingClientRect();
      if (r.width > 10 && r.height > 6) return true;
    }
    return false;
  }

  function _isLiteOrLPSelected() {
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button,select');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || btns[i].value || '').trim();
      if (t.length > 2 && t.length < 100 && LITE_SEL_RE.test(t)) return true;
    }
    return false;
  }

  function _clickLiteOrLP() {
    var opts = document.querySelectorAll(
      '[role="option"],[role="menuitem"],[role="listitem"],li,[tabindex="0"],[tabindex="-1"]'
    );
    var liteOpt = null, lpOpt = null;
    for (var i = 0; i < opts.length; i++) {
      var t   = (opts[i].textContent || '').trim();
      if (t.length < 3 || t.length > 150) continue;
      var r   = opts[i].getBoundingClientRect();
      if (r.width < 2 && r.height < 2) continue;
      if (/veo.*lite/i.test(t) && !liteOpt) liteOpt = opts[i];
      if (/low(?:er)?.{0,6}priority/i.test(t) && !lpOpt) lpOpt = opts[i];
    }
    var target = liteOpt || lpOpt; // prefer Lite over LP
    if (!target) return false;
    try {
      target.dispatchEvent(new MouseEvent('mouseover',  { bubbles: true, cancelable: true }));
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mousedown',  { bubbles: true, cancelable: true }));
      target.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mouseup',    { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('click',      { bubbles: true, cancelable: true }));
      target.click();
    } catch(e) {}
    _liteHomeDone    = true;
    _liteHomeOpening = false;
    return true;
  }

  function _openVeoDropdownHome() {
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').trim();
      if (t.length < 3 || t.length > 120) continue;
      if (!/veo|fast|quality|standard/i.test(t)) continue;
      if (LITE_SEL_RE.test(t)) continue; // already lite/LP — skip
      var r = btns[i].getBoundingClientRect();
      if (r.width < 10 || r.height < 6) continue;
      try { btns[i].click(); } catch(e) {}
      return true;
    }
    return false;
  }

  function _stopLiteHomeObs() {
    if (_liteHomeObs) { _liteHomeObs.disconnect(); _liteHomeObs = null; }
  }

  function _trySelectLiteHome(retries) {
    if (!_creationPanelOpen()) { _liteHomeOpening = false; _stopLiteHomeObs(); return; }
    if (_isLiteOrLPSelected()) { _liteHomeDone = true; _liteHomeOpening = false; _stopLiteHomeObs(); return; }
    if (_clickLiteOrLP()) { _stopLiteHomeObs(); return; }
    if (retries <= 0) { _liteHomeOpening = false; _stopLiteHomeObs(); return; }
    _openVeoDropdownHome();
    setTimeout(function() { _trySelectLiteHome(retries - 1); }, 350);
  }

  function autoSetVeoLiteOnNewProject() {
    return; /* BunnyFlow v3.10.36: auto model selection disabled */
    if (!isHome()) return;
    if (!_creationPanelOpen()) { _liteHomeDone = false; return; } // reset so next open triggers
    if (_liteHomeDone && _isLiteOrLPSelected()) return;
    if (_isLiteOrLPSelected()) { _liteHomeDone = true; return; }
    if (_liteHomeOpening) return;
    _liteHomeOpening = true;
    _liteHomeDone    = false;
    // MutationObserver: reacts instantly when dropdown opens
    if (!_liteHomeObs) {
      _liteHomeObs = new MutationObserver(function() {
        if (!_creationPanelOpen()) { _stopLiteHomeObs(); _liteHomeOpening = false; return; }
        if (_clickLiteOrLP()) _stopLiteHomeObs();
      });
      _liteHomeObs.observe(document.body || document.documentElement,
        { childList: true, subtree: true });
    }
    _trySelectLiteHome(18); // up to 18 retries × 350ms = ~6 seconds
  }

  // ── Auto-select Lite for non-Ultra on ANY Flow page ────────────────────────
  var _liteSelectDone = false;
  var _liteSelectObs  = null;

  function _isLiteSelected() {
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button,select');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || btns[i].value || '').trim();
      if (t.length > 2 && t.length < 80 && /veo.*lite/i.test(t) && !/lower.*priority/i.test(t))
        return true;
    }
    return false;
  }

  function _clickLiteOnly() {
    var opts = document.querySelectorAll('[role="option"],[role="menuitem"],li,[tabindex="0"],[tabindex="-1"]');
    for (var i = 0; i < opts.length; i++) {
      var t = (opts[i].textContent || '').trim();
      if (t.length < 3 || t.length > 150) continue;
      var r = opts[i].getBoundingClientRect();
      if (r.width < 2 && r.height < 2) continue;
      if (/veo.*lite/i.test(t) && !/lower.*priority/i.test(t)) {
        try {
          opts[i].dispatchEvent(new MouseEvent('mouseover',  { bubbles: true }));
          opts[i].dispatchEvent(new MouseEvent('mousedown',  { bubbles: true, cancelable: true }));
          opts[i].dispatchEvent(new MouseEvent('mouseup',    { bubbles: true, cancelable: true }));
          opts[i].dispatchEvent(new MouseEvent('click',      { bubbles: true, cancelable: true }));
          opts[i].click();
        } catch(e) {}
        return true;
      }
    }
    return false;
  }

  function _openModelDropdownAny() {
    // Works on home + project pages — finds the current model selector button
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').trim();
      if (t.length < 3 || t.length > 120) continue;
      if (!/veo|fast|quality|standard/i.test(t)) continue;
      if (/veo.*lite/i.test(t) && !/lower.*priority/i.test(t)) continue; // already Lite
      var r = btns[i].getBoundingClientRect();
      if (r.width < 10 || r.height < 6) continue;
      try { btns[i].click(); } catch(e) {}
      return true;
    }
    return false;
  }

  function _trySelectLiteAny(retries) {
    if (isUltra()) return; // Ultra: let user pick any model
    if (_isLiteSelected()) { _liteSelectDone = true; _stopLiteSelectObs(); return; }
    if (_clickLiteOnly()) { _stopLiteSelectObs(); return; }
    if (retries <= 0) { _stopLiteSelectObs(); return; }
    _openModelDropdownAny();
    setTimeout(function() { _trySelectLiteAny(retries - 1); }, 300);
  }

  function _stopLiteSelectObs() {
    if (_liteSelectObs) { _liteSelectObs.disconnect(); _liteSelectObs = null; }
  }

  function autoSelectLiteForNonUltra() {
    return; // Model interference disabled per user request
    if (isUltra()) return;
    if (_liteSelectDone) return; // ran once — user is free to change model now
    if (_isLiteSelected()) { _liteSelectDone = true; return; } // already Lite, mark done
    // First visit: start observer + retry loop to set Lite once
    if (!_liteSelectObs) {
      _liteSelectObs = new MutationObserver(function() {
        if (isUltra()) { _stopLiteSelectObs(); return; }
        if (_clickLiteOnly()) { _liteSelectDone = true; _stopLiteSelectObs(); }
      });
      _liteSelectObs.observe(document.body || document.documentElement,
        { childList: true, subtree: true });
    }
    _trySelectLiteAny(12); // up to 12 retries × 300ms = ~3.6s
  }


  // ── 4K UNLOCK FOR ULTRA PLAN ─────────────────────────────────────────────
  // content.js (locked) calls lock4kUpscale() every 100 ms and injects
  // #__flow_4k_block__ CSS that hides the 4K/50x Upscale option for everyone.
  // For BunnyFlow Ultra users we counter it at 80 ms (inside run()) by:
  //   1. Removing the #__flow_4k_block__ <style> element
  //   2. Stripping .flow-custom-lock-parent class from 4K option elements
  //   3. Removing .flow-custom-lock overlay children inside those elements
  function unlock4kForUltra() {
    if (!isUltra()) return;

    // Step 1 — kill the injected CSS block
    var styleBlock = document.getElementById('__flow_4k_block__');
    if (styleBlock) styleBlock.remove();

    // Step 2 & 3 — find every element that carries the lock class
    // and check whether it is the 4K/Upscale option; if so, free it.
    var locked = document.querySelectorAll('.flow-custom-lock-parent');
    locked.forEach(function(el) {
      var txt = (el.textContent || '').toLowerCase();
      // Match: contains "4k" AND ("50" or "upscal") — same heuristic as lock4kUpscale()
      if (txt.indexOf('4k') !== -1 && (txt.indexOf('50') !== -1 || txt.indexOf('upscal') !== -1)) {
        el.classList.remove('flow-custom-lock-parent');
        el.removeAttribute('data-bf-4k-lock');
        el.style.opacity = '';
        el.style.pointerEvents = '';
        el.style.cursor = '';
        // Remove the semi-transparent overlay div content.js injected
        el.querySelectorAll('.flow-custom-lock, .bf-ov, .bf-lk').forEach(function(ov) {
          ov.remove();
        });
      }
    });

    // Step 4 — also directly find 4K option elements and make sure they're clickable
    var allOpts = document.querySelectorAll(
      '[role="option"],[role="menuitem"],[role="menuitemradio"],[role="checkbox"],[role="switch"],li[class],button,label'
    );
    allOpts.forEach(function(el) {
      var txt = (el.textContent || '').toLowerCase();
      if (txt.indexOf('4k') !== -1 && (txt.indexOf('50') !== -1 || txt.indexOf('upscal') !== -1)) {
        el.classList.remove('flow-custom-lock-parent');
        el.removeAttribute('data-bf-4k-lock');
        el.style.opacity = '';
        el.style.pointerEvents = '';
        el.style.cursor = '';
        el.querySelectorAll('.flow-custom-lock, .bf-ov, .bf-lk').forEach(function(ov) {
          ov.remove();
        });
      }
    });
  }



  // ── LOCKED ITEM TOAST NOTIFICATION ──────────────────────────────────────
  var _bfToastTimer = null;
  function showBfToast(msg, sub) {
    var t = document.getElementById('__bf_toast__');
    if (!t) {
      t = document.createElement('div');
      t.id = '__bf_toast__';
      t.style.cssText = 'position:fixed!important;top:14px!important;left:50%!important;' +
        'transform:translateX(-50%)!important;z-index:2147483647!important;' +
        'padding:8px 14px 8px 14px!important;border-radius:8px!important;' +
        'font-family:system-ui,sans-serif!important;font-size:12px!important;' +
        'font-weight:600!important;color:#fff!important;display:flex!important;' +
        'align-items:center!important;gap:8px!important;' +
        'box-shadow:0 4px 16px rgba(0,0,0,0.5)!important;' +
        'background:linear-gradient(135deg,#7c3aed,#4f46e5)!important;' +
        'pointer-events:auto!important;transition:opacity 0.25s!important;';
      document.documentElement.appendChild(t);
    }
    // Build DOM nodes — avoids inline onclick quote-escaping bugs
    while (t.firstChild) t.removeChild(t.firstChild);
    var msgSpan = document.createElement('span');
    msgSpan.style.flex = '1';
    msgSpan.textContent = msg;
    if (sub) {
      var subSpan = document.createElement('span');
      subSpan.style.cssText = 'font-weight:400;opacity:0.8';
      subSpan.textContent = ' — ' + sub;
      msgSpan.appendChild(subSpan);
    }
    var xBtn = document.createElement('span');
    xBtn.style.cssText = 'cursor:pointer;opacity:0.65;font-size:13px;flex-shrink:0;padding:0 3px';
    xBtn.textContent = '\u2715';
    xBtn.addEventListener('click', function() { t.style.opacity = '0'; });
    t.appendChild(msgSpan);
    t.appendChild(xBtn);
        t.style.opacity = '1';
    if (_bfToastTimer) clearTimeout(_bfToastTimer);
    _bfToastTimer = setTimeout(function() { t.style.opacity = '0'; }, 3000);
  }

  // ── FAST LOCK (1ms interval — same approach as competitor) ───────────────
  // Lightweight, single-pass: lock Fast/Quality, ensure Lite/LP stay clickable.
  // Heavy ops (badge removal, event listeners) stay in lockModels() @ 80ms.
  function lockFast() {
    if (isUltra()) {
      unlock4kForUltra();
      return;
    }
    document.querySelectorAll(OPT_SEL).forEach(function(el) {
      var txt = (el.textContent || '').trim();
      if (!txt || txt.length > 120) return;

      // Free/LP → ensure always clickable
      if (LP_RE.test(txt) || FREE_RE.test(txt)) {
        if (el.dataset.bfLocked === '1') {
          delete el.dataset.bfLocked;
          el.style.setProperty('pointer-events', 'auto',    'important');
          el.style.setProperty('opacity',        '1',       'important');
          el.style.setProperty('cursor',         'pointer', 'important');
        }
        return;
      }

      // Fast / Quality → instant lock
      if (!LOCK_RE.test(txt)) return;
      if (el.dataset.bfLocked === '1') return; // already locked, skip style-set
      el.dataset.bfLocked = '1';
      el.style.setProperty('opacity',        '0.35',        'important');
      el.style.setProperty('pointer-events', 'none',        'important');
      el.style.setProperty('cursor',         'not-allowed', 'important');
    });
  }

  function run() {
    injectCSS();
    lockModels();
    unlockFreeModels();
    unlock4kForUltra();
    hideVideos();
    autoSelectLP();
    autoSetVeoLiteOnNewProject();
    autoSelectLiteForNonUltra();
    hookSendButton();
    watchGenerations();
    hideErrorMessages();
    enforceLPModel();
  }


  run();

  // ── FAST COOKIE INJECTION TRIGGER ────────────────────────────────────────
  // On page load, tell background.js to inject cookies ASAP instead of
  // waiting for the 60s pollCookieVersion interval.
  (function() {
    function _triggerInject() {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({ type: 'INJECT_NOW' },             function() {});
          chrome.runtime.sendMessage({ type: 'BUNNYFLOW_INJECT_COOKIES' }, function() {});
          chrome.runtime.sendMessage({ type: 'BF_SYNC_NOW' },            function() {});
        }
      } catch(e) {}
    }
    // Fire immediately + at 3s + at 8s (covers slow page loads)
    _triggerInject();
    setTimeout(_triggerInject, 3000);
    setTimeout(_triggerInject, 8000);
  })();

  if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', run);
    window.addEventListener('load', run);
  }

  // Aggressive LP selection on initial page load: try multiple times after load
  // to handle slow-rendering UI components
  [500, 1000, 1500, 2500, 4000].forEach(function(t) {
    setTimeout(function() {
      if (!_lpDone && !isHome()) {
        if (!_lpOpening) autoSelectLP();
      }
    }, t);
  });


  // ── LAYER 3: Document-level capture block — only blocks dropdown ITEMS ─────
  // Blocks clicks on locked model DROPDOWN ITEMS only (not the opener button).
  // Opener button (role=button/combobox, aria-haspopup) is always let through.
  (function() {
    var BLOCK_EVS = ['click','mousedown','pointerdown','touchstart'];

    function _isDropdownItem(el) {
      // Returns true if el is a dropdown list item (not the trigger button)
      var role = el.getAttribute ? (el.getAttribute('role') || '') : '';
      if (role === 'option' || role === 'menuitem' || role === 'listitem') return true;
      if (el.tagName === 'LI') return true;
      // Check parent — listbox/menu parent means we're inside a dropdown
      var p = el.parentElement;
      if (!p) return false;
      var pr = p.getAttribute ? (p.getAttribute('role') || '') : '';
      return pr === 'listbox' || pr === 'list' || pr === 'menu' || pr === 'group';
    }

    function _isOpenerButton(el) {
      // Returns true if this element (or ancestor within 4 levels) is a trigger
      var cur = el, d = 0;
      while (cur && d++ < 4) {
        var role = cur.getAttribute ? (cur.getAttribute('role') || '') : '';
        if (role === 'button' || role === 'combobox') return true;
        if (cur.tagName === 'BUTTON') return true;
        if (cur.hasAttribute && (cur.hasAttribute('aria-haspopup') ||
            cur.hasAttribute('aria-expanded'))) return true;
        cur = cur.parentElement;
      }
      return false;
    }

    function _blockIfLocked(e) {
      if (isUltra()) return;
      if (_isOpenerButton(e.target)) return;
      var el = e.target;
      var depth = 0;
      while (el && el !== document.documentElement && depth++ < 7) {
        var txt = (el.textContent || '').trim();
        // Check if this element or its immediate children carry a locked model name
        if (txt.length > 2 && txt.length < 100 &&
            LOCK_RE.test(txt) && !LP_RE.test(txt) && !FREE_RE.test(txt)) {
          // Confirm not the opener button at this level
          if (!_isOpenerButton(el)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            showBfToast('🔒 This Option Is Locked', 'Upgrade your ToolsByDcx plan');
            return;
          }
        }
        el = el.parentElement;
      }
    }
    BLOCK_EVS.forEach(function(ev) {
      document.addEventListener(ev, _blockIfLocked, true);
    });
  })();

  setInterval(lockFast, 1);    // ← 1ms  instant lock (competitor-parity)
  setInterval(run,      80);   // ← 80ms full cycle (badge removal, auto-select, etc.)

  const mo = new MutationObserver(function() { lockFast(); run(); });
  function startObs() { if (document.body) mo.observe(document.body, { childList: true, subtree: true }); }
  if (document.body) startObs();
  else document.addEventListener('DOMContentLoaded', startObs);

  // Fire lockFast immediately on any click — catches the instant user opens dropdown
  document.addEventListener('click', function() { lockFast(); }, true);
  document.addEventListener('mousedown', function() { lockFast(); }, true);

  // SPA navigation
  let last = location.href;
  function onNav() {
    if (location.href === last) return;
    last = location.href;
    // Reset LP auto-select for new page
    lpSwitchPending  = false;
    _lpDone          = false;
    _lpOpening       = false;
    _liteHomeDone    = false;
    _liteHomeOpening = false;
    _stopLiteHomeObs();
    _liteSelectDone  = false;
    _stopLiteSelectObs();
    _genBaseVideo = -1;
    _genLastUrl   = '';
    _progSeen     = 0;
    _progPolls    = 0;
    _currGenId    = null;
    document.querySelectorAll('[data-bf-tried-auto-lp],[data-bf-auto-lp],[data-bf-send-hooked]').forEach(el => {
      delete el.dataset.bfTriedAutoLP;
      delete el.dataset.bfAutoLp;
      delete el.dataset.bfSendHooked;
    });
    document.querySelectorAll('[data-bf-seen]').forEach(el => {
      delete el.dataset.bfSeen;
      el.removeAttribute('data-bf-hide');
      el.removeAttribute('data-bf-ban');
    });
    run();
    [100, 300, 600, 1200].forEach(t => setTimeout(run, t));
  }
  window.addEventListener('popstate', onNav);
  window.addEventListener('hashchange', onNav);
  ['pushState','replaceState'].forEach(fn => {
    const orig = history[fn];
    history[fn] = function (...a) { orig.apply(this, a); onNav(); };
  });
  setInterval(onNav, 400);

  // ── AUTO-SELECT "Veo 3.1 - Fast [Lower Priority]" on load ─────────────────
  function autoSelectLowerPriority() {
    var allButtons = Array.from(document.querySelectorAll('button, div[role="button"], div[role="listbox"]'));
    var modelTrigger = allButtons.find(function(el) {
      var txt = (el.textContent || '').trim();
      return /veo/i.test(txt) && txt.length < 60;
    });
    if (!modelTrigger) return;
    var currentTxt = (modelTrigger.textContent || '').trim();
    if (/low(?:er)?.{0,6}priority/i.test(currentTxt)) return; // already set
    // Open dropdown
    modelTrigger.click();
    setTimeout(function() {
      var options = Array.from(document.querySelectorAll(
        '[role="option"], [role="menuitem"], [role="listitem"], li, [tabindex="0"]'
      ));
      var lpOption = options.find(function(el) {
        return /low(?:er)?.{0,6}priority/i.test(el.textContent || '');
      });
      if (lpOption) {
        lpOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        lpOption.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true }));
        lpOption.dispatchEvent(new MouseEvent('click',     { bubbles: true, cancelable: true }));
        lpOption.click();
      } else {
        document.body.click(); // close dropdown if LP not found
      }
    }, 300);
  }

  var _autoSelInterval = setInterval(function() {
    var allEls = Array.from(document.querySelectorAll('button, div[role="button"]'));
    var activeModel = allEls.find(function(el) {
      var txt = (el.textContent || '').trim();
      return /veo/i.test(txt) && txt.length < 60;
    });
    if (activeModel && /low(?:er)?.{0,6}priority/i.test(activeModel.textContent || '')) {
      clearInterval(_autoSelInterval);
      return;
    }
    autoSelectLowerPriority();
  }, 500);
  setTimeout(function() { clearInterval(_autoSelInterval); }, 30000);

  // ── DAYS-LEFT BADGE (replaces content.js "Flow Active — credits" toast) ───
  var _daysBadge = null;

  function showDaysBadge(days) {
    if (!document.body) return;
    if (!_daysBadge) {
      _daysBadge = document.createElement('div');
      _daysBadge.id = '__bf_days_badge__';
      _daysBadge.style.cssText = [
        'position:fixed', 'bottom:18px', 'right:18px',
        'background:rgba(12,12,12,0.96)', 'color:#fff',
        'border-radius:8px', 'padding:7px 14px',
        'font-size:13px', 'font-family:sans-serif',
        'z-index:2147483640', 'pointer-events:none',
        'display:flex', 'align-items:center', 'gap:6px',
        'opacity:1', 'transition:opacity 0.3s'
      ].join(';');
      document.body.appendChild(_daysBadge);
    }
    var dot = '<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0"></span>';
    _daysBadge.innerHTML = dot + '<span>' + days + ' day' + (days === 1 ? '' : 's') + ' left</span>';
    _daysBadge.style.display = 'flex';
    // Auto-hide after 4 seconds
    clearTimeout(_daysBadge._hideTimer);
    _daysBadge._hideTimer = setTimeout(function() {
      if (_daysBadge) _daysBadge.style.opacity = '0';
    }, 4000);
  }

  function hideCreditsToast(el) {
    // Hide content.js showStatus indicator (fixed div with credits/Flow Active text)
    if (el && el.style && el.style.position === 'fixed' &&
        el.style.bottom === '18px' && el.style.right === '18px' &&
        el.id !== '__bf_days_badge__') {
      var txt = el.textContent || '';
      if (txt.indexOf('credits') !== -1 || txt.indexOf('Flow Active') !== -1 ||
          txt.indexOf('saved') !== -1) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      }
    }
  }

  // Watch for content.js toast appearing
  var _toastObs = new MutationObserver(function(muts) {
    muts.forEach(function(m) {
      m.addedNodes.forEach(function(n) {
        if (n.nodeType === 1) hideCreditsToast(n);
      });
    });
    // Also scan existing
    if (document.body) {
      document.body.querySelectorAll('div[style*="fixed"]').forEach(hideCreditsToast);
    }
  });

  function startToastWatch() {
    if (document.body) {
      _toastObs.observe(document.body, { childList: true });
      // Hide any already-existing toasts
      document.body.querySelectorAll('div').forEach(hideCreditsToast);
    }
  }
  if (document.body) startToastWatch();
  else document.addEventListener('DOMContentLoaded', startToastWatch);

  // Show days badge on load from storage
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(null, function(res) {
      var days = null;
      if (res.daysRemaining != null) days = Math.max(0, parseInt(res.daysRemaining) || 0);
      else if (res.planExpiresAt) {
        var ms = new Date(res.planExpiresAt).getTime() - Date.now();
        days = Math.max(0, Math.ceil(ms / 86400000));
      }
      if (days !== null) showDaysBadge(days);
    });
    chrome.storage.onChanged.addListener(function(changes) {
      var days = null;
      if (changes.daysRemaining) days = Math.max(0, parseInt(changes.daysRemaining.newValue) || 0);
      else if (changes.planExpiresAt) {
        var ms = new Date(changes.planExpiresAt.newValue).getTime() - Date.now();
        days = Math.max(0, Math.ceil(ms / 86400000));
      }
      if (days !== null) showDaysBadge(days);
    });
  }


})();