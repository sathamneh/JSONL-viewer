// Background script to handle opening the viewer in a new tab

/**
 * Initialize the extension when installed or updated
 */
chrome.runtime.onInstalled.addListener((details) => {
  // Log installation details
  console.log(`JSONL Viewer extension ${details.reason}`);
  
  // Clear any previous data on fresh install
  if (details.reason === 'install') {
    chrome.storage.local.clear();
  }
});

/**
 * Open the viewer in a new tab when the extension icon is clicked
 */
chrome.action.onClicked.addListener(() => {
  const viewerURL = chrome.runtime.getURL('viewer.html');
  chrome.tabs.create({ url: viewerURL });
});

/**
 * Listen for uninstall event to clean up storage
 */
chrome.runtime.setUninstallURL('', () => {
  // Clean up storage when extension is uninstalled
  chrome.storage.local.clear();
});