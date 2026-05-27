// VexCTX Desktop WebView Frontend Controller
const DAEMON_URL = "http://127.0.0.1:8765";

// State
let isDaemonOnline = false;
let activePlan = "free";
let hasFetchedPrefs = false;
let currentPreferences = {
  os_logging_enabled: true,
  onboarded: false,
  retention_days: 30
};

// DOM Elements
const daemonIndicator = document.getElementById("daemon-indicator");
const daemonStatusText = document.getElementById("daemon-status-text");
const planBadge = document.getElementById("plan-badge");

// View management
const views = ["timeline-view", "search-view", "vault-files-view", "license-view", "onboarding-view"];

// Vault segments preview state
let currentPreviewIndex = null;
let currentPreviewFileName = "";
let currentDecryptedData = null;

function showView(viewId) {
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) {
      if (v === viewId) el.classList.add("active");
      else el.classList.remove("active");
    }
  });

  // Manage active nav item highlighting
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-view") === viewId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

// Check local daemon health and license status
async function checkDaemonHealth() {
  try {
    const response = await fetch(`${DAEMON_URL}/ext/status`);
    if (response.ok) {
      const data = await response.json();
      isDaemonOnline = true;
      activePlan = data.plan.toLowerCase();
      
      daemonIndicator.style.background = "var(--accent-green)";
      daemonIndicator.style.boxShadow = "0 0 8px var(--accent-green)";
      daemonStatusText.textContent = "Daemon Active";
      
      planBadge.className = `badge badge-${activePlan}`;
      planBadge.textContent = activePlan.toUpperCase();
      
      updateProGatedViews();

      if (!hasFetchedPrefs) {
        hasFetchedPrefs = true;
        fetchPreferences();
      }
    } else {
      console.warn("Daemon health check returned non-ok status:", response.status);
      setDaemonOffline();
    }
  } catch (error) {
    console.error("Daemon health check failed:", error);
    setDaemonOffline();
  }
}

function setDaemonOffline() {
  isDaemonOnline = false;
  hasFetchedPrefs = false;
  daemonIndicator.style.background = "var(--accent-red)";
  daemonIndicator.style.boxShadow = "0 0 8px var(--accent-red)";
  daemonStatusText.textContent = "Daemon Offline";
  planBadge.className = "badge badge-free";
  planBadge.textContent = "FREE";
  updateProGatedViews();
}

function updateProGatedViews() {
  // Update License view blocks (search is unlocked for everyone by default)
  const activeBox = document.getElementById("license-active-box");
  const inactiveBox = document.getElementById("license-inactive-box");
  const emailText = document.getElementById("license-email-text");
  
  if (activePlan === "pro") {
    if (activeBox) activeBox.style.display = "flex";
    if (inactiveBox) inactiveBox.style.display = "none";
    
    // Fetch license status details
    fetch(`${DAEMON_URL}/license/status`)
      .then(res => res.json())
      .then(data => {
        if (data.valid && emailText) {
          emailText.textContent = `Verified user: ${data.email}`;
        }
      }).catch(() => {});
  } else {
    if (activeBox) activeBox.style.display = "none";
    if (inactiveBox) inactiveBox.style.display = "flex";
  }
}

