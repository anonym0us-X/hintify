// Background script for managing extension state
chrome.runtime.onInstalled.addListener(() => {
  console.log('LeetCode AI Mentor extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically due to manifest configuration
  console.log('Extension icon clicked on tab:', tab.url);
});

// Manage storage cleanup for old hint data
const cleanupOldHintData = async () => {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const items = await chrome.storage.local.get(null);
  
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith('hints_') && value.lastUpdated < oneWeekAgo) {
      await chrome.storage.local.remove(key);
    }
  }
};

// Run cleanup once a day
setInterval(cleanupOldHintData, 24 * 60 * 60 * 1000);
cleanupOldHintData();