// Background script for Design System Extractor
let extractorActive = false;
let activeTabId = null;
// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleExtractor') {
    extractorActive = message.value;
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        activeTabId = tabs[0].id;
        try {
          // Notify content script about the extractor state
          await chrome.tabs.sendMessage(activeTabId, { 
            action: 'extractorStateChanged', 
            value: extractorActive 
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error sending message to content script:', error);
          // If content script is not loaded yet, inject it
          if (error.message.includes('Could not establish connection')) {
            await chrome.scripting.executeScript({
              target: { tabId: activeTabId },
              files: ['content.js']
            });
            // Try sending the message again
            await chrome.tabs.sendMessage(activeTabId, { 
              action: 'extractorStateChanged', 
              value: extractorActive 
            });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: error.message });
          }
        }
      }
    });
    return true; // Keep the message channel open for async response
  }
  // Handle extracted element data from content script
  if (message.action === 'elementExtracted') {
    // Store the extracted data in storage for the popup
    chrome.storage.local.get(['extractionHistory'], ({ extractionHistory = [] }) => {
      const entry = { id: Date.now(), data: message.data };
      const updated = [entry, ...extractionHistory];
      chrome.storage.local.set({ extractedData: message.data, extractionHistory: updated.slice(0, 50) }, () => {
        console.log('Element data saved (history updated)');
      });
    });
    // Notify popup that new data is available
    chrome.runtime.sendMessage({ action: 'newDataAvailable' })
      .catch(error => {
        // This error is expected if popup is not open
        console.log('Popup not available to receive data');
      });
  }
  // Handle getting extractor state
  if (message.action === 'getExtractorState') {
    sendResponse({ active: extractorActive });
  }
  return true; // Keep the message channel open for async responses
});
// Listen for tab changes to reset state when navigating
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === 'loading') {
    // Reset extractor state when page is reloaded or navigated
    extractorActive = false;
  }
});
// Listen for tab activation changes
chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTabId = tabId;
  // Check if extractor was active and update icon state
  // Dynamically changing icons is optional; skip if the asset is missing to avoid decode errors
  chrome.action.setIcon({
    path: extractorActive ? {
      16: "icons/icon16-active.png",
      48: "icons/icon48-active.png",
      128: "icons/icon128-active.png"
    } : {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png"
    },
    tabId: activeTabId
  }).catch(() => {/* ignore decode errors */});
});
// Open the side panel whenever the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  if (chrome.sidePanel?.open) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {/* ignore */});
  }
}); 