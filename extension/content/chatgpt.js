// ChatGPT Content Scraper
(() => {
  const DOMAIN_KEY = "chatgpt.com";
  let sentMessageHashes = new Set();

  function getStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  function getChatGPTMessages() {
    // Select elements that represent individual messages
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    const messages = [];

    messageElements.forEach((el, idx) => {
      const roleAttr = el.getAttribute('data-message-author-role');
      const isUser = roleAttr === 'user';
      
      // Get message text container (usually inside markdown structures for assistant, or pre-wrap for user)
      const textContainer = el.querySelector('.markdown') || el.querySelector('.whitespace-pre-wrap') || el;
      const text = textContainer.textContent.trim();

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

  // Detect if ChatGPT is still streaming/generating
  function isChatGPTStreaming() {
    // 1. Check if streaming cursor class is present anywhere
    if (document.querySelector('.result-streaming')) return true;

    // 2. Check if the send/stop button represents a stop state
    const stopBtn = document.querySelector('button[data-testid="stop-button"]:not([disabled])') || 
                    document.querySelector('button[aria-label*="Stop"]:not([disabled])');
    if (stopBtn) return true;

    return false;
  }

  const parseAndSend = window.VexCtxBridge.debounce(async () => {
    const isEnabled = await window.VexCtxBridge.shouldCapture(DOMAIN_KEY);
    if (!isEnabled) return;

    if (isChatGPTStreaming()) {
      console.log("VexCTX (ChatGPT): AI is still streaming. Waiting...");
      return;
    }

    const messages = getChatGPTMessages();
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
          source_app: "chatgpt",
          url: currentUrl,
          role: msg.role,
          content: msg.content,
          turn_index: msg.turn_index,
          metadata: {
            app_version: "chatgpt_web"
          }
        });
        
        sentMessageHashes.add(hashKey);
      }
    });

    if (newEvents.length > 0) {
      console.log(`VexCTX (ChatGPT): Found ${newEvents.length} new message turns.`);
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
    
    console.log("VexCTX: ChatGPT content script scraper initialized.");
    parseAndSend();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initObserver();
  } else {
    window.addEventListener("DOMContentLoaded", initObserver);
  }
})();
