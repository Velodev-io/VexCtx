// Shared utilities for VexCTX Content Scrapers
window.VexCtxBridge = (() => {
  const SESSION_KEY = "vexctx_tab_session_id";
  
  // UUID generator fallback
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Get or create session ID for the current browser tab
  function getTabSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = generateUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  // Check if capture is enabled for the current domain
  async function shouldCapture(domainKey) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["captureEnabled", "enabledDomains"], (result) => {
        const captureEnabled = result.captureEnabled !== false;
        const enabledDomains = result.enabledDomains || {};
        const domainAllowed = enabledDomains[domainKey] !== false;
        resolve(captureEnabled && domainAllowed);
      });
    });
  }

  // Send captured events to the background service worker
  function sendEvents(events) {
    chrome.runtime.sendMessage({
      type: "INGEST_EVENTS",
      events: events
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("VexCTX Bridge: Failed to send events to background script:", chrome.runtime.lastError.message);
      } else {
        console.log(`VexCTX Bridge: Successfully queued ${events.length} events. Status:`, response?.status);
      }
    });
  }

  // Helper to debounce DOM analysis calls
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return {
    getTabSessionId,
    shouldCapture,
    sendEvents,
    debounce
  };
})();
