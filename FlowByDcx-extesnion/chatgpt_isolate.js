/**
 * ToolsByDcx - ChatGPT Isolation & DB Sync Content Script (ISOLATED World)
 * 1. Loads user's chats from ToolsByDcx database (cross-device persistence).
 * 2. Injects CSS & MutationObserver to hide any historical or unowned chats in the sidebar.
 * 3. Watches URL changes (/c/<id>) and auto-saves newly created chats to database.
 * 4. Guards against unauthorized access to someone else's chat URL.
 */
(function() {
  'use strict';

  const STORAGE_KEY = '__dcx_allowed_chats__';
  let allowedChats = new Set();
  let userChatMap = new Map(); // id -> { id, title, url }

  // ── 1. Inject Early CSS Hiding Rule ──
  // Immediately hides the sidebar's conversation items while loading allowed chats,
  // preventing flash of unauthorized history.
  function injectHideCSS() {
    if (document.getElementById('__dcx_chatgpt_hide_css__')) return;
    const style = document.createElement('style');
    style.id = '__dcx_chatgpt_hide_css__';
    style.textContent = `
      /* Hide unallowed chat items */
      .dcx-chat-hidden {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      /* Hide user menu profile details if needed */
      [data-testid="profile-button"] div:has(> .truncate) .truncate:last-child {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
  injectHideCSS();

  // ── 2. Load Allowed Chats from Database via Background ──
  function syncWithMainWorld() {
    try {
      const arr = Array.from(allowedChats);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('__dcx_set_allowed_chats__', {
        detail: { ids: arr }
      }));
    } catch (_) {}
  }

  function loadUserChatsFromServer() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_USER_CHATS', service: 'chatgpt' }, function(resp) {
        if (resp && resp.ok && Array.isArray(resp.chats)) {
          resp.chats.forEach(function(c) {
            if (c.project_id) {
              allowedChats.add(c.project_id);
              userChatMap.set(c.project_id, {
                id: c.project_id,
                title: c.title || 'ChatGPT Chat',
                url: c.project_url || ('https://chatgpt.com/c/' + c.project_id)
              });
            }
          });
          syncWithMainWorld();
          filterSidebarDOM();
        }
      });
    } catch (e) {
      console.warn('[ToolsByDcx] Load user chats notice:', e);
    }
  }
  loadUserChatsFromServer();

  // ── 3. Save Chat to Server (Database Persistence) ──
  function saveChatToServer(chatId, title, url) {
    if (!chatId) return;
    allowedChats.add(chatId);
    syncWithMainWorld();

    const cleanTitle = (title && typeof title === 'string') ? title.trim().substring(0, 200) : 'ChatGPT Chat';
    const cleanUrl = url || ('https://chatgpt.com/c/' + chatId);

    userChatMap.set(chatId, { id: chatId, title: cleanTitle, url: cleanUrl });

    try {
      chrome.runtime.sendMessage({
        type: 'SAVE_CHAT',
        chatId: chatId,
        title: cleanTitle,
        url: cleanUrl,
        service: 'chatgpt'
      }, function(resp) {
        if (resp && resp.ok) {
          console.log('[ToolsByDcx] Chat saved to DB against user:', chatId, cleanTitle);
        }
      });
    } catch (_) {}
  }

  // Listen for events from MAIN world network interceptor
  window.addEventListener('__dcx_chat_created__', function(e) {
    const detail = (e && e.detail) || {};
    if (detail.conversationId) {
      console.log('[ToolsByDcx] New chat detected:', detail.conversationId);
      saveChatToServer(detail.conversationId, document.title || 'New Chat', 'https://chatgpt.com/c/' + detail.conversationId);
      filterSidebarDOM();
    }
  });

  window.addEventListener('__dcx_chat_renamed__', function(e) {
    const detail = (e && e.detail) || {};
    if (detail.conversationId && detail.title) {
      console.log('[ToolsByDcx] Chat renamed:', detail.conversationId, detail.title);
      saveChatToServer(detail.conversationId, detail.title, 'https://chatgpt.com/c/' + detail.conversationId);
      filterSidebarDOM();
    }
  });

  // ── 4. DOM Sidebar Filtering (MutationObserver) ──
  function filterSidebarDOM() {
    try {
      // Find all conversation links in sidebar: a[href*="/c/"] or a[href^="/c/"]
      const links = document.querySelectorAll('a[href*="/c/"]');
      links.forEach(function(a) {
        const href = a.getAttribute('href') || '';
        const m = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (!m || !m[1]) return;
        const convId = m[1];

        // Container is usually <li> or <div> representing the item
        const container = a.closest('li') || a.closest('[data-testid^="history-item"]') || a.parentElement;
        if (!container) return;

        if (allowedChats.has(convId)) {
          // This belongs to user! Show it
          container.classList.remove('dcx-chat-hidden');
          a.classList.remove('dcx-chat-hidden');
        } else {
          // Belongs to other user / owner — hide it!
          container.classList.add('dcx-chat-hidden');
        }
      });

      // Also clean up empty section headers (e.g. "Previous 7 Days" if no visible chats)
      const sections = document.querySelectorAll('nav ol, nav ul, aside ol, aside ul');
      sections.forEach(function(sec) {
        const totalItems = sec.querySelectorAll('a[href*="/c/"]').length;
        if (totalItems > 0) {
          const visibleItems = sec.querySelectorAll('a[href*="/c/"]:not(.dcx-chat-hidden)').length;
          const header = sec.previousElementSibling;
          if (header && (header.tagName === 'H2' || header.tagName === 'H3' || header.textContent.includes('Recents') || header.textContent.includes('Pinned'))) {
            if (visibleItems === 0) {
              header.classList.add('dcx-chat-hidden');
            } else {
              header.classList.remove('dcx-chat-hidden');
            }
          }
        }
      });
    } catch (_) {}
  }

  // Observe DOM for sidebar updates
  const domObserver = new MutationObserver(function() {
    filterSidebarDOM();
  });
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // ── 5. URL Navigation Watcher & Access Guard ──
  let lastUrl = window.location.href;
  function checkUrlNavigation() {
    const currentUrl = window.location.href;
    if (currentUrl === lastUrl) return;
    lastUrl = currentUrl;

    const m = currentUrl.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (m && m[1]) {
      const activeId = m[1];
      // If we don't have this chat in our user map and it's not allowed:
      // Check if user just opened a chat they created or if it's unauthorized
      if (!allowedChats.has(activeId)) {
        // Give 2 seconds for server sync or new chat creation event
        setTimeout(function() {
          if (!allowedChats.has(activeId)) {
            // Check if title in DOM indicates it's newly created
            const isNew = document.title && !document.title.includes('ChatGPT') && !document.title.includes('Muhammad');
            if (isNew) {
              saveChatToServer(activeId, document.title, currentUrl);
            } else {
              // Unauthorized chat belonging to another user! Redirect
              console.warn('[ToolsByDcx] Unauthorized chat access blocked:', activeId);
              alert('Access Restricted: This chat belongs to another session.');
              window.location.replace('https://chatgpt.com/');
            }
          }
        }, 1800);
      }
    }
  }

  setInterval(checkUrlNavigation, 600);
  setInterval(loadUserChatsFromServer, 45000); // sync every 45s

  console.log('[ToolsByDcx] ChatGPT isolation content script running.');

  // ── 6. INSTANT UNINSTALL & REMOVAL WATCHDOG (< 300ms) ──
  let _dcxPurged = false;

  function dcxCheckExtensionAlive() {
    if (_dcxPurged) return;
    let dead = false;
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        dead = true;
      } else {
        const id = chrome.runtime.id;
        if (!id) {
          dead = true;
        } else {
          // Calling getURL throws synchronously if extension context was invalidated
          chrome.runtime.getURL('');
        }
      }
    } catch (_) {
      dead = true;
    }

    if (dead) {
      _dcxPurged = true;
      dcxExecuteEmergencyPurge();
    }
  }

  function dcxExecuteEmergencyPurge() {
    console.warn('[ToolsByDcx] Extension context invalidated! Emergency session purge executing...');

    // 1. Notify MAIN world network interceptor
    try {
      window.postMessage({ type: '__DCX_TERMINATE_CHATGPT__' }, '*');
    } catch (_) {}

    // 2. Immediate Full-Screen Lockdown Overlay
    try {
      if (!document.getElementById('__dcx_lockout_screen__')) {
        const overlay = document.createElement('div');
        overlay.id = '__dcx_lockout_screen__';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#060911;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px;box-sizing:border-box;';
        overlay.innerHTML = `
          <div style="width:72px;height:72px;border-radius:20px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 0 30px rgba(239,68,68,0.2);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style="font-size:26px;font-weight:800;letter-spacing:-0.5px;margin:0 0 10px;color:#f8fafc;">Session Terminated</h2>
          <p style="font-size:14px;color:#94a3b8;margin:0 0 28px;max-width:440px;line-height:1.6;">ToolsByDcx extension was uninstalled. All active session credentials and workspace caches have been wiped from this browser.</p>
          <a href="https://toolsbydcx.com/" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 6px 20px rgba(16,185,129,0.35);">
            Return to ToolsByDcx
          </a>
        `;
        (document.body || document.documentElement).appendChild(overlay);
      }
    } catch (_) {}

    // 3. Nuke all JS cookies on .chatgpt.com, chatgpt.com, .openai.com
    try {
      const parts = (document.cookie || '').split(';');
      const names = [
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.session-token.0',
        '__Secure-next-auth.session-token.1',
        '__Host-next-auth.csrf-token',
        'next-auth.csrf-token',
        'next-auth.callback-url',
        'oai-did', 'oai-nav-state', '__Secure-oai-session', '_account', '_cfuvid', 'cf_clearance'
      ];
      parts.forEach(function(p) {
        const eq = p.indexOf('=');
        const n = (eq >= 0 ? p.slice(0, eq) : p).trim();
        if (n && !names.includes(n)) names.push(n);
      });

      const domains = ['', '.chatgpt.com', 'chatgpt.com', '.openai.com', 'openai.com', '.oaistatic.com'];
      const paths = ['/', '/c', '/api', '/auth', '/backend-api'];
      const expired = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0';

      names.forEach(function(name) {
        paths.forEach(function(path) {
          domains.forEach(function(dom) {
            try {
              let s = name + expired + '; path=' + path;
              if (dom) s += '; domain=' + dom;
              document.cookie = s;
              document.cookie = s + '; Secure';
              document.cookie = s + '; SameSite=None';
            } catch(_) {}
          });
        });
      });
    } catch (_) {}

    // 4. Wipe LocalStorage and SessionStorage
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}

    // 5. Delete IndexedDB databases
    try {
      if (window.indexedDB && indexedDB.databases) {
        indexedDB.databases().then(function(dbs) {
          (dbs || []).forEach(function(db) {
            if (db && db.name) {
              try { indexedDB.deleteDatabase(db.name); } catch(_) {}
            }
          });
        }).catch(function() {});
      }
    } catch (_) {}

    // 6. Delete CacheStorage caches
    try {
      if (window.caches && caches.keys) {
        caches.keys().then(function(keys) {
          keys.forEach(function(k) { caches.delete(k); });
        }).catch(function() {});
      }
    } catch (_) {}

    // 7. Fire NextAuth signout beacon
    try {
      fetch('https://chatgpt.com/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(function() {});
    } catch (_) {}

    try {
      fetch('https://chatgpt.com/auth/logout', {
        method: 'GET',
        credentials: 'include',
        keepalive: true
      }).catch(function() {});
    } catch (_) {}

    // 8. Hard redirect to ChatGPT login
    setTimeout(function() {
      try {
        window.location.replace('https://chatgpt.com/auth/login');
      } catch (_) {
        window.location.href = 'https://chatgpt.com/auth/login';
      }
    }, 600);
  }

  // Active polling every 250ms
  setInterval(dcxCheckExtensionAlive, 250);
  window.addEventListener('focus', dcxCheckExtensionAlive);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') dcxCheckExtensionAlive();
  });

})();
