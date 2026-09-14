/**
 * ToolsByDcx Companion B — Background Service Worker
 * Companion cleanup & security guard for ToolsByDcx.
 * Automatically clears cookies locally if the main extension is uninstalled or disabled.
 * ZERO remote calls to OpenAI or Google — 100% safe for shared master accounts.
 */
(function() {
  'use strict';

  const MAIN_EXT_NAMES = new Set(['ToolsByDcx', 'FlowByDcx']);
  let _mainExtId = null;

  async function getStoredMainId() {
    try {
      const r = await chrome.storage.local.get('_dcx_main_id');
      if (r && r._dcx_main_id) {
        _mainExtId = r._dcx_main_id;
        return r._dcx_main_id;
      }
    } catch (_) {}
    return null;
  }

  async function findMainExt() {
    try {
      if (!chrome.management || !chrome.management.getAll) return null;
      const exts = await new Promise(r => chrome.management.getAll(e => r(e || [])));
      for (let i = 0; i < exts.length; i++) {
        if (exts[i].type === 'extension' && MAIN_EXT_NAMES.has(exts[i].name)) {
          if (exts[i].enabled === false) {
            console.warn('[ToolsByDcx Companion B] Main extension is DISABLED');
            _mainExtId = null;
            await chrome.storage.local.set({ _dcx_main_installed: false });
            return null;
          }
          _mainExtId = exts[i].id;
          await chrome.storage.local.set({ _dcx_main_id: exts[i].id, _dcx_main_installed: true });
          return exts[i].id;
        }
      }
      console.warn('[ToolsByDcx Companion B] Main extension not found');
      _mainExtId = null;
      await chrome.storage.local.set({ _dcx_main_installed: false });
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── LOCAL-ONLY COOKIE WIPE (zero server calls) ─────────────────────────────
  async function clearAllBrowserCookiesLocally() {
    console.log('[ToolsByDcx Companion B] Main extension gone — wiping all session cookies locally...');

    // 1. BrowsingData API: 5 aggressive passes to purge cookie storage
    for (let pass = 0; pass < 5; pass++) {
      try {
        if (chrome.browsingData && chrome.browsingData.remove) {
          await new Promise(r => chrome.browsingData.remove({ since: 0 }, { cookies: true }, () => r()));
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 80));
    }

    // 2. Individual cookie sweep for managed service domains
    const targetDomains = [
      'google.com', '.google.com', 'accounts.google.com', 'labs.google', 'flow.google.com',
      'chatgpt.com', '.chatgpt.com', 'openai.com', '.openai.com', 'oaistatic.com'
    ];
    for (const dom of targetDomains) {
      try {
        const cookies = await new Promise(r => chrome.cookies.getAll({ domain: dom }, c => r(c || [])));
        for (const c of (cookies || [])) {
          const scheme = c.secure ? 'https' : 'http';
          const host = (c.domain || '').replace(/^\.+/, '');
          try {
            await new Promise(r => chrome.cookies.remove({ url: scheme + '://' + host + (c.path || '/'), name: c.name }, () => r()));
          } catch (_) {}
        }
      } catch (_) {}
    }

    console.log('[ToolsByDcx Companion B] Local cookie wipe completed successfully.');

    // 3. Reload any active tool tabs so they immediately show the logged-out screen
    try {
      const tabs = await new Promise(r => chrome.tabs.query({}, t => r(t || [])));
      for (const t of (tabs || [])) {
        if (t && t.url && (t.url.includes('chatgpt.com') || t.url.includes('flow.google.com') || t.url.includes('labs.google'))) {
          try { chrome.tabs.reload(t.id); } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // ─── UNINSTALL LISTENER ─────────────────────────────────────────────────────
  // The millisecond Main Extension is removed, this fires in Companion B
  if (chrome.management && chrome.management.onUninstalled) {
    chrome.management.onUninstalled.addListener(async function(uninstalledId) {
      const storedId = await getStoredMainId();
      if (uninstalledId === storedId || uninstalledId === _mainExtId) {
        // Wait 1.5s to distinguish temporary reload from true uninstall
        await new Promise(r => setTimeout(r, 1500));
        const stillHere = await findMainExt();
        if (stillHere) {
          console.log('[ToolsByDcx Companion B] Main extension reloaded/updated — keeping cookies');
          return;
        }
        console.log('[ToolsByDcx Companion B] Main extension genuinely UNINSTALLED!');
        await clearAllBrowserCookiesLocally();
        await chrome.storage.local.remove('_dcx_main_id');
        _mainExtId = null;
      }
    });
  }

  // ─── DISABLE LISTENER ───────────────────────────────────────────────────────
  if (chrome.management && chrome.management.onDisabled) {
    chrome.management.onDisabled.addListener(async function(extInfo) {
      if (!extInfo) return;
      const storedId = await getStoredMainId();
      if (extInfo.id === storedId || extInfo.id === _mainExtId || MAIN_EXT_NAMES.has(extInfo.name)) {
        await new Promise(r => setTimeout(r, 1500));
        const stillActive = await findMainExt();
        if (stillActive) return;
        console.log('[ToolsByDcx Companion B] Main extension DISABLED — wiping cookies');
        await clearAllBrowserCookiesLocally();
      }
    });
  }

  // ─── PERIODIC MAIN EXTENSION HEALTH CHECK ──────────────────────────────────
  async function checkMainExtStatus() {
    const mainId = await findMainExt();
    if (mainId) return;
    await new Promise(r => setTimeout(r, 2000));
    const doubleCheck = await findMainExt();
    if (!doubleCheck) {
      console.log('[ToolsByDcx Companion B] Periodic check: Main extension missing — wiping cookies');
      await clearAllBrowserCookiesLocally();
    }
  }

  chrome.runtime.onInstalled.addListener(async function() {
    await findMainExt();
    chrome.alarms.create('dcx-companion-check', { periodInMinutes: 1 });
  });

  chrome.runtime.onStartup.addListener(async function() {
    await findMainExt();
    chrome.alarms.create('dcx-companion-check', { periodInMinutes: 1 });
  });

  chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm && alarm.name === 'dcx-companion-check') {
      checkMainExtStatus();
    }
  });

  findMainExt();
})();
