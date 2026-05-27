const DAEMON_BASE_URL = "http://localhost:8765";
let isDaemonOnline = false;
let authToken = null;
let eventQueue = [];
let isProcessingQueue = false;

// 1. Initial configuration and startup
chrome.runtime.onInstalled.addListener(() => {
  console.log("VexCTX extension installed.");
  // Initialize default settings if not set
  chrome.storage.sync.get(["enabledDomains", "captureEnabled"], (result) => {
    if (!result.enabledDomains) {
      chrome.storage.sync.set({
        enabledDomains: {
          "claude.ai": true,
          "chatgpt.com": true,
          "gemini.google.com": true,
          "perplexity.ai": true
        }
      });
    }
    if (result.captureEnabled === undefined) {
      chrome.storage.sync.set({ captureEnabled: true });
    }
  });
  
  // Try pairing immediately
  attemptPairing();
});

// Run pairing check and health checks on startup
chrome.runtime.onStartup.addListener(() => {
  attemptPairing();
});

// Poll daemon health and process queue every 15 seconds
setInterval(() => {
  checkDaemonHealth();
}, 15000);

// Run initial check
checkDaemonHealth();

// Helper to update extension badge
function updateBadge(online) {
  isDaemonOnline = online;
  const text = online ? "ON" : "OFF";
  const color = online ? "#10B981" : "#EF4444"; // green vs red
  
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// 2. Token Pairing Logic
async function attemptPairing() {
  // Check if we already have a token
  chrome.storage.local.get(["authToken"], async (result) => {
    if (result.authToken) {
      authToken = result.authToken;
      console.log("Loaded existing VexCTX authorization token.");
      checkDaemonHealth();
      return;
    }
    
    console.log("No token found. Attempting to pair with local VexCTX daemon...");
    try {
      const response = await fetch(`${DAEMON_BASE_URL}/ext/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          authToken = data.token;
          chrome.storage.local.set({ authToken: data.token });
          console.log("Successfully paired with VexCTX daemon.");
          updateBadge(true);
          processSavedQueue();
        }
      } else {
        console.warn(`Pairing failed with status: ${response.status}`);
        updateBadge(false);
      }
    } catch (err) {
      console.log("Daemon not reachable during pairing. Will retry later.");
      updateBadge(false);
    }
  });
}

// 3. Health check & status polling
async function checkDaemonHealth() {
  try {
    const response = await fetch(`${DAEMON_BASE_URL}/ext/status`);
    if (response.ok) {
      const data = await response.json();
      if (data.running) {
        if (!isDaemonOnline) {
          console.log("VexCTX daemon came online.");
        }
        updateBadge(true);
        
        // If we don't have a token, try pairing again
        if (!authToken) {
          await attemptPairing();
        } else {
          processSavedQueue();
        }
      }
    } else {
      updateBadge(false);
    }
  } catch (err) {
    if (isDaemonOnline) {
      console.log("VexCTX daemon went offline.");
    }
    updateBadge(false);
  }
}

// 4. Ingestion and queue management
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "INGEST_EVENTS") {
    queueEvents(request.events);
    sendResponse({ status: "queued", count: request.events.length });
    return true;
  }
  
  if (request.type === "FORCE_PAIR") {
    attemptPairing().then(() => {
      sendResponse({ status: "attempted", online: isDaemonOnline, authenticated: !!authToken });
    });
    return true;
  }
  
  if (request.type === "GET_DAEMON_STATUS") {
    sendResponse({ online: isDaemonOnline, authenticated: !!authToken });
    return true;
  }
});

function queueEvents(events) {
  // Append capture details to events
  const enrichedEvents = events.map(ev => ({
    ...ev,
    captured_at: ev.captured_at || new Date().toISOString()
  }));
  
  chrome.storage.local.get(["offlineQueue"], (result) => {
    let queue = result.offlineQueue || [];
    queue = queue.concat(enrichedEvents);
    
    // Cap queue size at 500 events to prevent memory overflow
    if (queue.length > 500) {
      queue = queue.slice(queue.length - 500);
    }
    
    chrome.storage.local.set({ offlineQueue: queue }, () => {
      console.log(`Queued ${events.length} events. Total queue size: ${queue.length}`);
      if (isDaemonOnline && authToken) {
        processSavedQueue();
      }
    });
  });
}

async function processSavedQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  
  chrome.storage.local.get(["offlineQueue"], async (result) => {
    const queue = result.offlineQueue || [];
    if (queue.length === 0) {
      isProcessingQueue = false;
      return;
    }
    
    if (!isDaemonOnline || !authToken) {
      isProcessingQueue = false;
      return;
    }
    
    console.log(`Processing local queue of ${queue.length} events...`);
    
    // Process in batches of 20 to avoid payload size issues
    const batchSize = 20;
    const batch = queue.slice(0, batchSize);
    
    try {
      const response = await fetch(`${DAEMON_BASE_URL}/ext/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(batch)
      });
      
      if (response.ok) {
        const remainingQueue = queue.slice(batch.length);
        chrome.storage.local.set({ offlineQueue: remainingQueue }, () => {
          isProcessingQueue = false;
          console.log(`Successfully ingested batch of ${batch.length} events. Remaining: ${remainingQueue.length}`);
          
          // If more items remain, schedule next batch
          if (remainingQueue.length > 0) {
            setTimeout(processSavedQueue, 500);
          }
        });
      } else if (response.status === 401) {
        console.warn("Daemon returned 401 Unauthorized. Clearing stored token and re-pairing.");
        authToken = null;
        chrome.storage.local.remove(["authToken"], () => {
          isProcessingQueue = false;
          attemptPairing();
        });
      } else {
        console.warn(`Daemon ingestion failed with status: ${response.status}. Retrying later.`);
        isProcessingQueue = false;
      }
    } catch (err) {
      console.error("Network error during queue transmission:", err);
      isDaemonOnline = false;
      updateBadge(false);
      isProcessingQueue = false;
    }
  });
}