// Fetch and render timeline
async function fetchTimeline() {
  if (!isDaemonOnline) return;
  
  try {
    const response = await fetch(`${DAEMON_URL}/timeline?limit=25`);
    if (response.ok) {
      const data = await response.json();
      const events = data.timeline || [];
      const listEl = document.getElementById("timeline-list");
      const placeholderEl = document.getElementById("timeline-placeholder");
      
      if (events.length > 0) {
        if (placeholderEl) placeholderEl.style.display = "none";
        
        // Remove existing items except placeholder
        const cardEls = listEl.querySelectorAll(".timeline-card");
        cardEls.forEach(el => el.remove());
        
        events.forEach(event => {
          const card = document.createElement("div");
          card.className = "timeline-card";
          
          const meta = document.createElement("div");
          meta.className = "timeline-meta";
          
          const time = new Date(event.timestamp).toLocaleString();
          const app = event.source_app.toUpperCase().replace("_", " ");
          const type = event.event_type.replace("ai_", "").toUpperCase();
          
          meta.innerHTML = `
            <span>${time} &bull; <strong>${app}</strong></span>
            <span class="timeline-badge">${type}</span>
          `;
          
          const content = document.createElement("div");
          content.className = "timeline-content";
          content.textContent = event.content;
          
          card.appendChild(meta);
          card.appendChild(content);
          listEl.appendChild(card);
        });

        // Update stats
        document.getElementById("stats-event-count").textContent = events.length;
        document.getElementById("stats-disk-size").textContent = `${Math.round(events.length * 1.5)} KB`;
      } else {
        if (placeholderEl) placeholderEl.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Failed to load timeline:", error);
  }
}

// Activate License
async function activateLicense() {
  const input = document.getElementById("license-input");
  const key = input.value.trim();
  if (!key) return;

  try {
    const response = await fetch(`${DAEMON_URL}/license/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key })
    });

    if (response.ok) {
      alert("License activated successfully! Pro features unlocked.");
      input.value = "";
      await checkDaemonHealth();
    } else {
      const err = await response.json();
      alert(`Activation failed: ${err.detail || "Invalid key"}`);
    }
  } catch (error) {
    alert("Daemon is currently offline. Please start it and try again.");
  }
}

// Deactivate License
async function deactivateLicense() {
  try {
    const response = await fetch(`${DAEMON_URL}/license/deactivate`, { method: "POST" });
    if (response.ok) {
      alert("License deactivated successfully.");
      await checkDaemonHealth();
    }
  } catch (error) {
    alert("Failed to deactivate.");
  }
}

// Search
async function performSearch() {
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  try {
    const response = await fetch(`${DAEMON_URL}/retrieve/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query, limit: 5 })
    });

    if (response.ok) {
      const data = await response.json();
      const results = data.results || [];
      const resultsEl = document.getElementById("search-results");
      resultsEl.innerHTML = "";

      if (results.length === 0) {
        resultsEl.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No matching context found.</p>`;
        return;
      }

      results.forEach(res => {
        const card = document.createElement("div");
        card.className = "timeline-card";
        card.style.borderLeftColor = "var(--accent-cyan)";
        
        const meta = document.createElement("div");
        meta.className = "timeline-meta";
        meta.innerHTML = `
          <span>Score: <strong>${(res.score || 0.0).toFixed(2)}</strong> &bull; <strong>${res.event.source_app.toUpperCase()}</strong></span>
          <span class="timeline-badge">${res.event.event_type.replace("ai_", "").toUpperCase()}</span>
        `;
        
        const content = document.createElement("div");
        content.className = "timeline-content";
        content.textContent = res.event.content;

        card.appendChild(meta);
        card.appendChild(content);
        resultsEl.appendChild(card);
      });
    } else {
      const err = await response.json();
      alert(`Search error: ${err.detail || "Search failed."}`);
    }
  } catch (error) {
    alert("Error performing semantic search.");
  }
}

// Vault Segment Helper Functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString();
  } catch (e) {
    return isoString;
  }
}

async function fetchVaultSegments() {
  if (!isDaemonOnline) return;
  try {
    const response = await fetch(`${DAEMON_URL}/vault/default_vault/segments`);
    if (response.ok) {
      const segments = await response.json();
      const tbody = document.getElementById("vault-segments-list");
      tbody.innerHTML = "";
      
      if (segments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No segments found.</td></tr>`;
        return;
      }
      
      segments.forEach(seg => {
        const tr = document.createElement("tr");
        
        const actionsTd = document.createElement("td");
        
        const btnPreview = document.createElement("button");
        btnPreview.className = "btn btn-secondary";
        btnPreview.style.padding = "4px 10px";
        btnPreview.style.fontSize = "11px";
        btnPreview.textContent = "Preview Decrypted";
        btnPreview.onclick = () => previewSegment(seg.index, seg.file_name);
        
        const btnDownload = document.createElement("button");
        btnDownload.className = "btn btn-primary";
        btnDownload.style.padding = "4px 10px";
        btnDownload.style.fontSize = "11px";
        btnDownload.style.marginLeft = "6px";
        btnDownload.textContent = "Download Decrypted";
        btnDownload.onclick = () => downloadSegment(seg.index, seg.file_name);
        
        actionsTd.appendChild(btnPreview);
        actionsTd.appendChild(btnDownload);
        
        tr.innerHTML = `
          <td style="font-weight: bold; color: var(--accent-cyan);">${seg.index}</td>
          <td style="font-family: monospace; color: var(--text-primary);">${seg.file_name}</td>
          <td>${formatBytes(seg.size_bytes)}</td>
          <td>${formatDate(seg.last_modified)}</td>
        `;
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
      });
    }
  } catch (error) {
    console.error("Failed to load vault segments:", error);
  }
}

