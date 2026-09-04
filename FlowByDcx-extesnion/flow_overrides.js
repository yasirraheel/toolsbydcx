(function(){
  'use strict';

  // ── 1. CSS ────────────────────────────────────────────────────────────────
  const CSS = `
    [data-bf-hide]{display:none!important;visibility:hidden!important;}
    [data-bf-ban] {display:none!important;}
    [data-bf-locked]{opacity:0.35!important;}
    [data-bf-unlocked]{opacity:1!important;pointer-events:auto!important;cursor:pointer!important;}
    .bf-ov{position:absolute!important;inset:0!important;z-index:2147483647!important;cursor:not-allowed!important;background:transparent!important;}
    .bf-lk{position:absolute!important;right:8px!important;top:50%!important;transform:translateY(-50%)!important;font-size:11px!important;z-index:2147483647!important;pointer-events:none!important;}
  `;
  function inject(){
    if(document.getElementById('__bf__')) return;
    const s=document.createElement('style');
    s.id='__bf__';s.textContent=CSS;
    (document.head||document.documentElement).appendChild(s);
  }
  inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true});

  // ── 2. CLICK INTERCEPT — block clicks on locked model OPTIONS only ──────────
  // Strategy: use capture-phase document click listener instead of blocking
  // addEventListener registration (which would also block the dropdown toggle button).
  //
  // Locked model OPTIONS are inside a dropdown list and have role=option/menuitem/listitem.
  // The dropdown TOGGLE button (showing current model name) must NOT be blocked so we
  // can programmatically open the dropdown.
  const _LP_RE   = /low(?:er)?[\s._-]*priority|\blite\b|veo.*lite/i;
  const _LITE_RE = /veo.{0,20}lite|\blite\b/i;
  const _FREE_RE = /nano.{0,5}banana|pro.{0,5}imagen/i;
  const _LOCK_RE = /\bveo\b.{0,40}(quality|fast)\b/i;
  const _OPT_SEL = '[role="option"],[role="menuitem"],[role="listitem"],li';

  var _userPlan = 'basic';
  // Read plan from dataset on documentElement (set by content script or background)
  function _isUltra() {
    if (_userPlan === 'ultra') return true;
    var p = document.documentElement.getAttribute('data-bf-plan');
    if (p) { _userPlan = p.toLowerCase(); return _userPlan === 'ultra'; }
    return false;
  }

  // Block clicks/pointerdown on locked model options in the dropdown list
  var _blockEvents = ['click', 'mousedown', 'pointerdown', 'touchstart'];
  _blockEvents.forEach(function(evName) {
    document.addEventListener(evName, function(e) {
      return; // Model click blocking disabled per user request
      try {
        // Find the nearest option ancestor
        var el = e.target;
        var optEl = null;
        for (var i = 0; i < 5 && el; i++) {
          if (el.matches && el.matches(_OPT_SEL)) { optEl = el; break; }
          el = el.parentElement;
        }
        if (!optEl) return;
        var txt = (optEl.textContent || '').trim();
        if (txt.length < 3 || txt.length > 150) return;
        var isLP   = _LP_RE.test(txt);
        var isLite = _LITE_RE.test(txt);
        var isFree = _FREE_RE.test(txt);
        // Block only locked (non-LP, non-Lite, non-FREE) model options
        // Ultra plan users can click Fast/Quality models
        if (!isLP && !isLite && !isFree && _LOCK_RE.test(txt) && !_isUltra()) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      } catch(_) {}
    }, true /* capture phase */);
  });

  // ── 2b. BLOCK SEND BUTTON when non-LP model is active ────────────────────
  // ── SELF-CONTAINED SEND BUTTON LOCK ─────────────────────────────────────────
  // bf_early.js runs in MAIN world. This block independently:
  //  1. Reads the current model text directly from the DOM
  //  2. Finds the send button by position heuristics
  //  3. Applies red colour + cursor:not-allowed inline (every 300ms)
  //  4. Blocks all click + Enter events when non-LP model is active
  // No dependency on bunny_extra.js or data-bf-model-locked attribute.

  var _bfSendBtn  = null;  // cached send button reference
  var _bfLocked   = false; // current lock state

  // Detect whether the active video model is non-LP (returns true = should lock)
  // IMPORTANT: must skip dropdown list items — only read the combobox/selector element
  function _shouldLockSend() {
    return false; // Model send button lock disabled per user request
    try {
      var hasVeoUI = false;
      var hasAllowed = false;
      var btns = document.querySelectorAll('[role="combobox"],button,[role="button"]');
      for (var i = 0; i < btns.length; i++) {
        var el = btns[i];
        var txt = (el.textContent || '').trim();
        if (txt.length < 3 || txt.length > 120) continue;
        if (!/veo|low(?:er)?.{0,6}priority/i.test(txt)) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 10) continue;
        // Skip dropdown list items
        var elRole = (el.getAttribute('role') || '').toLowerCase();
        if (elRole === 'option' || elRole === 'menuitem' || elRole === 'listitem') continue;
        if (el.closest('[role="listbox"],[role="menu"],[role="list"],[role="option"],[role="menuitem"]')) continue;
        // This is a model selector candidate
        hasVeoUI = true;
        if (_LP_RE.test(txt) || _LITE_RE.test(txt) || (_isUltra() && _LOCK_RE.test(txt))) {
          hasAllowed = true;
          break; // LP or Ultra-allowed model found — definitely unlocked, stop scanning
        }
      }
      if (!hasVeoUI) return false;  // no model UI at all → don't lock (e.g. image tab)
      return !hasAllowed;           // lock only if no LP/Lite found among all candidates
    } catch(_) {}
    return false;
  }

  // _unlockVeoLiteVisual interval REMOVED — content.js is empty (0 bytes),
  // no lock is applied to Veo Lite by content.js, so no unlock needed.
  // This interval was running querySelectorAll('[role="option"],...,li') every 150ms
  // which caused expensive DOM queries on Frames pages with many li elements.

  // Find the send button: most bottom-right SVG button in lower screen area
  function _findBfSendBtn() {
    try {
      var best = null, bestScore = -1;
      var wh = window.innerHeight, ww = window.innerWidth;
      var all = document.querySelectorAll('button,[role="button"]');
      for (var i = 0; i < all.length; i++) {
        var b = all[i];
        var r = b.getBoundingClientRect();
        if (r.width < 20 || r.width > 90 || r.height < 20 || r.height > 90) continue;
        if (r.bottom < wh * 0.5) continue;
        if (r.right  < ww * 0.35) continue;
        if (!b.querySelector('svg')) continue;
        var txt = (b.textContent || '').replace(/\s+/g,'');
        if (txt.length > 5) continue; // reject text buttons
        var score = (r.right / ww) * 3 + (r.bottom / wh);
        if (score > bestScore) { bestScore = score; best = b; }
      }
      return best;
    } catch(_) { return null; }
  }

  function _applyBfLock(btn) {
    if (!btn) return;
    btn.style.setProperty('background',        '#ef4444', 'important');
    btn.style.setProperty('background-color',  '#ef4444', 'important');
    btn.style.setProperty('background-image',  'none',    'important');
    btn.style.setProperty('border-color',      '#b91c1c', 'important');
    btn.style.setProperty('cursor',            'not-allowed', 'important');
    btn.style.setProperty('opacity',           '1',       'important');
    btn.setAttribute('data-bf-locked', '1');
    btn.title = _isUltra() ? '❤️ Model restricted' : '❤️ Select Lower Priority model';
  }

  function _removeBfLock(btn) {
    if (!btn) return;
    ['background','background-color','background-image','border-color','cursor','opacity']
      .forEach(function(p) { btn.style.removeProperty(p); });
    btn.removeAttribute('data-bf-locked');
    btn.title = '';
  }

  function _flashModelSelector() {
    try {
      var btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
      for (var j = 0; j < btns.length; j++) {
        var mt = (btns[j].textContent || '').trim();
        if (mt.length > 2 && mt.length < 100 && /veo/i.test(mt) &&
            btns[j].getBoundingClientRect().width > 10) {
          var b2 = btns[j];
          b2.style.outline = '2px solid #ef4444';
          b2.style.borderRadius = '6px';
          setTimeout(function() { b2.style.outline = ''; b2.style.borderRadius = ''; }, 1200);
          break;
        }
      }
    } catch(_) {}
  }

  // Main enforcement loop — runs every 300ms
  function _bfEnforceSendLock() {
    try {
      var shouldLock = _shouldLockSend();

      if (shouldLock) {
        document.documentElement.setAttribute('data-bf-model-locked', '1');
        // Find button fresh (React may have replaced the element)
        var btn = _findBfSendBtn();
        if (btn && btn !== _bfSendBtn) {
          // New element — remove lock from old, apply to new
          if (_bfSendBtn) _removeBfLock(_bfSendBtn);
          _bfSendBtn = btn;
        }
        if (_bfSendBtn) _applyBfLock(_bfSendBtn);
        _bfLocked = true;
      } else {
        document.documentElement.removeAttribute('data-bf-model-locked');
        if (_bfSendBtn) { _removeBfLock(_bfSendBtn); _bfSendBtn = null; }
        _bfLocked = false;
      }
    } catch(_) {}
  }

  // Start enforcement loop as soon as body exists
  function _startSendLockLoop() {
    _bfEnforceSendLock();
    setInterval(_bfEnforceSendLock, 1000);
  }
  if (document.body) {
    _startSendLockLoop();
  } else {
    document.addEventListener('DOMContentLoaded', _startSendLockLoop);
  }

  // ── AUTO-SELECT LP: switch to Lower Priority on page load (MAIN world) ──────
  // Runs independently in MAIN world so .click() is more direct.
  // Stops as soon as LP is confirmed selected.

  var _bfLpDone = false;

  function _bfIsAllowedSelected() {
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var i = 0; i < btns.length; i++) {
      var txt = (btns[i].textContent || '').trim();
      if (txt.length > 2 && txt.length < 100 &&
          (/low(?:er)?.{0,6}priority/i.test(txt) || /veo.{0,20}lite/i.test(txt)) &&
          btns[i].getBoundingClientRect().width > 10) return true;
    }
    return false;
  }

  function _bfOpenModelDropdown() {
    var btns = document.querySelectorAll('[role="button"],[role="combobox"],button');
    for (var i = 0; i < btns.length; i++) {
      var txt = (btns[i].textContent || '').trim();
      if (txt.length < 3 || txt.length > 120) continue;
      if (!/veo/i.test(txt)) continue;
      if (_LP_RE.test(txt) && !/quality|fast/i.test(txt)) continue;
      var r = btns[i].getBoundingClientRect();
      if (r.width < 10 || r.height < 6) continue;
      try { btns[i].click(); } catch(_) {}
      return true;
    }
    return false;
  }

  function _bfClickLPOption() {
    var opts = document.querySelectorAll(
      '[role="option"],[role="menuitem"],[role="listitem"],li,[tabindex="0"],[tabindex="-1"],div,span'
    );
    for (var i = 0; i < opts.length; i++) {
      var txt = (opts[i].textContent || '').trim();
      if (txt.length < 3 || txt.length > 100) continue;
      if (!_LP_RE.test(txt)) continue;
      if (/quality|fast/i.test(txt)) continue;
      var r = opts[i].getBoundingClientRect();
      if (r.width < 5 || r.height < 5) continue;
      var target = opts[i].closest('[role="option"],[role="menuitem"],li,button') || opts[i];
      try {
        ['mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(ev) {
          target.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window }));
        });
        if (typeof target.click === 'function') target.click();
      } catch(_) {}
      return true;
    }
    return false;
  }

  function _bfAutoSelectLP() {
    if (_bfIsAllowedSelected()) return;
    if (_bfClickLPOption()) {
      setTimeout(function() {
        if (!_bfIsAllowedSelected()) _bfOpenModelDropdown();
      }, 350);
      return;
    }
    _bfOpenModelDropdown();
    setTimeout(function() {
      _bfClickLPOption();
    }, 250);
  }

  // Model auto-selection disabled per user request
  function _startBfAutoLPLoop() {
    return; // Model auto-selection disabled per user request
    _bfAutoSelectLP();
    setInterval(function() {
      if (!_bfIsAllowedSelected()) {
        _bfAutoSelectLP();
      }
    }, 600);
  }
  if (document.body) _startBfAutoLPLoop();
  else document.addEventListener('DOMContentLoaded', _startBfAutoLPLoop);

  // Block click on any locked button (data-bf-locked) OR when model is non-LP
  document.addEventListener('click', function(e) {
    try {
      var el = e.target;
      for (var i = 0; i < 8 && el; i++) {
        // Direct lock attribute on element (set by _applyBfLock above)
        if (el.getAttribute && el.getAttribute('data-bf-locked') === '1') {
          e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
          _flashModelSelector();
          return;
        }
        el = el.parentElement;
      }
      // NOTE: Broad lower-screen click blocking removed — it was breaking video
      // thumbnail clicks and download buttons on mobile. The send button is already
      // blocked via data-bf-locked attribute set by _applyBfLock().
    } catch(_) {}
  }, true);

  // Block Enter key in prompt area when locked
  document.addEventListener('keydown', function(e) {
    try {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (!_bfLocked) return;
      var active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT'
                     || active.getAttribute('contenteditable') === 'true'
                     || active.getAttribute('contenteditable') === '')) {
        e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
        _flashModelSelector();
      }
    } catch(_) {}
  }, true);

  // ─────────────────────────────────────────────────────────────────────────
  // ── 3. GENERATION DETECTION — network intercept ONLY ─────────────────────
  // IMPORTANT: Layers A/B/C/D (img/video src watchers, PerformanceObserver)
  // were removed because they fire for EVERY thumbnail/frame image loaded
  // in Frames-to-Video projects (10-30+ images), causing rapid API bursts
  // that freeze the browser tab ("Page Unresponsive").
  //
  // Detection now relies SOLELY on Layer E (fetch/XHR network intercept)
  // which scans API JSON responses for videoUri/imageUri patterns.
  // Google Flow always returns completed generation results via API calls,
  // so no generations are missed.
  // ─────────────────────────────────────────────────────────────────────────

  // ── Layer E: Network intercept (fetch + XHR + SSE) ───────────────────────
  // ONLY intercepts actual Google Flow API calls that return JSON generation results.
  // DOES NOT intercept storage.googleapis.com (video/image files) to prevent page freeze.
  //
  // _BF_API matches only the Flow API endpoints that return JSON with videoUri/imageUri.
  // _BF_SKIP matches URLs we must NEVER read (media storage, fonts, analytics).
  var _BF_API  = /labs\.google\/(?:fx\/)?api|labs\.google\/[^?]*\/generate|labs\.google\/[^?]*\/operation/i;
  var _BF_SKIP = /storage\.googleapis\.com|googleusercontent\.com|fonts|analytics|gtag|signout|\.(mp4|webm|mov|jpg|jpeg|png|webp|gif|mp3|ogg|wav)/i;

  var _bf_url = '', _bf_nv = 0, _bf_ni = 0;

  function _bf_reset() {
    if (location.href !== _bf_url) { _bf_url = location.href; _bf_nv = 0; _bf_ni = 0; }
  }

  // BF HANG FIX v3.10.4: global rate limiter - max 3 inspections per 2 seconds
  var _bf_inspectCount = 0, _bf_inspectReset = 0;
  function _bf_inspect(text) {
    if (!text || text.length < 10 || text.length > 300000) return;
    // Rate limit: prevent burst during frames/pic-to-video
    var now = Date.now();
    if (now - _bf_inspectReset > 2000) { _bf_inspectCount = 0; _bf_inspectReset = now; }
    if (_bf_inspectCount >= 3) return; // skip if too many calls recently
    _bf_inspectCount++;
    try {
      _bf_reset();
      var hasV = /videoUri|video_uri|generatedVideo/i.test(text);
      var hasI = /imageUri|image_uri|generatedImage/i.test(text);
      if (!hasV && !hasI) return;
      if (hasV) {
        var totalV = Math.min((text.match(/videoUri|video_uri|generatedVideo/ig)||[]).length, 8);
        if (totalV > _bf_nv) {
          document.dispatchEvent(new CustomEvent('__bf_gen__', { detail: { type: 'video', count: totalV - _bf_nv } }));
          _bf_nv = totalV;
        }
      }
      if (hasI && !hasV) {
        var totalI = Math.min((text.match(/imageUri|image_uri|generatedImage/ig)||[]).length, 8);
        if (totalI > _bf_ni) {
          document.dispatchEvent(new CustomEvent('__bf_gen__', { detail: { type: 'image', count: totalI - _bf_ni } }));
          _bf_ni = totalI;
        }
      }
    } catch(e) {}
  }

  // fetch — only inspect actual Flow API calls, skip ALL media/storage URLs
  // CONCURRENCY THROTTLE: max 2 simultaneous response body reads to prevent
  // freeze on Frames/pic-to-video pages where many concurrent API calls happen
  var _bf_concurrent = 0;
  var _BF_MAX_CONCURRENT = 2;
  // Skip frame/image-upload endpoints that fire many times during pic-to-video
  var _BF_SKIP_FRAMES = /\/frame|\/frames\/|\/image\/upload|\/upload\/image|\/asset\/|uploadType=multipart|uploadType=media|\/media\/upload|\/batch|\/pic.to.vid|\/pic_to_vid/i;

  // BF OMNI: request info ko ISOLATED world (bunny_extra) tak pohnchao.
  // postMessage structured-clone ke sath worlds ke beech pakka chalta hai;
  // CustomEvent bhi bhej dete hain (purana channel, double safety).
  // v40: har request ka apna ID — bunny_extra ka submit-lamha snapshot EXACT
  // isi request ke GEN response se judta hai (FIFO/key guess nahi; out-of-order
  // ya gum-shuda responses kabhi ghalat snapshot nahi kha sakte).
  var _bfRid = 0;
  function _bfSendReq(url, method, body, rid) {
    try {
      var _tk = '', _gen = null;
      var _bs = (body && body.length < 500000) ? String(body) : '';
      if (_bs) {
        var _mt = _bs.match(/"[^"\n]{0,60}(?:veo|lite|lower|fast|quality|flash|ultra|turbo|model)[^"\n]{0,60}"/ig);
        if (_mt) _tk = _mt.slice(0, 6).join(',').slice(0, 400);
        // GENERATION SUBMIT pakka pehchano: url generate-jaisa ho YA body mein
        // videoModelKey ho — magar analytics/log endpoints (batchLogFrontendEvents)
        // KABHI nahi (un mein purane models ke naam hote hain → zehreele intents).
        // Status-poll (batchCheckAsyncVideoGenerationStatus) har chand second
        // chalta hai — ye SUBMIT nahi hai, is se kabhi intent nahi banna chahiye
        // (yehi junk intents Lower videos par ghalat charge kara rahe the).
        var _isLog = /batchlog|logfrontend|log.?events|analytics|telemetry|status|:batchcheck/i.test(url);
        if (!_isLog) {
          // PEHLE exact selected-model field (videoModelKey) — generic model-*
          // fields sirf tab jab ye na mile. Sab ko jodna ghalat codename
          // seekhne/charge karne ka sabab banta tha (code-review fix).
          var _mks = _bs.match(/"videoModelKey"\s*:\s*"([^"]+)"/ig) || _bs.match(/"(?:modelKey|videoModel|modelName)"\s*:\s*"([^"]+)"/ig);
          var _isGenUrl = /:batchasyncgenerate|generatevideo|video:generate|:asyncgenerate/i.test(url);
          if (_mks || _isGenUrl) {
            // Video count: ek hi request mein model ka naam KAI jagah ho sakta hai
            // (settings + har video ka apna). Har key-type ko alag gino aur MAX lo,
            // sum nahi — warna 1 video par 2-3 intents ban kar agli video ko lag jate hain.
            var _nMax = 1;
            if (_mks) {
              var _cnt = {};
              for (var _ki = 0; _ki < _mks.length; _ki++) {
                var _kn = (_mks[_ki].match(/"(\w+)"/) || [])[1] || 'k';
                _cnt[_kn] = (_cnt[_kn] || 0) + 1;
                if (_cnt[_kn] > _nMax) _nMax = _cnt[_kn];
              }
            }
            // mk = SIRF pehli videoModelKey value (x2 body mein yehi value do
            // bar hoti hai — pehli kaafi hai). Comma-joined list ka pehla token
            // kabhi galat field ho sakta tha → ghalat codename learn/charge.
            var _mkFirst = '';
            try { _mkFirst = (_mks && _mks[0].match(/"[^"]+"\s*:\s*"([^"]+)"/) || [])[1] || ''; } catch (_) {}
            _gen = {
              mk: _mkFirst,
              n: _nMax,
              b0: _bs.slice(0, 200) // debug: kachcha body snippet — model field ka naam dekhne ke liye
            };
          }
        }
      }
      var d = { u: String(url).slice(-90), m: String(method || ''), t: _tk, bl: body ? body.length : 0, g: _gen, rid: String(rid || '') };
      try { window.postMessage({ __bf_req: d }, '*'); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('__bf_req__', { detail: d })); } catch (_) {}
    } catch (_) {}
  }

  // ── BF NET-TRUTH parsers (v16) ──
  // JSON walk: unknown nesting ke bawajood model keys / operation names / statuses
  // nikaalta hai. Parse fail → kuch nahi bheja jata → koi charge nahi (fail-safe).
  function _bfWalk(o, fn, depth) {
    if (!o || typeof o !== 'object' || depth > 14) return;
    for (var k in o) {
      var v = o[k];
      try { fn(k, v, o); } catch (_) {}
      if (v && typeof v === 'object') _bfWalk(v, fn, depth + 1);
    }
  }
  // Google kabhi kabhi JSON se pehle `)]}'` jaisa prefix lagata hai — pehle { ya [
  // tak kaat kar parse karo. Fail → null (phir regex fallback chalta hai).
  function _bfJson(t) {
    try {
      if (!t) return null;
      var i = t.search(/[{\[]/);
      if (i < 0) return null;
      return JSON.parse(i ? t.slice(i) : t);
    } catch (_) { return null; }
  }
  function _bfC(t, n) { return String(t || '').replace(/\s+/g, ' ').slice(0, n || 300); }
  function _bfParseGen(reqBody, respText, url, rid) {
    try {
      var mks = [];
      var rj = _bfJson(reqBody);
      if (rj) _bfWalk(rj, function(k, v) {
        if (/model/i.test(k) && typeof v === 'string' && v.length < 80 && mks.indexOf(v) < 0) mks.push(v);
      }, 0);
      if (!mks.length && reqBody) {
        var _rm = reqBody.match(/"[^"\n]{0,40}model[^"\n]{0,40}"\s*:\s*"([^"]{1,70})"/ig) || [];
        for (var _i = 0; _i < _rm.length && _i < 6; _i++) mks.push(_rm[_i]);
      }
      // Response shape (confirmed): {"operations":[{"operation":{"name":"hex"},
      // "sceneId":"...","status":"MEDIA_GENERATION_STATUS_PENDING"}]}
      // SIRF operation-object ke name lo — generic "name" na lo, warna response
      // ka top-level batch-name bhi op ban jata hai (ops=2 → double-charge khatra).
      var ops = [], _seen = {};
      var pj = _bfJson(respText);
      if (pj) _bfWalk(pj, function(k, v, parent) {
        if (k === 'operation' && v && typeof v.name === 'string' && !_seen[v.name]) {
          _seen[v.name] = 1;
          ops.push({ n: v.name, sid: (parent && typeof parent.sceneId === 'string') ? parent.sceneId : '' });
        }
      }, 0);
      if (!ops.length && respText) {
        // regex fallback: sirf wo "name" jis ke qareeb status/sceneId/metadata/done
        // ho (yani ek asal operation entry) — top-level batch name KABHI nahi.
        var _om = respText.match(/"name"\s*:\s*"[^"]{8,300}"[\s\S]{0,400}?"(?:status|sceneId|metadata|done)"/g) || [];
        for (var _j = 0; _j < _om.length && _j < 10; _j++) {
          var _nm = (_om[_j].match(/"name"\s*:\s*"([^"]+)"/) || [])[1];
          if (_nm && !_seen[_nm]) { _seen[_nm] = 1; ops.push({ n: _nm, sid: '' }); }
        }
      }
      window.postMessage({ __bf_gen2: {
        ops: ops.slice(0, 10),
        rid: String(rid || ''), // v40: usi request ke submit-snapshot se jorne ko
        mk: mks.join(',').slice(0, 200),
        u: String(url).slice(-70),
        q0: mks.length ? '' : _bfC(reqBody, 300),
        r0: _bfC(respText, 400) // hamesha — bunny_extra pehli 2 bar raw log karta hai
      } }, '*');
    } catch (_) {}
  }
  function _bfParseSt(respText, url) {
    try {
      var list = [], _seenL = {};
      var pj = _bfJson(respText);
      // GOOGLE KA ASAL FORMAT (user ke ST RAW se confirmed):
      //   {"media":[{"name":"UUID","projectId":"...","workflowId":"...",
      //     "mediaMetadata":{"createTime":"...","requestData":{
      //       "videoGenerationRequestData":{"videoModelControlInput":{
      //         "videoModelName":"..."}}}}}]}
      // Submit ka operation-name (hex) aur status ka media-name (UUID) ALAG
      // IDs hain — match KABHI nahi hote. Lekin media-entry apna model KHUD
      // rakhti hai (videoModelName, kai levels deep) — bas deep scan chahiye.
      // done-signal: status/done/media-URL — jo bhi pehle mile.
      function _deepScan(o, acc, depth) {
        if (!o || typeof o !== 'object' || depth > 9) return;
        for (var kk in o) {
          var bv = o[kk];
          if (typeof bv === 'string') {
            if (!acc.st && /status|state/i.test(kk) && bv.length < 60) acc.st = bv;
            else if (!acc.m && /model/i.test(kk) && bv.length < 80) acc.m = bv;
            else if (!acc.md && /url|uri/i.test(kk) && bv.indexOf('http') === 0) acc.md = true;
          } else if (typeof bv === 'number') {
            if (acc.stn < 0 && /status|state/i.test(kk)) acc.stn = bv;
          } else if (bv === true && kk === 'done') {
            acc.dn = true;
          } else if (bv && typeof bv === 'object') {
            _deepScan(bv, acc, depth + 1);
          }
        }
      }
      if (pj) _bfWalk(pj, function(k, v, parent) {
        if (k === 'operation' && v && typeof v.name === 'string') {
          if (_seenL[v.name]) return;
          var acc = { st: '', m: '', dn: false, md: false, stn: -1 };
          _deepScan(v, acc, 0);
          _deepScan(parent, acc, 0);
          _seenL[v.name] = 1;
          list.push({ op: v.name, st: acc.dn ? 'DONE_TRUE' : acc.st, m: acc.m, md: acc.md ? 1 : 0, stn: acc.stn });
        } else if (k === 'name' && typeof v === 'string' && v.length > 8 && parent) {
          // SIRF canonical records: (a) media-entry — parent mein mediaMetadata /
          // workflowId / projectId ho (Google ka confirmed format), ya (b) flat
          // operation record — parent mein DIRECT status/state ho. Gehre nested
          // config ke "name" kabhi billable entry nahi bante — warna x2 batch
          // mein fabricated IDs par DOUBLE charge ho sakta tha (review fix).
          if (_seenL[v]) return;
          var _isMedia = !!(parent.mediaMetadata || parent.workflowId || parent.projectId);
          var _hasDirectStatus = typeof parent.status === 'string' || typeof parent.state === 'string' ||
                                 typeof parent.status === 'number' || typeof parent.state === 'number';
          if (!_isMedia && !_hasDirectStatus) return;
          var ac2 = { st: '', m: '', dn: false, md: false, stn: -1 };
          _deepScan(parent, ac2, 0);
          _seenL[v] = 1;
          list.push({ op: v, st: ac2.dn ? 'DONE_TRUE' : ac2.st, m: ac2.m, md: ac2.md ? 1 : 0, stn: ac2.stn });
        }
      }, 0);
      if (!list.length && respText) {
        // regex fallback: "name":"X" ... "status":"Y" pairs (kisi bhi tarteeb mein)
        var _pm = respText.match(/"name"\s*:\s*"[^"]{8,300}"[\s\S]{0,400}?"(?:status|state)"\s*:\s*"[^"]{2,60}"/g) || [];
        for (var _q = 0; _q < _pm.length && _q < 14; _q++) {
          var _nn = (_pm[_q].match(/"name"\s*:\s*"([^"]+)"/) || [])[1];
          var _ss = (_pm[_q].match(/"(?:status|state)"\s*:\s*"([^"]+)"/) || [])[1];
          if (_nn && !_seenL[_nn]) { _seenL[_nn] = 1; list.push({ op: _nn, st: _ss || '' }); }
        }
      }
      window.postMessage({ __bf_st2: {
        list: list.slice(0, 14),
        u: String(url).slice(-70),
        r0: _bfC(respText, 400) // hamesha — pehli 2 bar raw log hota hai
      } }, '*');
    } catch (_) {}
  }

  // VIDEO DETAILS parser: history/workflows response mein har video ka model
  // hota hai (wohi jo hover card mein "Omni Flash" dikhta hai). Har model-ish
  // field ke sath us item ka sceneId / operation-name / mediaGenerationId bhi
  // utha lo taake bunny_extra usay chal rahi generation se jor sake.
  function _bfParseHist(respText, url) {
    try {
      if (!respText || respText.length > 2000000) return;
      var items = [];
      var pj = _bfJson(respText);
      if (pj) _bfWalk(pj, function(k, v, parent) {
        if (/model/i.test(k) && typeof v === 'string' && v.length > 1 && v.length < 90 && parent) {
          var it = { m: v, sid: '', op: '', mid: '', st: '' };
          try {
            for (var kk in parent) {
              var pv = parent[kk];
              if (typeof pv === 'string') {
                if (!it.sid && /sceneid/i.test(kk)) it.sid = pv;
                else if (!it.op && /^(operationname|name)$/i.test(kk) && pv.length > 8) it.op = pv;
                else if (!it.st && /^(status|state)$/i.test(kk)) it.st = pv;
                else if (!it.mid && /mediageneration/i.test(kk)) it.mid = pv;
              } else if (pv && typeof pv === 'object') {
                if (!it.op && kk === 'operation' && typeof pv.name === 'string') it.op = pv.name;
                if (!it.mid && /mediageneration/i.test(kk)) {
                  for (var k6 in pv) { if (typeof pv[k6] === 'string' && pv[k6].length > 8) { it.mid = pv[k6]; break; } }
                }
                if (!it.sid && pv.metadata && typeof pv.metadata.sceneId === 'string') it.sid = pv.metadata.sceneId;
              }
            }
          } catch (_) {}
          if (items.length < 24) items.push(it);
        }
      }, 0);
      if (items.length) window.postMessage({ __bf_hist: { items: items, u: String(url).slice(-60) } }, '*');
    } catch (_) {}
  }

  // Boot beacon: ISOLATED world ko batao ke MAIN wrapper chal raha hai
  try { window.postMessage({ __bf_boot: { v: 20, at: Date.now() } }, '*'); } catch (_) {}

  var _origFetch = window.fetch;
  window.fetch = function(input, init) {
    // BF FETCH FIX: transparent passthrough. Return the ORIGINAL fetch promise so a
    // network failure ("Failed to fetch") keeps Google Flow's native stack and is
    // handled by Flow's own code -- our wrapper never appears as the error source and
    // never creates a new "Uncaught (in promise)" rejection. Inspection is passive.
    var _p = _origFetch.call(this, input, init);
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var _rid = 'f' + (++_bfRid); // v40: is request ka apna ID (snapshot↔response jorne ko)
      // BF OMNI: request-side inspect — generation SUBMIT ke waqt model tokens
      // nikaal kar bunny_extra ko bhejo (intent ke liye). Passive — request ko
      // chherte nahi. v11: HAR host ki POST/PUT log hoti hai (endpoint dhoondhne
      // ke liye), sirf media/analytics skip; channel = postMessage (worlds ke
      // beech sab se bharosemand) + CustomEvent dono.
      try {
        var _m = (init && init.method) || (input && input.method) || 'GET';
        if (/post|put/i.test(_m) && !_BF_SKIP.test(url)) {
          var _b = (init && typeof init.body === 'string') ? init.body : '';
          if (_b) {
            _bfSendReq(url, _m, _b, _rid);
          } else if (input && typeof input.clone === 'function') {
            // Request-object body (string nahi) — async parho, phir bhejo
            try {
              input.clone().text().then(function(_rb) { _bfSendReq(url, _m, _rb || '', _rid); }).catch(function() { _bfSendReq(url, _m, '', _rid); });
            } catch (_) { _bfSendReq(url, _m, '', _rid); }
          } else {
            _bfSendReq(url, _m, '', _rid);
          }
        }
      } catch (_) {}
      // ── BF NET-TRUTH (v16) ──
      // Har video ki apni operation ID hoti hai: SUBMIT response mein ID milti
      // hai (request body mein model), STATUS response mein usi ID ka natija.
      // Isi ID-level mapping se billing 100% order/mix/parallel-proof hoti hai.
      try {
        // v37: URL-regex ke ilawa BODY-fallback bhi — kuch submit endpoints
        // (image-to-video waghera) ka URL alag ho sakta hai, magar body mein
        // videoModelKey hamesha hota hai. Status/log endpoints kabhi nahi.
        var _fb37 = (init && typeof init.body === 'string') ? init.body : '';
        var _fbGen = _fb37 && /"videoModelKey"\s*:/i.test(_fb37) &&
          !/batchcheckasync|checkasyncvideo|generationstatus|batchlog|logfrontend|log.?events|analytics|telemetry/i.test(url);
        if (/:batchasyncgenerate|generatevideo|:asyncgenerate/i.test(url) || _fbGen) {
          // SUBMIT: request body (model) + response (operation IDs) dono chahiye
          var _gb;
          if (init && typeof init.body === 'string') _gb = Promise.resolve(init.body);
          else if (input && typeof input.clone === 'function') { try { _gb = input.clone().text().catch(function() { return ''; }); } catch (_) { _gb = Promise.resolve(''); } }
          else _gb = Promise.resolve('');
          _p.then(function(resp) {
            try {
              resp.clone().text().then(function(t) {
                _gb.then(function(b) { try { _bfParseGen(b || '', t || '', url, _rid); } catch (_) {} });
              }).catch(function() {});
            } catch (_) {}
          }, function() {});
        } else if (/batchcheckasync|checkasyncvideo|generationstatus/i.test(url)) {
          // STATUS POLL: response mein har operation ka status
          _p.then(function(resp) {
            try {
              resp.clone().text().then(function(t) { try { _bfParseSt(t || '', url); } catch (_) {} }).catch(function() {});
            } catch (_) {}
          }, function() {});
        } else if (/fetchuserhistory|fetchprojectworkflows|media\.fetch|\/v1\/media\//i.test(url)) {
          // VIDEO DETAILS (hover card ka source): history/workflows response mein
          // HAR video ka model likha hota hai — yehi user ka bataya hua pakka
          // record hai. Sirf model-info ke liye (charge trigger kabhi nahi).
          _p.then(function(resp) {
            try {
              resp.clone().text().then(function(t) { try { _bfParseHist(t || '', url); } catch (_) {} }).catch(function() {});
            } catch (_) {}
          }, function() {});
        }
      } catch (_) {}
      // Only inspect calls to Flow generation API endpoints
      if (_BF_API.test(url) && !_BF_SKIP.test(url) && !_BF_SKIP_FRAMES.test(url)) {
        _p.then(function(resp) {
          try {
            // Skip if too many concurrent reads (prevents freeze on frames pages)
            if (_bf_concurrent >= _BF_MAX_CONCURRENT) return;
            // Double-check: skip if content-type is not JSON/text
            var ct = (resp.headers && resp.headers.get('content-type')) || '';
            if (ct && !/json|text|grpc/i.test(ct)) return;
            // Skip if content-length suggests large binary (> 50KB)
            var cl = parseInt((resp.headers && resp.headers.get('content-length')) || '0', 10);
            if (cl > 51200) return;
            _bf_concurrent++;
            resp.clone().text().then(function(t) {
              _bf_inspect(t);
              _bf_concurrent = Math.max(0, _bf_concurrent - 1);
            }).catch(function() {
              _bf_concurrent = Math.max(0, _bf_concurrent - 1);
            });
          } catch(e) {}
        }, function() { /* swallow on OUR observer only; original _p still rejects for Flow */ });
      }
    } catch(e) {}
    return _p;
  };

  // XHR — only inspect Flow API calls (skip frames/upload endpoints)
  var _xhrMap = new WeakMap();
  var _xhrOpen = XMLHttpRequest.prototype.open;
  var _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m, url) {
    _xhrMap.set(this, String(url || ''));
    return _xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    var xhr = this, url = _xhrMap.get(xhr) || '';
    // BF OMNI: request-side inspect (XHR variant) — dekho fetch wrapper ka note.
    try {
      var _xb = (arguments.length && typeof arguments[0] === 'string') ? arguments[0] : '';
      var _xrid = 'x' + (++_bfRid); // v40: XHR request ID (Flow zyada tar XHR hi use karta hai)
      if (_xb && !_BF_SKIP.test(url)) _bfSendReq(url, 'XHR', _xb, _xrid);
      // BF NET-TRUTH (XHR VARIANT — v20, ASAL FIX): Google Flow XHR use karta
      // hai, fetch nahi — is liye fetch-only response parsing mein gen2/st2/hist
      // KABHI nahi bante the aur charge hamesha zero rehta tha. Ab XHR ke load
      // par bhi wohi parsers chalte hain: submit → operation IDs + model,
      // status → natija, history → har video ka model (hover-details ka source).
      var _isSt   = /batchcheckasync|checkasyncvideo|generationstatus/i.test(url);
      var _isHist = /fetchuserhistory|fetchprojectworkflows|media\.fetch|\/v1\/media\//i.test(url);
      // v37: body-fallback — videoModelKey wali request GEN submit hai chahe
      // URL naya/alag ho (image-to-video). Status/log/history kabhi nahi.
      var _isGen  = /:batchasyncgenerate|generatevideo|:asyncgenerate/i.test(url) ||
        (!!_xb && /"videoModelKey"\s*:/i.test(_xb) && !_isSt && !_isHist &&
         !/batchlog|logfrontend|log.?events|analytics|telemetry/i.test(url));
      if (_isGen || _isSt || _isHist) {
        if (_isGen) {
          try { window.postMessage({ __bf_gen_submit: { url: url } }, '*'); } catch (_) {}
        }
        xhr.addEventListener('load', function() {
          try {
            var t = '';
            try { t = xhr.responseText || ''; } catch (_) {
              // responseType 'json'/'arraybuffer' ho to responseText milta nahi
              try { t = xhr.response ? JSON.stringify(xhr.response) : ''; } catch (_) { t = ''; }
            }
            if (!t) return;
            if (_isGen)       { try { _bfParseGen(_xb || '', t, url, _xrid); } catch (_) {} }
            else if (_isSt)   { try { _bfParseSt(t, url); } catch (_) {} }
            else              { try { _bfParseHist(t, url); } catch (_) {} }
          } catch (_) {}
        }, { once: true });
      }
    } catch (_) {}
    if (_BF_API.test(url) && !_BF_SKIP.test(url) && !_BF_SKIP_FRAMES.test(url)) {
      xhr.addEventListener('load', function() {
        var ct = xhr.getResponseHeader('content-type') || '';
        if (ct && !/json|text|grpc/i.test(ct)) return;
        var cl = parseInt(xhr.getResponseHeader('content-length') || '0', 10);
        if (cl > 51200) return;
        _bf_inspect(xhr.responseText || '');
      }, { once: true });
    }
    return _xhrSend.apply(xhr, arguments);
  };

  // EventSource (SSE) — Flow generation progress events
  var _OrigES = window.EventSource;
  if (_OrigES) {
    window.EventSource = function(url, opts) {
      var es = new _OrigES(url, opts);
      var u = String(url || '');
      if (_BF_API.test(u) && !_BF_SKIP.test(u)) {
        ['message','generation','update','result'].forEach(function(ev) {
          es.addEventListener(ev, function(e) { _bf_inspect(e.data || ''); });
        });
      }
      return es;
    };
    Object.setPrototypeOf(window.EventSource, _OrigES);
  }

})();