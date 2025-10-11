console.log('LeetCode AI Mentor content script loaded');

// Store problem data
let problemData = {
  problemSlug: null,
  problemTitle: null,
  difficulty: null,
  userCode: null
};

// Extract problem info from the page
function extractProblemInfo() {
  try {
    // Get problem slug from URL
    const url = window.location.href;
    const slugMatch = url.match(/leetcode\.com\/problems\/([^\/?]+)/);
    const problemSlug = slugMatch ? slugMatch[1] : 'unknown';
    
    // Get problem title
    let problemTitle = 'Current Problem';
    const titleElement = document.querySelector('[data-cy="question-title"]') || 
                        document.querySelector('.text-title-large');
    if (titleElement) {
      problemTitle = titleElement.textContent.trim();
    }
    
    // Get difficulty
    let difficulty = 'Unknown';
    const diffElement = document.querySelector('[diff]');
    if (diffElement) {
      difficulty = diffElement.textContent.trim();
    }
    
    // Get user code
    let userCode = '';
    const textarea = document.querySelector('textarea');
    if (textarea) {
      userCode = textarea.value;
    } else {
      // Try to find code in other editors
      const codeElements = document.querySelectorAll('[class*="code"], [class*="editor"], [class*="monaco"]');
      for (let el of codeElements) {
        if (el.textContent && el.textContent.length > 10) {
          userCode = el.textContent;
          break;
        }
      }
    }
    
    problemData = {
      problemSlug,
      problemTitle,
      difficulty,
      userCode
    };
    
    console.log('Problem data extracted:', problemData);
    
  } catch (error) {
    console.error('Error extracting problem info:', error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'getProblemInfo') {
    extractProblemInfo();
    sendResponse({
      problemSlug: problemData.problemSlug,
      problemTitle: problemData.problemTitle,
      difficulty: problemData.difficulty,
      codeLength: problemData.userCode ? problemData.userCode.length : 0,
      success: true
    });
  }
  
  else if (request.action === 'getHint') {
    extractProblemInfo();
    
    // Send request to backend
    fetch('http://localhost:3000/api/get-hint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problem_slug: problemData.problemSlug,
        user_code: problemData.userCode || '// No code yet',
        hint_level: request.hintLevel || 1,
        language: 'python'
      })
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({
        success: true,
        hint: data.hint,
        hintLevel: request.hintLevel
      });
    })
    .catch(error => {
      console.error('Error getting hint:', error);
      sendResponse({
        success: false,
        error: 'Failed to get hint: ' + error.message
      });
    });
    
    return true; // Keep message channel open for async response
  }
  
  else if (request.action === 'ping') {
    sendResponse({ status: 'alive', problemSlug: problemData.problemSlug });
  }
  
  return true; // Important: return true to indicate async response
});

// Extract info when page loads
extractProblemInfo();

// Re-extract when page changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes('/problems/')) {
      setTimeout(extractProblemInfo, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });