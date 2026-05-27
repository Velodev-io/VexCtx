// Claude.ai Content Scraper
(() => {
  const DOMAIN_KEY = "claude.ai";
  let sentMessageHashes = new Set();
  
  // Simple hash function for deduplication
  function getStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  function getClaudeMessages() {
    // Claude messages are typically marked with data-testid attributes
    const turns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]');
    const messages = [];
    
    turns.forEach((turn, idx) => {
      const isUser = turn.getAttribute('data-testid') === 'human-turn';
      // Find text content
      let text = '';
      if (isUser) {
        // Human turn contains class with user message
        const textEl = turn.querySelector('.font-user-message') || turn;
        text = textEl.textContent.trim();
      } else {
        // AI turn contains claude message container
        const textEl = turn.querySelector('.font-claude-message') || turn;
        text = textEl.textContent.trim();
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

  // Detect if Claude is still generating a response
  function isClaudeStreaming() {
    // 1. Check if a stop button exists and is not disabled
    const stopButton = document.querySelector('button[aria-label*="Stop"]:not([disabled])') || 
                       document.querySelector('button[label*="Stop"]:not([disabled])');
    if (stopButton) return true;
    
    // 2. Check if a cursor/streaming element is active in the last turn
    const lastTurn = document.querySelector('[data-testid="ai-turn"]:last-of-type');
    if (lastTurn) {
      if (lastTurn.querySelector('.streaming') || lastTurn.querySelector('.cursor') || lastTurn.textContent.endsWith('▋')) {
        return true;
      }
    }
    
    return false;
  }

  const parseAndSend = window.VexCtxBridge.debounce(async () => {
    const isEnabled = await window.VexCtxBridge.shouldCapture(DOMAIN_KEY);
    if (!isEnabled) return;

    if (isClaudeStreaming()) {
      console.log("VexCTX (Claude): AI is still streaming. Waiting...");
      return;
    }

    const messages = getClaudeMessages();
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
          source_app: "claude_ai",
          url: currentUrl,
          role: msg.role,
          content: msg.content,
          turn_index: msg.turn_index,
          metadata: {
            app_version: "claude_web"
          }
        });
        
        // Cache in memory so we don't ingest it again in this tab lifecycle
        sentMessageHashes.add(hashKey);
      }
    });

    if (newEvents.length > 0) {
      console.log(`VexCTX (Claude): Found ${newEvents.length} new message turns.`);
      window.VexCtxBridge.sendEvents(newEvents);
    }
  }, 1000);

  // Monitor DOM for changes
  function initObserver() {
    const target = document.body;
    const observer = new MutationObserver((mutations) => {
      // Fast path checking if relevant child elements added
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
    
    console.log("VexCTX: Claude.ai content script scraper initialized.");
    
    // Run initial parse
    parseAndSend();
  }

  // Start checking for container
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initObserver();
  } else {
    window.addEventListener("DOMContentLoaded", initObserver);
  }
})();