async function previewSegment(index, filename) {
  if (!isDaemonOnline) return;
  try {
    const response = await fetch(`${DAEMON_URL}/vault/default_vault/segments/${index}/decrypt`);
    if (response.ok) {
      const data = await response.json();
      currentPreviewIndex = index;
      currentPreviewFileName = filename;
      currentDecryptedData = data;
      
      const panel = document.getElementById("segment-preview-panel");
      const title = document.getElementById("segment-preview-title");
      const codeEl = document.getElementById("segment-preview-code");
      
      title.textContent = `Decrypted Preview: ${filename} (Segment #${index})`;
      codeEl.textContent = JSON.stringify(data, null, 2);
      panel.style.display = "flex";
      panel.scrollIntoView({ behavior: 'smooth' });
    } else {
      const err = await response.json();
      alert(`Failed to decrypt segment: ${err.detail || "Error"}`);
    }
  } catch (error) {
    alert("Error fetching decrypted segment data.");
  }
}

function downloadDecryptedJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  const exportName = filename.replace(".enc", "_decrypted.json");
  a.download = exportName;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadSegment(index, filename) {
  if (!isDaemonOnline) return;
  try {
    const response = await fetch(`${DAEMON_URL}/vault/default_vault/segments/${index}/decrypt`);
    if (response.ok) {
      const data = await response.json();
      downloadDecryptedJSON(data, filename);
    } else {
      const err = await response.json();
      alert(`Failed to decrypt segment for download: ${err.detail || "Error"}`);
    }
  } catch (error) {
    alert("Error downloading decrypted segment data.");
  }
}

function copyPreviewToClipboard() {
  if (!currentDecryptedData) return;
  const text = JSON.stringify(currentDecryptedData, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    alert("JSON copied to clipboard!");
  }).catch(() => {
    alert("Failed to copy JSON.");
  });
}

function downloadCurrentPreview() {
  if (!currentDecryptedData || currentPreviewIndex === null) return;
  downloadDecryptedJSON(currentDecryptedData, currentPreviewFileName);
}

// Daemon execution log management
async function fetchDaemonLogs() {
  if (!isDaemonOnline) {
    document.getElementById("daemon-logs-box").textContent = "Daemon is currently offline. Logs cannot be fetched.";
    return;
  }
  try {
    const response = await fetch(`${DAEMON_URL}/daemon/logs?limit=250`);
    if (response.ok) {
      const data = await response.json();
      document.getElementById("daemon-logs-box").textContent = data.logs;
      
      // Auto scroll to bottom of logs
      const box = document.getElementById("daemon-logs-box");
      box.scrollTop = box.scrollHeight;
    } else {
      document.getElementById("daemon-logs-box").textContent = "Failed to fetch logs from daemon.";
    }
  } catch (error) {
    document.getElementById("daemon-logs-box").textContent = "Failed to communicate with daemon to fetch logs.";
  }
}

async function clearDaemonLogs() {
  if (!isDaemonOnline) return;
  if (!confirm("Are you sure you want to clear the daemon execution logs?")) return;
  try {
    const response = await fetch(`${DAEMON_URL}/daemon/logs`, { method: "DELETE" });
    if (response.ok) {
      alert("Logs cleared successfully.");
      await fetchDaemonLogs();
    }
  } catch (error) {
    alert("Error clearing logs.");
  }
}

