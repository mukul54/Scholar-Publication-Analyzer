// Background script to handle extension state and cleanup
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Clean up when navigating away from Scholar pages
  if (changeInfo.status === "loading" && tab.url) {
    const url = new URL(tab.url);

    // If navigating away from Scholar or to a different Scholar page
    if (
      !url.hostname.includes("scholar.google.") ||
      url.search.includes("view_op=view_citation")
    ) {
      // Inject cleanup script
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          func: () => {
            // Reset the global flag to allow re-injection on valid pages
            if (window.scholarAnalyzerRunning) {
              console.log("🧹 Cleaning up scholar analyzer on navigation");
              window.scholarAnalyzerRunning = false;
            }
          },
        })
        .catch(() => {
          // Ignore errors if script can't be injected
        });
    }
  }
});

// Handle extension icon state
chrome.action.onClicked.addListener((tab) => {
  // This will be handled by the popup, but we can add logging
  console.log("Extension clicked on:", tab.url);
});
