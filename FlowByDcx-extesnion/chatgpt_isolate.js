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
})();
