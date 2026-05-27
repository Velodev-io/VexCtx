document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const statusBadge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");
  const masterToggle = document.getElementById("master-toggle");
  const connectionWarning = document.getElementById("connection-warning");
  const retryBtn = document.getElementById("retry-btn");
  const openDashboardBtn = document.getElementById("open-dashboard");
  const queueCount = document.getElementById("queue-count");
  
  const domainToggles = {
    "claude.ai": document.getElementById("toggle-claude"),
    "chatgpt.com": document.getElementById("toggle-chatgpt"),
    "gemini.google.com": document.getElementById("toggle-gemini"),
    "perplexity.ai": document.getElementById("toggle-perplexity")
  };

  // 1. Load settings & update UI
  function loadSettings() {
    chrome.storage.sync.get(["captureEnabled", "enabledDomains"], (result) => {
      // Set master toggle
      const captureEnabled = result.captureEnabled !== false;
      masterToggle.checked = captureEnabled;
      
      // Set domain toggles
      const enabledDomains = result.enabledDomains || {};
      for (const [domain, checkbox] of Object.entries(domainToggles)) {
        if (checkbox) {
          checkbox.checked = enabledDomains[domain] !== false;
          // Disable individual domain switches if master capture is disabled
          checkbox.disabled = !captureEnabled;
        }
      }
    });
    
    // Load queue count
    updateQueueCount();
  }

  function updateQueueCount() {
    chrome.storage.local.get(["offlineQueue"], (result) => {
      const queue = result.offlineQueue || [];
      queueCount.textContent = queue.length;
    });
  }

  // 2. Poll daemon status
  function updateDaemonStatus() {
    chrome.runtime.sendMessage({ type: "GET_DAEMON_STATUS" }, (response) => {
      if (chrome.runtime.lastError) {
        setOfflineState();
        return;
      }
      
      if (response && response.online) {
        setOnlineState(response.authenticated);
      } else {
        setOfflineState();
      }
    });
  }

  function setOnlineState(authenticated) {
    statusBadge.className = "status-badge online";
    statusText.textContent = authenticated ? "Connected" : "Pairing...";
    connectionWarning.style.display = "none";
  }

  function setOfflineState() {
    statusBadge.className = "status-badge offline";
    statusText.textContent = "Offline";
    connectionWarning.style.display = "flex";
  }

  // 3. Event Listeners
  
  // Master toggle listener
  masterToggle.addEventListener("change", () => {
    const checked = masterToggle.checked;
    chrome.storage.sync.set({ captureEnabled: checked }, () => {
      // Toggle disabled state on child switches
      for (const checkbox of Object.values(domainToggles)) {
        if (checkbox) {
          checkbox.disabled = !checked;
        }
      }
      console.log(`VexCTX: Master capture set to ${checked}`);
    });
  });

  // Individual domain toggle listeners
  for (const [domain, checkbox] of Object.entries(domainToggles)) {
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        chrome.storage.sync.get(["enabledDomains"], (result) => {
          const enabledDomains = result.enabledDomains || {};
          enabledDomains[domain] = checkbox.checked;
          
          chrome.storage.sync.set({ enabledDomains: enabledDomains }, () => {
            console.log(`VexCTX: Capture for ${domain} set to ${checkbox.checked}`);
          });
        });
      });
    }
  }

  // Retry/Pair button click
  retryBtn.addEventListener("click", () => {
    statusText.textContent = "Connecting...";
    chrome.runtime.sendMessage({ type: "FORCE_PAIR" }, (response) => {
      setTimeout(updateDaemonStatus, 500);
    });
  });

  // Open Vault button click
  openDashboardBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:8765/timeline" });
  });

  // Run initialization
  loadSettings();
  updateDaemonStatus();
  
  // Poll stats and status every 3 seconds while popup is open
  const pollInterval = setInterval(() => {
    updateDaemonStatus();
    updateQueueCount();
  }, 3000);

  // Clear interval when popup closes
  window.addEventListener("unload", () => {
    clearInterval(pollInterval);
  });
});
