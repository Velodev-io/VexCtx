// Gemini Content Scraper
(() => {
  const DOMAIN_KEY = "gemini.google.com";
  let sentMessageHashes = new Set();

  function getStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  function getGeminiMessages() {
    // In Gemini, user questions are in <user-query> and responses are in <model-response>
    const messageContainers = document.querySelectorAll('user-query, model-response');
    const messages = [];

    messageContainers.forEach((el, idx) => {
      const isUser = el.tagName.toLowerCase() === 'user-query';
      
      // Extract text content specifically to avoid button labels
      const textEl = isUser 
        ? (el.querySelector('.query-text') || el.querySelector('.query-content') || el)
        : (el.querySelector('.message-content') || el.querySelector('.model-response-text') || el.querySelector('.markdown') || el.querySelector('div[class*="message-content"]') || el);
      
      // If we fell back to the root container, strip out typical button/action labels
      let text = textEl.textContent.trim();
      if (textEl === el && !isUser) {
        text = text.replace(/Copy\s*Share\s*Export\s*Google\s*it\s*Modify\s*response/gi, '').trim();
      }

      if (text) {
        messages.push({
          role: isUser ? "user" : "assistant",
          content: text,
          turn_index: idx
        });
      }
    });

    return messages;
  }

  // Detect if Gemini is still generating/streaming
  function isGeminiStreaming() {
    // 1. Check if the stop generation button is active and not disabled
    const stopBtn = document.querySelector('button[aria-label*="Stop"]:not([disabled]), button[data-testid*="stop"]:not([disabled])');
    if (stopBtn) return true;

    // 2. Check for active spinners or cursor states inside model-responses (avoiding global layout indicators)
    const activeProgress = document.querySelector('model-response mat-progress-bar') || 
                           document.querySelector('model-response mat-progress-spinner') || 
                           document.querySelector('.generating') || 
                           document.querySelector('.loading-spinner');
    if (activeProgress) return true;

    return false;
  }

  const parseAndSend = window.VexCtxBridge.debounce(async () => {
    const isEnabled = await window.VexCtxBridge.shouldCapture(DOMAIN_KEY);
    if (!isEnabled) return;

    if (isGeminiStreaming()) {
      console.log("VexCTX (Gemini): AI is still streaming. Waiting...");
      return;
    }

    const messages = getGeminiMessages();
    if (messages.length === 0) return;

    const newEvents = [];
    const sessionId = window.VexCtxBridge.getTabSessionId();
    const currentUrl = window.location.href;

    messages.forEach((msg) => {
      // Include URL in hash key so that SPA navigation across different chats correctly captures turns
      const hashKey = getStringHash(`${currentUrl}_${msg.role}_${msg.turn_index}_${msg.content}`);
      
      if (!sentMessageHashes.has(hashKey)) {
        newEvents.push({
          session_id: sessionId,
          source_app: "gemini",
          url: currentUrl,
          role: msg.role,
          content: msg.content,
          turn_index: msg.turn_index,
          metadata: {
            app_version: "gemini_web"
          }
        });
        
        sentMessageHashes.add(hashKey);
      }
    });

    if (newEvents.length > 0) {
      console.log(`VexCTX (Gemini): Found ${newEvents.length} new message turns.`);
      window.VexCtxBridge.sendEvents(newEvents);
    }
  }, 1000);

  function initObserver() {
    const target = document.body;
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }
      
      if (shouldProcess) {
        parseAndSend();
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
    
    console.log("VexCTX: Gemini content script scraper initialized.");
    parseAndSend();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initObserver();
  } else {
    window.addEventListener("DOMContentLoaded", initObserver);
  }
})();
