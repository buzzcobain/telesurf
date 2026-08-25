const urlForm = document.getElementById('url-form');
const urlInput = document.getElementById('url-input');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const refreshBtn = document.getElementById('refresh-btn');
const homeBtn = document.getElementById('home-btn');
const favBtn = document.getElementById('fav-btn');
const favouritesBar = document.getElementById('favourites-bar');
const tabBar = document.getElementById('tab-bar');
const newTabBtn = document.getElementById('new-tab-btn');

let favourites = JSON.parse(localStorage.getItem('tui-favourites') || '[]');
let tabs = new Map(); // id -> { id, title, url }
let activeTabId = null;

// --- Favourites Logic ---
function renderFavourites() {
  favouritesBar.innerHTML = '';
  favourites.forEach((fav, index) => {
    const el = document.createElement('span');
    el.className = 'fav-item';
    el.textContent = fav.title || fav.url;
    el.title = fav.url;
    
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      favourites.splice(index, 1);
      localStorage.setItem('tui-favourites', JSON.stringify(favourites));
      renderFavourites();
    });

    el.addEventListener('click', () => {
      window.electronAPI.navigate(fav.url);
    });
    favouritesBar.appendChild(el);
  });
}

favBtn.addEventListener('click', async () => {
  const currentUrl = await window.electronAPI.getCurrentUrl();
  if (!currentUrl || currentUrl === 'about:blank' || currentUrl.startsWith('file://')) return;
  
  let title = currentUrl;
  try { title = new URL(currentUrl).hostname; } catch(e) {}
  
  const titleInput = prompt("Enter a name for this favourite:", title);
  if (titleInput !== null) {
    favourites.push({ url: currentUrl, title: titleInput });
    localStorage.setItem('tui-favourites', JSON.stringify(favourites));
    renderFavourites();
  }
});

renderFavourites();

// --- Navigation Logic ---
urlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (url) window.electronAPI.navigate(url);
});

backBtn.addEventListener('click', () => window.electronAPI.goBack());
forwardBtn.addEventListener('click', () => window.electronAPI.goForward());
refreshBtn.addEventListener('click', () => window.electronAPI.refresh());
homeBtn.addEventListener('click', () => window.electronAPI.goHome());

window.electronAPI.onUrlUpdated((url) => {
  if (url.startsWith('file://')) {
    urlInput.value = 'tui://readme';
  } else {
    urlInput.value = url;
  }
});

window.electronAPI.onFocusAddressBar(() => {
  urlInput.focus();
  urlInput.select();
});

// --- Tab Logic ---

function renderTabs() {
  // Remove existing tabs but keep the new tab button
  const existingTabs = tabBar.querySelectorAll('.tab');
  existingTabs.forEach(t => t.remove());

  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab';
    if (tab.id === activeTabId) el.classList.add('active');
    
    // Display short title
    let displayTitle = tab.title || tab.url || 'New Tab';
    if (displayTitle.length > 15) displayTitle = displayTitle.substring(0, 15) + '...';
    if (displayTitle.startsWith('file://')) displayTitle = 'Readme';

    const textSpan = document.createElement('span');
    textSpan.textContent = displayTitle;
    el.appendChild(textSpan);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = 'x';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.electronAPI.closeTab(tab.id);
    });
    el.appendChild(closeBtn);

    el.addEventListener('click', () => {
      window.electronAPI.switchTab(tab.id);
    });

    tabBar.insertBefore(el, newTabBtn);
  });
}

newTabBtn.addEventListener('click', () => {
  window.electronAPI.newTab();
});

window.electronAPI.onTabUpdated((tabData) => {
  tabs.set(tabData.id, tabData);
  renderTabs();
});

window.electronAPI.onActiveTabChanged((tabId) => {
  activeTabId = tabId;
  renderTabs();
});

window.electronAPI.onTabClosed((tabId) => {
  tabs.delete(tabId);
  renderTabs();
});

// --- Settings & Themes Logic ---
const settingsBtn = document.getElementById('settings-btn');
let currentTheme = localStorage.getItem('tui-theme') || 'ceefax';

function applyThemeLocally(themeName) {
  document.documentElement.className = '';
  if (themeName !== 'ceefax') {
    document.documentElement.classList.add(`theme-${themeName}`);
  }
}

settingsBtn.addEventListener('click', () => {
  window.electronAPI.showSettingsMenu();
});

window.electronAPI.onThemeChanged((theme) => {
  currentTheme = theme;
  localStorage.setItem('tui-theme', theme);
  applyThemeLocally(theme);
});

// Apply on load
applyThemeLocally(currentTheme);
window.electronAPI.setTheme(currentTheme);
