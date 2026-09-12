// BunnyFlow — disconnect watchdog (ISOLATED world) — v41.8 fallback beacon.
//
// The MAIN-world watchdog now detects removal directly via chrome.runtime.id,
// so this is only a FALLBACK for the (unexpected) case where chrome.runtime.id
// is unreadable in MAIN. It posts a direct heartbeat straight to the page every
// 500ms — NO service-worker round-trip — guarded by chrome.runtime.id so it
// stops the instant the extension is removed/disabled. The MAIN watchdog treats
// a sustained silence of these heartbeats as a disconnect.
(function () {
  "use strict";

  var HEARTBEAT_TYPE = "BF_EXTENSION_HEARTBEAT";

  function beat() {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
        window.postMessage(
          { type: HEARTBEAT_TYPE, id: chrome.runtime.id, t: Date.now() },
          "*"
        );
      }
    } catch (_error) {}
  }

  beat();
  setInterval(beat, 500);
})();