// Onboarding Flow
function checkOnboarding() {
  const hasOnboarded = localStorage.getItem("vexctx_onboarded");
  if (!hasOnboarded) {
    showView("onboarding-view");
    // Hide sidebar links
    document.querySelector(".sidebar").style.display = "none";
  } else {
    document.querySelector(".sidebar").style.display = "flex";
    showView("timeline-view");
    fetchTimeline();
  }
}

async function finishOnboarding() {
  localStorage.setItem("vexctx_onboarded", "true");
  
  // Set data retention selection
  const retention = parseInt(document.getElementById("onboard-retention").value, 10);
  const osLogging = document.getElementById("onboard-os-logging").checked;
  
  const prefs = {
    os_logging_enabled: osLogging,
    onboarded: true,
    retention_days: retention
  };
  
  await savePreferences(prefs);
  
  document.querySelector(".sidebar").style.display = "flex";
  showView("timeline-view");
  fetchTimeline();
}

async function fetchPreferences() {
  if (!isDaemonOnline) return;
  try {
    const response = await fetch(`${DAEMON_URL}/preferences`);
    if (response.ok) {
      currentPreferences = await response.json();
      updateOSLoggingUI();
    }
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
  }
}

async function savePreferences(prefs) {
  if (!isDaemonOnline) return;
  try {
    const response = await fetch(`${DAEMON_URL}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs)
    });
    if (response.ok) {
      currentPreferences = prefs;
      updateOSLoggingUI();
    }
  } catch (error) {
    console.error("Failed to save preferences:", error);
  }
}

function updateOSLoggingUI() {
  const enabled = currentPreferences.os_logging_enabled;
  const badge = document.getElementById("os-logging-badge");
  const btn = document.getElementById("btn-toggle-os-logging");
  
  if (badge && btn) {
    if (enabled) {
      badge.textContent = "ACTIVE";
      badge.style.background = "rgba(16, 185, 129, 0.1)";
      badge.style.borderColor = "rgba(16, 185, 129, 0.2)";
      badge.style.color = "var(--accent-green)";
      btn.textContent = "Disable Logging";
      
      const activeColor = "var(--accent-green)";
      document.getElementById("status-zsh").style.background = activeColor;
      document.getElementById("status-window").style.background = activeColor;
      document.getElementById("status-claude").style.background = activeColor;
      document.getElementById("status-copilot").style.background = activeColor;
      document.getElementById("status-antigravity").style.background = activeColor;
    } else {
      badge.textContent = "DISABLED";
      badge.style.background = "rgba(239, 68, 68, 0.1)";
      badge.style.borderColor = "rgba(239, 68, 68, 0.2)";
      badge.style.color = "var(--accent-red)";
      btn.textContent = "Enable Logging";
      
      const inactiveColor = "#6b7280";
      document.getElementById("status-zsh").style.background = inactiveColor;
      document.getElementById("status-window").style.background = inactiveColor;
      document.getElementById("status-claude").style.background = inactiveColor;
      document.getElementById("status-copilot").style.background = inactiveColor;
      document.getElementById("status-antigravity").style.background = inactiveColor;
    }
  }
  
  const retentionSelect = document.getElementById("config-retention");
  if (retentionSelect) {
    retentionSelect.value = currentPreferences.retention_days;
  }
}

async function toggleOSLogging() {
  const updated = {
    ...currentPreferences,
    os_logging_enabled: !currentPreferences.os_logging_enabled
  };
  await savePreferences(updated);
}

// Structured Tree Explorer Functions
let currentSessionData = null;
let currentSessionId = "";

async function fetchStructuredTree() {
  if (!isDaemonOnline) return;
  const treeContainer = document.getElementById("vault-structured-tree");
  if (!treeContainer) return;
  
  treeContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 20px;">Loading tree...</p>`;
  
  try {
    const response = await fetch(`${DAEMON_URL}/vault/default_vault/categorized`);
    if (response.ok) {
      const data = await response.json();
      renderStructuredTree(data);
    } else {
      treeContainer.innerHTML = `<p style="color: var(--accent-red); font-size: 12px; text-align: center; margin-top: 20px;">Failed to load vault structure.</p>`;
    }
  } catch (error) {
    treeContainer.innerHTML = `<p style="color: var(--accent-red); font-size: 12px; text-align: center; margin-top: 20px;">Error communicating with daemon.</p>`;
  }
}

function renderStructuredTree(data) {
  const treeContainer = document.getElementById("vault-structured-tree");
  if (!treeContainer) return;
  treeContainer.innerHTML = "";
  
  const devTools = data.developer_tools || {};
  const globalAct = data.global_activity || {};
  
  let hasContent = false;

  // 1. Create Developer Tools Folder
  if (Object.keys(devTools).length > 0) {
    hasContent = true;
    const devToolsNode = createFolderNode("Developer Tools", true);
    const devToolsChildren = devToolsNode.querySelector(".tree-children");
    
    for (const [app, projects] of Object.entries(devTools)) {
      const appNameClean = app.toUpperCase().replace("_", " ");
      const appNode = createFolderNode(appNameClean, false);
      const appChildren = appNode.querySelector(".tree-children");
      
      for (const [project, sessions] of Object.entries(projects)) {
        const projNameClean = `project_${project}`;
        const projNode = createFolderNode(projNameClean, false);
        const projChildren = projNode.querySelector(".tree-children");
        
        for (const [sessionId, events] of Object.entries(sessions)) {
          const sessNode = createFileNode(`session_${sessionId.substring(0, 8)}`, () => {
            selectSession(sessionId, events, appNameClean);
          });
          projChildren.appendChild(sessNode);
        }
        appChildren.appendChild(projNode);
      }
      devToolsChildren.appendChild(appNode);
    }
    devToolsNode.style.marginBottom = "8px";
    treeContainer.appendChild(devToolsNode);
  }
  
  // 2. Create Global Activity Folder
  const hasTerminal = globalAct.terminal_history && globalAct.terminal_history.length > 0;
  const hasOS = globalAct.os_activity && globalAct.os_activity.length > 0;
  const hasOther = globalAct.other_activity && globalAct.other_activity.length > 0;
  
  if (hasTerminal || hasOS || hasOther) {
    hasContent = true;
    const globalNode = createFolderNode("Global Activity", true);
    const globalChildren = globalNode.querySelector(".tree-children");
    
    if (hasTerminal) {
      const termNode = createFileNode("terminal_history.json", () => {
        selectGlobalActivity("Terminal History", globalAct.terminal_history, "terminal_history.json");
      });
      globalChildren.appendChild(termNode);
    }
    
    if (hasOS) {
      const osNode = createFileNode("os_activity.json", () => {
        selectGlobalActivity("OS Activity Logs", globalAct.os_activity, "os_activity.json");
      });
      globalChildren.appendChild(osNode);
    }
    
    if (hasOther) {
      const otherNode = createFileNode("other_activity.json", () => {
        selectGlobalActivity("Other Logs", globalAct.other_activity, "other_activity.json");
      });
      globalChildren.appendChild(otherNode);
    }
    
    treeContainer.appendChild(globalNode);
  }

  if (!hasContent) {
    treeContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 20px;">No structured log history found.</p>`;
  }
}

function createFolderNode(name, isExpandedDefault) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "2px";
  
  const header = document.createElement("div");
  header.className = "tree-node-app";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "6px";
  
  const chevron = document.createElement("span");
  chevron.innerHTML = isExpandedDefault ? "&#9660;" : "&#9654;";
  chevron.style.fontSize = "10px";
  chevron.style.width = "10px";
  chevron.style.color = "var(--text-muted)";
  
  const icon = document.createElement("span");
  icon.innerHTML = "&#128193;"; // 📁
  icon.style.fontSize = "14px";
  
  const text = document.createElement("span");
  text.textContent = name;
  
  header.appendChild(chevron);
  header.appendChild(icon);
  header.appendChild(text);
  
  const childrenContainer = document.createElement("div");
  childrenContainer.className = "tree-children";
  childrenContainer.style.display = isExpandedDefault ? "flex" : "none";
  childrenContainer.style.marginLeft = "12px";
  childrenContainer.style.borderLeft = "1px solid var(--border-muted)";
  childrenContainer.style.paddingLeft = "8px";
  
  header.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = childrenContainer.style.display === "flex";
    childrenContainer.style.display = isExpanded ? "none" : "flex";
    chevron.innerHTML = isExpanded ? "&#9654;" : "&#9660;";
  });
  
  container.appendChild(header);
  container.appendChild(childrenContainer);
  return container;
}

