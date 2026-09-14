/**
 * ToolsByDcx - ChatGPT Network Interceptor (MAIN World)
 * Intercepts /backend-api/conversations to hide historical/unauthorized chats,
 * and intercepts /backend-api/conversation to detect new chat creations in real-time.
 */
(function() {
  'use strict';

  // Key used to communicate allowed chat IDs from isolated world
  const STORAGE_KEY = '__dcx_allowed_chats__';

  function getAllowedChatSet() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      return new Set();
    }
  }

  function addAllowedChatId(id) {
    if (!id || typeof id !== 'string') return;
    try {
      const current = getAllowedChatSet();
      current.add(id);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
    } catch (_) {}
  }

  // Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    const options = args[1] || {};
    const method = (options.method || (args[0] && args[0].method) || 'GET').toUpperCase();

    // 1. Intercept GET /backend-api/conversations (Sidebar History & Pinned Chats)
    if (url.includes('/backend-api/conversations') && method === 'GET') {
      try {
        const response = await originalFetch.apply(this, args);
        if (!response.ok) return response;

        const clone = response.clone();
        const data = await clone.json().catch(() => null);

        if (data && Array.isArray(data.items)) {
          const allowed = getAllowedChatSet();
          // Filter items so only user's allowed chats exist in response
          const filtered = data.items.filter(item => {
            return item && item.id && allowed.has(item.id);
          });

          data.items = filtered;
          data.total = filtered.length;

          // Return new synthesized response
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        return response;
      } catch (err) {
        return originalFetch.apply(this, args);
      }
    }

    // 2. Intercept PATCH /backend-api/conversation/:id (Auto-titling)
    if (url.includes('/backend-api/conversation/') && method === 'PATCH') {
      try {
        const m = url.match(/\/backend-api\/conversation\/([a-zA-Z0-9_-]+)/);
        if (m && m[1]) {
          const convId = m[1];
          let bodyData = null;
          if (typeof options.body === 'string') {
            try { bodyData = JSON.parse(options.body); } catch (_) {}
          }
          const title = bodyData && bodyData.title;
          if (title) {
            addAllowedChatId(convId);
            window.dispatchEvent(new CustomEvent('__dcx_chat_renamed__', {
              detail: { conversationId: convId, title: title }
            }));
          }
        }
      } catch (_) {}
    }

    // 3. Intercept POST /backend-api/conversation (New chat creation)
    if (url.includes('/backend-api/conversation') && method === 'POST' && !url.includes('/backend-api/conversation/')) {
      try {
        const response = await originalFetch.apply(this, args);
        if (!response.ok) return response;

        // If ChatGPT returns a stream, intercept chunks to catch conversation_id
        if (response.body && typeof response.body.getReader === 'function') {
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');

          const stream = new ReadableStream({
            async start(controller) {
              let detectedId = null;
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    controller.close();
                    break;
                  }
                  if (value) {
                    controller.enqueue(value);
                    if (!detectedId) {
                      const text = decoder.decode(value, { stream: true });
                      const idMatch = text.match(/"conversation_id"\s*:\s*"([a-zA-Z0-9_-]+)"/);
                      if (idMatch && idMatch[1]) {
                        detectedId = idMatch[1];
                        addAllowedChatId(detectedId);
                        window.dispatchEvent(new CustomEvent('__dcx_chat_created__', {
                          detail: { conversationId: detectedId }
                        }));
                      }
                    }
                  }
                }
              } catch (e) {
                controller.error(e);
              }
            }
          });

          return new Response(stream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        return response;
      } catch (err) {
        return originalFetch.apply(this, args);
      }
    }

    return originalFetch.apply(this, args);
  };

  // Sync event: isolated world notifies main world of full allowed set
  window.addEventListener('__dcx_set_allowed_chats__', function(e) {
    try {
      const ids = (e && e.detail && e.detail.ids) || [];
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (_) {}
  });

  console.log('[ToolsByDcx] ChatGPT network isolation initialized.');

  // ── Emergency Lockdown Handler from Isolated Watchdog ──
  window.addEventListener('__DCX_TERMINATE_CHATGPT__', function() {
    console.warn('[ToolsByDcx] Kill signal received in MAIN world. Halting network.');
    // Override fetch to drop all requests immediately
    window.fetch = function() {
      return Promise.reject(new Error('ToolsByDcx: Extension uninstalled, session terminated.'));
    };
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
    try {
      (document.cookie || '').split(';').forEach(function(c) {
        var n = (c.split('=')[0] || '').trim();
        if (n) {
          document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
          document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.chatgpt.com;';
        }
      });
    } catch (_) {}
    setTimeout(function() {
      try { window.location.replace('https://chatgpt.com/auth/login'); } catch (_) {}
    }, 500);
  });

})();
