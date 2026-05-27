document.addEventListener("DOMContentLoaded", () => {
  const blacklistArea = document.getElementById("blacklist");
  const daemonUrlInput = document.getElementById("daemon-url");
  const sessionExpirySelect = document.getElementById("session-expiry");
  const saveBtn = document.getElementById("save-btn");
  const statusSpan = document.getElementById("status");

  // Load saved options
  chrome.storage.sync.get(["blacklist", "daemonUrl", "sessionExpiry"], (result) => {
    // Populate blacklist
    const blacklist = result.blacklist || ["password", "api_key", "secret"];
    blacklistArea.value = blacklist.join("\n");
    
    // Populate daemon URL
    daemonUrlInput.value = result.daemonUrl || "http://localhost:8765";
    
    // Populate session expiry
    sessionExpirySelect.value = result.sessionExpiry || "2";
  });

  // Save options
  saveBtn.addEventListener("click", () => {
    const blacklist = blacklistArea.value
      .split("\n")
      .map(item => item.trim())
      .filter(item => item.length > 0);
      
    const daemonUrl = daemonUrlInput.value.trim() || "http://localhost:8765";
    const sessionExpiry = sessionExpirySelect.value;

    chrome.storage.sync.set({
      blacklist: blacklist,
      daemonUrl: daemonUrl,
      sessionExpiry: sessionExpiry
    }, () => {
      // Show success status
      statusSpan.classList.add("show");
      
      setTimeout(() => {
        statusSpan.classList.remove("show");
      }, 2500);
      
      console.log("VexCTX: Saved settings updated.");
    });
  });
});