function createFileNode(name, onClick) {
  const fileNode = document.createElement("div");
  fileNode.className = "tree-node-sess";
  fileNode.style.display = "flex";
  fileNode.style.alignItems = "center";
  fileNode.style.gap = "6px";
  
  const icon = document.createElement("span");
  icon.innerHTML = "&#128196;"; // 📄
  icon.style.fontSize = "13px";
  
  const text = document.createElement("span");
  text.textContent = name;
  
  fileNode.appendChild(icon);
  fileNode.appendChild(text);
  
  fileNode.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".tree-node-sess").forEach(el => el.classList.remove("active"));
    fileNode.classList.add("active");
    onClick();
  });
  
  return fileNode;
}

function selectSession(sessionId, events, appName) {
  currentSessionData = events;
  currentSessionId = `session_${sessionId}.json`;
  
  const headerEl = document.getElementById("structured-detail-header");
  const titleEl = document.getElementById("structured-session-title");
  const metaEl = document.getElementById("structured-session-meta");
  const detailEl = document.getElementById("vault-structured-detail");
  const placeholderEl = document.getElementById("detail-placeholder");
  
  if (placeholderEl) placeholderEl.style.display = "none";
  if (headerEl) headerEl.style.display = "flex";
  
  titleEl.textContent = `Session: ${sessionId}`;
  
  const turnsCount = events.length;
  let formattedTime = "Unknown date";
  if (events.length > 0) {
    formattedTime = new Date(events[0].timestamp).toLocaleString();
  }
  metaEl.textContent = `${appName} | ${turnsCount} turn(s) | Started: ${formattedTime}`;
  
  detailEl.innerHTML = "";
  
  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  sortedEvents.forEach(ev => {
    const turnCard = document.createElement("div");
    const isPrompt = ev.event_type === "ai_prompt";
    turnCard.className = `chat-turn ${isPrompt ? 'prompt' : 'response'}`;
    
    const turnHeader = document.createElement("div");
    turnHeader.style.display = "flex";
    turnHeader.style.alignItems = "center";
    turnHeader.style.gap = "10px";
    
    const roleEl = document.createElement("span");
    roleEl.className = `chat-turn-role ${isPrompt ? 'prompt' : 'response'}`;
    roleEl.textContent = isPrompt ? "User Prompt" : "Assistant Response";
    
    const timeEl = document.createElement("span");
    timeEl.className = "chat-turn-time";
    timeEl.textContent = new Date(ev.timestamp).toLocaleTimeString();
    
    turnHeader.appendChild(roleEl);
    turnHeader.appendChild(timeEl);
    
    const contentEl = document.createElement("div");
    contentEl.className = "chat-turn-content";
    contentEl.textContent = ev.content;
    
    turnCard.appendChild(turnHeader);
    turnCard.appendChild(contentEl);
    detailEl.appendChild(turnCard);
  });
}

function selectGlobalActivity(title, events, fileName) {
  currentSessionData = events;
  currentSessionId = fileName;
  
  const headerEl = document.getElementById("structured-detail-header");
  const titleEl = document.getElementById("structured-session-title");
  const metaEl = document.getElementById("structured-session-meta");
  const detailEl = document.getElementById("vault-structured-detail");
  const placeholderEl = document.getElementById("detail-placeholder");
  
  if (placeholderEl) placeholderEl.style.display = "none";
  if (headerEl) headerEl.style.display = "flex";
  
  titleEl.textContent = title;
  metaEl.textContent = `Global Activity | ${events.length} event(s)`;
  
  detailEl.innerHTML = "";
  
  events.forEach(ev => {
    const itemCard = document.createElement("div");
    itemCard.className = "chat-turn response";
    itemCard.style.borderLeft = "3px solid var(--accent-purple)";
    
    const itemHeader = document.createElement("div");
    itemHeader.style.display = "flex";
    itemHeader.style.alignItems = "center";
    itemHeader.style.gap = "10px";
    
    const sourceEl = document.createElement("span");
    sourceEl.className = "chat-turn-role response";
    sourceEl.style.color = "var(--accent-purple)";
    sourceEl.textContent = ev.source_app.toUpperCase();
    
    const timeEl = document.createElement("span");
    timeEl.className = "chat-turn-time";
    timeEl.textContent = new Date(ev.timestamp).toLocaleString();
    
    itemHeader.appendChild(sourceEl);
    itemHeader.appendChild(timeEl);
    
    const contentEl = document.createElement("div");
    contentEl.className = "chat-turn-content";
    contentEl.textContent = ev.content;
    
    itemCard.appendChild(itemHeader);
    itemCard.appendChild(contentEl);
    detailEl.appendChild(itemCard);
  });
}

