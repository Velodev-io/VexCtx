// Perplexity Content Scraper
(() => {
  const DOMAIN_KEY = "perplexity.ai";
  let sentMessageHashes = new Set();

  function getStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  function getPerplexityMessages() {
    // Perplexity organizes threads into query-answer pairings or a sequence of divs
    // Let's find user questions and corresponding answer containers.
    // User query: class containing question (typically inside heading elements or wrappers)
    // Assistant response: class containing answer (.prose is standard for markdown output)
    const messages = [];
    
    // Scan chronological blocks
    // Let's find prose elements (answers) and query elements (questions)
    // In Perplexity, the main thread usually has alternating panels.
    // A robust way is to select elements matching known layouts.
    const queryElements = document.querySelectorAll('h1, div.font-sans.font-medium, div.text-textMain.font-medium');
    const answerElements = document.querySelectorAll('.prose, div.prose-sm');
    
    // We can walk the DOM to capture questions and answers in chronological order
    const allBlocks = document.querySelectorAll('div.border-borderMain\\/60, div.py-4, div.my-2');
    let turnIdx = 0;
    
    allBlocks.forEach((block) => {
      // Check if it's a question block
      const questionEl = block.querySelector('h1') || block.querySelector('.font-medium');
      // Check if it's an answer block
      const answerEl = block.querySelector('.prose');
      
      if (questionEl && !answerEl) {
        const text = questionEl.textContent.trim();
        if (text && text.length > 3) {
          messages.push({
            role: "user",
            content: text,
            turn_index: turnIdx++
          });
        }
      } else if (answerEl) {
        const text = answerEl.textContent.trim();
        if (text) {
          messages.push({
            role: "assistant",
            content: text,
            turn_index: turnIdx++
          });
        }
      }
    });

    // Fallback: if allBlocks didn't yield results, map queryElements and answerElements directly
    if (messages.length === 0) {
      let idx = 0;
      queryElements.forEach((q) => {
        const qText = q.textContent.trim();
        if (qText && qText.length > 5) {
          messages.push({ role: "user", content: qText, turn_index: idx++ });
        }
      });
      answerElements.forEach((a) => {
        const aText = a.textContent.trim();
        if (aText) {
          messages.push({ role: "assistant", content: aText, turn_index: idx++ });
        }
      });
    }

    return messages;
  }

  // Detect if Perplexity is still typing/streaming
  function isPerplexityStreaming() {
    // 1. Check for active stop button or loading spinners
    const stopBtn = document.querySelector('button[aria-label*="Stop"]:not([disabled])') || 
                    document.querySelector('button svg[class*="animate-spin"]');
    if (stopBtn) return true;

    // 2. Check for pulsing blinking cursors inside answers
    const cursor = document.querySelector('.blink') || document.querySelector('.pulse') || document.querySelector('.loading');
    if (cursor) return true;

    return false;
  }

  const parseAndSend = window.VexCtxBridge.debounce(async () => {
    const isEnabled = await window.VexCtxBridge.shouldCapture(DOMAIN_KEY);
    if (!isEnabled) return;

    if (isPerplexityStreaming()) {
      console.log("VexCTX (Perplexity): AI is still streaming. Waiting...");
      return;
    }

    const messages = getPerplexityMessages();
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
          source_app: "perplexity",
          url: currentUrl,
          role: msg.role,
          content: msg.content,
          turn_index: msg.turn_index,
          metadata: {
            app_version: "perplexity_web"
          }
        });
        
        sentMessageHashes.add(hashKey);
      }
    });

    if (newEvents.length > 0) {
      console.log(`VexCTX (Perplexity): Found ${newEvents.length} new message turns.`);
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
    
    console.log("VexCTX: Perplexity content script scraper initialized.");
    parseAndSend();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initObserver();
  } else {
    window.addEventListener("DOMContentLoaded", initObserver);
  }
})();
