// BunnyFlow — Flow About / Landing Page Status Card
// Runs on flow.google.com/about and labs.google roots.
// Waits for cookie injection then redirects to Flow home.
(function () {
  'use strict';

  var path = location.pathname;
  var isAboutPage = /^\/(flow\/)?about\/?$/i.test(path) || path === '/about';
  if (!isAboutPage) return;

  var POLL_MS    = 3000;
  var MAX_TRIES  = 20;
  var _attempts  = 0;
  var _pollId    = null;
  var _card      = null;
  var _autoHide  = null;
  var _redirecting = false;

  // Loop protection: count how many times we've tried to redirect on this tab
  var _REDIRECT_KEY = '__bf_redirect_count__';
  var _redirectCount = parseInt(sessionStorage.getItem(_REDIRECT_KEY) || '0', 10);

  // Returns the correct Flow URL based on current domain
  function getTargetUrl() {
    return (location.hostname.indexOf('flow.google.com') !== -1)
      ? 'https://flow.google.com/'
      : 'https://labs.google/fx/tools/flow';
  }

  // Check document.cookie for visible (non-httpOnly) Google auth cookies
  function hasCookies() {
    var c = document.cookie;
    return c.indexOf('SAPISID') !== -1 ||
           c.indexOf('SID=')    !== -1 ||
           c.indexOf('SSID=')   !== -1 ||
           c.indexOf('HSID=')   !== -1 ||
           c.indexOf('__Secure-1PSID') !== -1;
  }

  // Also ask the background worker via chrome.runtime to check httpOnly cookies (OSID, etc.)
  function hasCookiesAsync(cb) {
    if (hasCookies()) { cb(true); return; }
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        var sent = false;
        var timer = setTimeout(function() { if (!sent) { sent = true; cb(false); } }, 1000);
        chrome.runtime.sendMessage({ type: 'BF_CHECK_COOKIES', url: location.origin }, function() {
          clearTimeout(timer);
          if (sent) return; sent = true;
          // Even if background doesn't support this message, fallback to doc.cookie result
          cb(hasCookies());
        });
        return;
      }
    } catch(e) {}
    cb(false);
  }

  function isExtensionAlive(cb) {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        cb(false); return;
      }
      chrome.runtime.sendMessage({ type: 'PING' }, function() {
        cb(!chrome.runtime.lastError);
      });
    } catch(e) { cb(false); }
  }

  function requestInjection() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        ['INJECT_NOW','BUNNYFLOW_INJECT_COOKIES','BF_SYNC_NOW'].forEach(function(t) {
          chrome.runtime.sendMessage({ type: t }, function() {});
        });
      }
    } catch(e) {}
  }

  function showCard(text, emoji, color, sub) {
    if (_autoHide) clearTimeout(_autoHide);
    if (!_card) {
      _card = document.createElement('div');
      _card.id = '__bf_about_card__';
      _card.style.cssText =
        'position:fixed!important;bottom:20px!important;right:20px!important;' +
        'z-index:2147483647!important;border-radius:10px!important;' +
        'font-family:system-ui,sans-serif!important;color:#fff!important;' +
        'min-width:190px!important;max-width:280px!important;' +
        'box-shadow:0 4px 18px rgba(0,0,0,0.45)!important;' +
        'transition:opacity 0.3s!important;opacity:1!important;' +
        'display:flex!important;align-items:flex-start!important;' +
        'padding:10px 12px!important;gap:8px!important;';
      document.body.appendChild(_card);
    }
    while (_card.firstChild) _card.removeChild(_card.firstChild);
    _card.style.background = color + '!important';
    _card.style.opacity = '1';

    var iconEl = document.createElement('span');
    iconEl.style.cssText = 'font-size:16px;flex-shrink:0;padding-top:1px';
    iconEl.textContent = emoji;

    var textEl = document.createElement('span');
    textEl.style.cssText = 'font-size:12px;font-weight:600;flex:1;line-height:1.35';
    textEl.textContent = text;
    if (sub) {
      var subEl = document.createElement('div');
      subEl.style.cssText = 'font-size:10px;font-weight:400;opacity:0.8;margin-top:2px';
      subEl.textContent = sub;
      textEl.appendChild(subEl);
    }

    var xEl = document.createElement('span');
    xEl.style.cssText = 'cursor:pointer;opacity:0.65;font-size:13px;flex-shrink:0;padding:0 2px';
    xEl.textContent = '\u2715';
    xEl.addEventListener('click', function() { _card.style.opacity = '0'; });

    _card.appendChild(iconEl);
    _card.appendChild(textEl);
    _card.appendChild(xEl);
  }

  function hideCard() {
    if (_card) _card.style.opacity = '0';
  }

  function poll() {
    _attempts++;
    requestInjection();
    hasCookiesAsync(function(found) {
      if (_redirecting) return;
      if (found) {
        clearInterval(_pollId);
        _redirecting = true;
        showCard('Flow is Active \u2014 Opening\u2026', '\u2705',
          'linear-gradient(135deg,#16a34a,#166534)');
        setTimeout(function() { location.replace(getTargetUrl()); }, 1200);
        return;
      }
      if (_attempts >= MAX_TRIES) {
        clearInterval(_pollId);
        showCard('Flow not available \u2014 try again', '\u274c',
          'linear-gradient(135deg,#dc2626,#991b1b)');
        return;
      }
      showCard('Flow is opening\u2026 Please wait', '\u23f3',
        'linear-gradient(135deg,#6d28d9,#4c1d95)',
        'Refresh this page & Visit FlowByDcx');
    });
  }

  function init() {
    hasCookiesAsync(function(found) {
      if (found) {
        isExtensionAlive(function(alive) {
          if (alive) {
            _redirecting = true;
            location.replace(getTargetUrl());
          } else {
            showCard('Flow is Active!', '\u2705',
              'linear-gradient(135deg,#16a34a,#166534)');
            _autoHide = setTimeout(hideCard, 3000);
          }
        });
        return;
      }
      isExtensionAlive(function(alive) {
        if (!alive) {
          showCard('Flow not available \u2014 try again', '\u274c',
            'linear-gradient(135deg,#dc2626,#991b1b)');
          return;
        }
        requestInjection();
        showCard('Flow is opening\u2026 Please wait', '\u23f3',
          'linear-gradient(135deg,#6d28d9,#4c1d95)',
          'Refresh this page & Visit FlowByDcx');
        _pollId = setInterval(poll, POLL_MS);
      });
    });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