function downloadCategorizedZIP() {
  if (!isDaemonOnline) return;
  const a = document.createElement("a");
  a.href = `${DAEMON_URL}/vault/default_vault/export/zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadSessionJSON() {
  if (!currentSessionData || !currentSessionId) return;
  const jsonString = JSON.stringify(currentSessionData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentSessionId;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initial Events wiring
window.addEventListener("DOMContentLoaded", () => {
  // Check Daemon immediately and poll
  function pollDaemon() {
    checkDaemonHealth().finally(() => {
      setTimeout(pollDaemon, isDaemonOnline ? 5000 : 1000);
    });
  }
  pollDaemon();

  // Check onboarding state
  checkOnboarding();

  // Navigation click routing
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      const view = e.currentTarget.getAttribute("data-view");
      showView(view);
      if (view === "timeline-view") {
        fetchTimeline();
      } else if (view === "vault-files-view") {
        // Default to Structured tab
        const tabStructured = document.getElementById("tab-structured");
        if (tabStructured && tabStructured.classList.contains("active")) {
          fetchStructuredTree();
        } else {
          fetchVaultSegments();
        }
      } else if (view === "license-view") {
        fetchDaemonLogs();
      }
    });
  });

  // Subnav Explorer tab wiring
  const tabStructured = document.getElementById("tab-structured");
  const tabRaw = document.getElementById("tab-raw");
  const subviewStructured = document.getElementById("subview-structured");
  const subviewRaw = document.getElementById("subview-raw");

  if (tabStructured && tabRaw) {
    tabStructured.addEventListener("click", () => {
      tabStructured.classList.add("active");
      tabRaw.classList.remove("active");
      subviewStructured.style.display = "block";
      subviewRaw.style.display = "none";
      fetchStructuredTree();
    });

    tabRaw.addEventListener("click", () => {
      tabRaw.classList.add("active");
      tabStructured.classList.remove("active");
      subviewRaw.style.display = "block";
      subviewStructured.style.display = "none";
      fetchVaultSegments();
    });
  }

  // Buttons
  document.getElementById("btn-refresh-timeline").addEventListener("click", fetchTimeline);
  document.getElementById("btn-license-activate").addEventListener("click", activateLicense);
  document.getElementById("btn-license-deactivate").addEventListener("click", deactivateLicense);
  document.getElementById("btn-search").addEventListener("click", performSearch);
  document.getElementById("btn-onboard-finish").addEventListener("click", finishOnboarding);
  document.getElementById("btn-copy-preview").addEventListener("click", copyPreviewToClipboard);
  document.getElementById("btn-download-preview").addEventListener("click", downloadCurrentPreview);
  document.getElementById("btn-refresh-logs").addEventListener("click", fetchDaemonLogs);
  document.getElementById("btn-clear-logs").addEventListener("click", clearDaemonLogs);
  document.getElementById("btn-toggle-os-logging").addEventListener("click", toggleOSLogging);
  
  // Structured view buttons
  document.getElementById("btn-export-zip").addEventListener("click", downloadCategorizedZIP);
  document.getElementById("btn-download-session").addEventListener("click", downloadSessionJSON);
  
  document.getElementById("config-retention").addEventListener("change", async (e) => {
    const updated = {
      ...currentPreferences,
      retention_days: parseInt(e.target.value, 10)
    };
    await savePreferences(updated);
  });
  
  // Enter keys
  document.getElementById("search-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });
  document.getElementById("license-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") activateLicense();
  });

  // ── Auto-Updater UI ────────────────────────────────────────────────────
  const updateBanner      = document.getElementById("update-banner");
  const updateVersionLabel = document.getElementById("update-version-label");
  const updateNotesLabel  = document.getElementById("update-notes-label");
  const updateCheckStatus = document.getElementById("update-check-status");

  function showUpdateBanner(version, notes) {
    updateVersionLabel.textContent = version || "";
    updateNotesLabel.textContent   = notes  || "";
    updateBanner.style.display     = "flex";
    if (updateCheckStatus) {
      updateCheckStatus.textContent = `✅ VexCTX ${version} is available.`;
      updateCheckStatus.style.color = "var(--accent-cyan)";
    }
  }

  // Check for updates function using Tauri Rust commands
  async function runUpdateCheck(manual = false) {
    if (!window.__TAURI__?.core) {
      if (manual && updateCheckStatus) {
        updateCheckStatus.textContent = "Updater not supported in browser dev mode.";
        updateCheckStatus.style.color = "var(--accent-cyan)";
      }
      return;
    }
    try {
      if (updateCheckStatus) {
        updateCheckStatus.textContent = "Checking for updates…";
        updateCheckStatus.style.color = "var(--text-secondary)";
      }
      const update = await window.__TAURI__.core.invoke("check_for_updates");
      if (update) {
        showUpdateBanner(update.version, update.notes);
      } else {
        if (updateCheckStatus) {
          updateCheckStatus.textContent = "✓ VexCTX is up to date.";
          updateCheckStatus.style.color = "var(--accent-green)";
        }
      }
    } catch (err) {
      console.error("Update check failed:", err);
      if (updateCheckStatus) {
        updateCheckStatus.textContent = "Update check failed or network offline.";
        updateCheckStatus.style.color = "var(--accent-cyan)";
      }
    }
  }

  // Listen for update-available event emitted by the Rust backend on startup
  if (window.__TAURI__?.event) {
    window.__TAURI__.event.listen("update-available", (event) => {
      const { version, notes } = event.payload || {};
      showUpdateBanner(version, notes);
    });

    window.__TAURI__.event.listen("update-not-available", () => {
      if (updateCheckStatus) {
        updateCheckStatus.textContent = "✓ VexCTX is up to date.";
        updateCheckStatus.style.color = "var(--accent-green)";
      }
    });

    // Triggered by tray "Check for Updates" menu item
    window.__TAURI__.event.listen("manual-update-check", () => {
      const tabConfig = document.getElementById("tab-config");
      if (tabConfig) tabConfig.click();
      runUpdateCheck(true);
    });
  }

  // Manual check button (in License & Config panel)
  const btnManualCheck = document.getElementById("btn-manual-update-check");
  if (btnManualCheck) {
    btnManualCheck.addEventListener("click", () => {
      runUpdateCheck(true);
    });
  }

  // Install & Restart button
  const btnUpdateInstall = document.getElementById("btn-update-install");
  if (btnUpdateInstall) {
    btnUpdateInstall.addEventListener("click", async () => {
      btnUpdateInstall.textContent = "Installing…";
      btnUpdateInstall.disabled = true;
      try {
        if (window.__TAURI__?.core) {
          await window.__TAURI__.core.invoke("install_update");
        }
      } catch (err) {
        btnUpdateInstall.textContent = "Error — retry";
        btnUpdateInstall.disabled = false;
        console.error("Update install failed:", err);
        alert("Failed to install update: " + err);
      }
    });
  }

  // Dismiss banner
  const btnUpdateDismiss = document.getElementById("btn-update-dismiss");
  if (btnUpdateDismiss) {
    btnUpdateDismiss.addEventListener("click", () => {
      updateBanner.style.display = "none";
    });
  }
});

