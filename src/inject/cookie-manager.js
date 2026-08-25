// cookie-manager.js - Injected into every page to auto-click cookie banners
(function() {
  if (window._telesurfCookieManager) return;
  window._telesurfCookieManager = true;

  // The main process will replace this placeholder
  const pref = '__COOKIE_PREF__'; // 'accept' or 'decline'

  const acceptTerms = ['accept all', 'allow all', 'accept cookies', 'allow cookies', 'agree', 'got it', 'ok'];
  const declineTerms = ['reject all', 'decline all', 'reject cookies', 'decline cookies', 'refuse', 'deny'];

  const targetTerms = pref === 'accept' ? acceptTerms : declineTerms;
  const fallbackTerms = pref === 'accept' ? ['accept'] : ['reject', 'decline'];

  function clickCookieButtons() {
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    for (const btn of buttons) {
      // Check if it's likely a cookie banner button based on text
      const text = (btn.innerText || btn.value || '').toLowerCase().trim();
      
      // Match exact or very close phrases
      const isMatch = targetTerms.some(term => text === term) || 
                      targetTerms.some(term => text.includes(term)) ||
                      (text.length < 15 && fallbackTerms.some(term => text.includes(term)));
      
      if (isMatch) {
        // Look up the tree to see if it's likely a cookie banner
        let isBanner = false;
        let parent = btn.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const parentText = (parent.innerText || '').toLowerCase();
          const parentClasses = (parent.className || '').toString().toLowerCase();
          const parentId = (parent.id || '').toLowerCase();
          
          if (parentText.includes('cookie') || parentText.includes('privacy') || parentText.includes('gdpr') ||
              parentClasses.includes('cookie') || parentClasses.includes('consent') || parentId.includes('cookie')) {
            isBanner = true;
            break;
          }
          parent = parent.parentElement;
        }

        if (isBanner) {
          try {
            btn.click();
            return true; // Stop after clicking one
          } catch(e) {}
        }
      }
    }
    return false;
  }

  // Attempt to click immediately
  if (!clickCookieButtons()) {
    // Or wait for it to pop up (mutation observer)
    const observer = new MutationObserver(() => {
      if (clickCookieButtons()) {
        observer.disconnect(); // Stop observing once we've clicked it
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    
    // Safety timeout to stop observing after 10 seconds to save CPU
    setTimeout(() => observer.disconnect(), 10000);
  }
})();
