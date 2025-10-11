document.addEventListener('DOMContentLoaded', function() {
  const getHintBtn = document.getElementById('get-hint-btn');
  const nextHintBtn = document.getElementById('next-hint-btn');
  const resetHintsBtn = document.getElementById('reset-hints-btn');
  const hintText = document.getElementById('hint-text');
  const hintCount = document.getElementById('hint-count');
  const problemTitle = document.getElementById('problem-title');
  const problemDifficulty = document.getElementById('problem-difficulty');
  const loading = document.getElementById('loading');

  let currentHints = [];
  let currentHintIndex = 0;
  let currentProblemSlug = '';

  // Initialize popup
  initPopup();

  async function initPopup() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url.includes('leetcode.com/problems/')) {
        showMessage('Please navigate to a LeetCode problem page.');
        disableButtons();
        return;
      }

      // Test if content script is available
      const pingResponse = await sendMessageToTab(tab.id, { action: 'ping' });
      
      if (!pingResponse) {
        showMessage('Extension not ready. Please refresh the LeetCode page.');
        disableButtons();
        return;
      }

      // Get problem info
      const problemInfo = await sendMessageToTab(tab.id, { action: 'getProblemInfo' });
      
      if (problemInfo && problemInfo.success) {
        currentProblemSlug = problemInfo.problemSlug;
        problemTitle.textContent = problemInfo.problemTitle || 'Current Problem';
        
        if (problemInfo.difficulty && problemInfo.difficulty !== 'Unknown') {
          problemDifficulty.textContent = problemInfo.difficulty;
          problemDifficulty.className = 'difficulty ' + problemInfo.difficulty.toLowerCase();
        }
        
        await loadHintState();
        updateUI();
      } else {
        showMessage('Could not load problem info.');
      }

    } catch (error) {
      console.error('Popup init error:', error);
      showMessage('Error: ' + error.message);
    }
  }

  function sendMessageToTab(tabId, message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  async function loadHintState() {
    if (!currentProblemSlug) return;
    
    const key = `hints_${currentProblemSlug}`;
    const result = await chrome.storage.local.get([key]);
    
    if (result[key]) {
      currentHints = result[key].hints || [];
      currentHintIndex = result[key].currentIndex || 0;
    }
    updateUI();
  }

  async function saveHintState() {
    if (!currentProblemSlug) return;
    
    const key = `hints_${currentProblemSlug}`;
    await chrome.storage.local.set({
      [key]: {
        hints: currentHints,
        currentIndex: currentHintIndex,
        lastUpdated: Date.now()
      }
    });
  }

  function updateUI() {
    hintCount.textContent = currentHints.length;
    
    if (currentHints.length === 0) {
      hintText.textContent = 'Click "Get Hint" for AI guidance';
      nextHintBtn.disabled = true;
    } else if (currentHintIndex < currentHints.length) {
      hintText.textContent = currentHints[currentHintIndex];
      nextHintBtn.disabled = currentHintIndex >= currentHints.length - 1;
    }
    
    getHintBtn.disabled = currentHints.length >= 3;
  }

  function showMessage(message) {
    hintText.textContent = message;
  }

  function disableButtons() {
    getHintBtn.disabled = true;
    nextHintBtn.disabled = true;
    resetHintsBtn.disabled = true;
  }

  function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
    getHintBtn.disabled = show;
  }

  // Button event listeners
  getHintBtn.addEventListener('click', async function() {
    if (currentHints.length >= 3) {
      showMessage('Maximum 3 hints per problem');
      return;
    }

    showLoading(true);
    hintText.textContent = 'Generating hint...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await sendMessageToTab(tab.id, {
        action: 'getHint',
        hintLevel: currentHints.length + 1
      });

      if (response && response.success) {
        currentHints.push(response.hint);
        currentHintIndex = currentHints.length - 1;
        await saveHintState();
        updateUI();
      } else {
        showMessage(response?.error || 'Failed to get hint');
      }
    } catch (error) {
      console.error('Get hint error:', error);
      showMessage('Error: ' + error.message);
    } finally {
      showLoading(false);
    }
  });

  nextHintBtn.addEventListener('click', function() {
    if (currentHintIndex < currentHints.length - 1) {
      currentHintIndex++;
      updateUI();
    }
  });

  resetHintsBtn.addEventListener('click', async function() {
    currentHints = [];
    currentHintIndex = 0;
    await saveHintState();
    updateUI();
  });
});