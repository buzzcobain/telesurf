const { app, BrowserWindow, WebContentsView, ipcMain, Menu, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

dialog.showErrorBox = function(title, content) {
  fs.writeFileSync('crash.log', `Dialog Error:\nTitle: ${title}\nContent: ${content}\n`);
  console.error(`Dialog Error:\nTitle: ${title}\nContent: ${content}`);
};

process.on('uncaughtException', (err) => {
  fs.writeFileSync('crash.log', 'Uncaught Exception: ' + err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  fs.writeFileSync('crash.log', 'Unhandled Rejection: ' + reason);
});

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

app.name = 'Google Chrome';
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('lang', 'en-US');

// We will set the clean User-Agent dynamically in whenReady()
let cleanUA = '';

const tuiCss = fs.readFileSync(path.join(__dirname, 'tui-theme.css'), 'utf-8');
const pixelatorJs = fs.readFileSync(path.join(__dirname, 'pixelator.js'), 'utf-8');
const cookieManagerJs = fs.readFileSync(path.join(__dirname, 'cookie-manager.js'), 'utf-8');

const windows = new Map(); // winId -> { window, tabs, activeTabId, tabCounter }

let currentTheme = 'ceefax';
let cookiePref = 'decline';

function applyTuiTheme(webContents) {
  webContents.insertCSS(tuiCss);
  
  const configuredCookieJs = cookieManagerJs.replace('__COOKIE_PREF__', cookiePref);

  webContents.executeJavaScript(`
    document.documentElement.className = '';
    if ('${currentTheme}' !== 'ceefax') {
      document.documentElement.classList.add('theme-${currentTheme}');
    }
    
    // Inject pixelator script
    (() => {
      if (window._telesurfPixelatorInjected) return;
      window._telesurfPixelatorInjected = true;
      try {
        ${pixelatorJs}
      } catch(e) { console.error(e); }
    })();

    // Inject cookie manager script
    (() => {
      try {
        ${configuredCookieJs}
      } catch(e) { console.error(e); }
    })();
  `).catch(() => {});
}

function createTab(winId, url = 'https://duckduckgo.com') {
  const winState = windows.get(winId);
  if (!winState) return;

  const view = new WebContentsView({
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, 
      contextIsolation: true,
      sandbox: true,
      safeDialogs: true,
      disableBlinkFeatures: 'Auxclick'
    }
  });
  
  const tabId = ++winState.tabCounter;
  view.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (line ${line})`);
    // Send to devtools if open
    if (winState.devToolsWin && !winState.devToolsWin.isDestroyed()) {
      winState.devToolsWin.webContents.send('devtools-console', { level, message, line, sourceId });
    }
  });

  // Track network requests
  view.webContents.session.webRequest.onCompleted((details) => {
    if (winState.devToolsWin && !winState.devToolsWin.isDestroyed()) {
      winState.devToolsWin.webContents.send('devtools-network', {
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        resourceType: details.resourceType
      });
    }
  });
  
  view.webContents.session.webRequest.onErrorOccurred((details) => {
    if (winState.devToolsWin && !winState.devToolsWin.isDestroyed()) {
      winState.devToolsWin.webContents.send('devtools-network', {
        url: details.url,
        method: details.method,
        error: details.error,
        resourceType: details.resourceType
      });
    }
  });

  // Context Menu
  view.webContents.on('context-menu', (event, params) => {
    const { Menu } = require('electron');
    const menu = Menu.buildFromTemplate([
      { 
        label: 'Telesurf Dev Tools', 
        click: () => {
          openDevTools(winId);
        }
      },
      { type: 'separator' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' }
    ]);
    menu.popup();
  });

  windows.get(winId).tabs.set(tabId, view);

  // Security: Intercept window.open() and target="_blank" to open in our own tab system
  // instead of spawning unstyled, unmanaged Electron popup windows.
  view.webContents.setWindowOpenHandler((details) => {
    createTab(winId, details.url);
    return { action: 'deny' };
  });
  
  view.webContents.on('did-finish-load', () => {
    applyTuiTheme(view.webContents);
    if (winState.activeTabId === tabId && winState.window && !winState.window.isDestroyed()) {
      winState.window.webContents.send('url-updated', view.webContents.getURL());
    }
  });
  
  view.webContents.on('dom-ready', () => applyTuiTheme(view.webContents));
  
  view.webContents.on('did-navigate', (event, navUrl) => {
    if (winState.activeTabId === tabId && winState.window && !winState.window.isDestroyed()) {
      winState.window.webContents.send('url-updated', navUrl);
    }
  });
  
  view.webContents.on('page-title-updated', (event, title) => {
    if (winState.window && !winState.window.isDestroyed()) {
      winState.window.webContents.send('tab-updated', { id: tabId, title, url: view.webContents.getURL() });
    }
  });

  view.webContents.setUserAgent(cleanUA);
  view.webContents.loadURL(url, { userAgent: cleanUA });
  switchTab(winId, tabId);
  return tabId;
}

function openDevTools(winId) {
  const winState = windows.get(winId);
  if (!winState) return;

  if (winState.devToolsWin && !winState.devToolsWin.isDestroyed()) {
    winState.devToolsWin.focus();
    return;
  }

  winState.devToolsWin = new BrowserWindow({
    width: 600,
    height: 800,
    title: 'TELESURF DEV TOOLS',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  winState.devToolsWin.loadFile('devtools.html');
  winState.devToolsWin.on('closed', () => {
    winState.devToolsWin = null;
  });
}

function switchTab(winId, tabId) {
  const winState = windows.get(winId);
  if (!winState || !winState.tabs.has(tabId) || winState.window.isDestroyed()) return;
  
  winState.activeTabId = tabId;
  const view = winState.tabs.get(tabId);
  
  // Detach all existing views
  for (let oldView of winState.tabs.values()) {
    try { winState.window.contentView.removeChildView(oldView); } catch(e) {}
  }
  // Attach new view
  winState.window.contentView.addChildView(view);
  
  const bounds = winState.window.getContentBounds();
  // UI is now taller to accommodate tab bar (~110px)
  view.setBounds({ x: 0, y: 110, width: bounds.width, height: bounds.height - 110 });
  
  if (winState.window && !winState.window.isDestroyed()) {
    winState.window.webContents.send('active-tab-changed', tabId);
    winState.window.webContents.send('url-updated', view.webContents.getURL());
  }
}

function closeTab(winId, tabId) {
  const winState = windows.get(winId);
  if (!winState || !winState.tabs.has(tabId)) return;
  
  const view = winState.tabs.get(tabId);
  // view.webContents.destroy(); // Optional, let garbage collector handle or force destroy
  winState.tabs.delete(tabId);
  
  if (winState.window && !winState.window.isDestroyed()) {
    winState.window.webContents.send('tab-closed', tabId);
  }

  if (winState.tabs.size === 0) {
    const artId = createTab(winId, 'file://' + path.join(__dirname, 'welcome.html'));
    switchTab(winId, artId);
  } else if (winState.activeTabId === tabId) {
    const remainingTabs = Array.from(winState.tabs.keys());
    switchTab(winId, remainingTabs[remainingTabs.length - 1]);
  }
}

function getActiveView(winId) {
  const winState = windows.get(winId);
  if (!winState) return null;
  return winState.tabs.get(winState.activeTabId);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Telesurf Browser',
    backgroundColor: '#1A1A24',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const winId = mainWindow.id;
  windows.set(winId, {
    window: mainWindow,
    tabs: new Map(),
    activeTabId: null,
    tabCounter: 0
  });

  mainWindow.on('resize', () => {
    const winState = windows.get(winId);
    if (winState && winState.activeTabId) {
      const view = winState.tabs.get(winState.activeTabId);
      const bounds = mainWindow.getContentBounds();
      view.setBounds({ x: 0, y: 110, width: bounds.width, height: bounds.height - 110 });
    }
  });

  mainWindow.on('closed', () => {
    windows.delete(winId);
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.on('did-finish-load', () => {
    let focusTabId = null;

    if (dashboardConfig.startWithReadme) {
      focusTabId = createTab(winId, 'file://' + path.join(__dirname, 'readme.html'));
    }

    if (dashboardConfig.startWithDashboard) {
      const dbId = createTab(winId, 'file://' + path.join(__dirname, 'dashboard.html'));
      focusTabId = dbId; // Dashboard takes focus
    }

    if (!dashboardConfig.startWithReadme && !dashboardConfig.startWithDashboard) {
      focusTabId = createTab(winId, 'file://' + path.join(__dirname, 'welcome.html'));
    }
    
    if (focusTabId) {
      switchTab(winId, focusTabId);
    }
  });
}

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: (item, focusedWindow) => {
            if (focusedWindow) createTab(focusedWindow.id);
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              const winState = windows.get(focusedWindow.id);
              if (winState && winState.activeTabId) {
                closeTab(focusedWindow.id, winState.activeTabId);
              }
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              const view = getActiveView(focusedWindow.id);
              if (view) view.webContents.reload();
            }
          }
        },
        {
          label: 'Focus Address Bar',
          accelerator: 'CmdOrCtrl+L',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('focus-address-bar');
            }
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  // Strip Electron traces from the native User Agent to perfectly match the internal Chrome version
  const defaultUA = session.defaultSession.getUserAgent();
  cleanUA = defaultUA.replace(/Electron\/[0-9\.]+ /g, '').replace(/tui-browser\/[0-9\.]+ /g, '');
  app.userAgentFallback = cleanUA;

  // Initialize Global Ad and Tracker Blocker
  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    try {
      blocker.enableBlockingInSession(session.defaultSession);
      console.log('🛡️ Ghostery Ad and Tracker blocker enabled globally.');
    } catch (e) {
      console.error('Could not enable Ghostery blocker (session might be destroyed):', e);
    }
  }).catch(err => {
    console.error('Failed to download Ghostery blocklists:', err);
  });

  setupMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.on('navigate', (event, input) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  if (!view) return;

  const finalUrl = require('./utils.js').parseSearchInput(input);
  view.webContents.setUserAgent(cleanUA);
  view.webContents.loadURL(finalUrl, { userAgent: cleanUA });
});

ipcMain.on('go-back', (event) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  if (view && view.webContents.canGoBack()) view.webContents.goBack();
});

ipcMain.on('go-forward', (event) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  if (view && view.webContents.canGoForward()) view.webContents.goForward();
});

ipcMain.on('refresh', (event) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  if (view) view.webContents.reload();
});

ipcMain.on('go-home', (event) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  if (view) view.webContents.loadURL(`file://${path.join(__dirname, 'dashboard.html')}`);
});

ipcMain.handle('get-current-url', (event) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  return view ? view.webContents.getURL() : '';
});

// Tab management from UI
ipcMain.on('ui-new-tab', (event) => createTab(event.sender.getOwnerBrowserWindow().id));
ipcMain.on('ui-switch-tab', (event, tabId) => switchTab(event.sender.getOwnerBrowserWindow().id, tabId));
ipcMain.on('ui-close-tab', (event, tabId) => closeTab(event.sender.getOwnerBrowserWindow().id, tabId));

ipcMain.on('set-theme', (event, theme) => {
  currentTheme = theme;
  // Notify all background WebContents across all windows
  for (const winState of windows.values()) {
    winState.tabs.forEach((view) => {
      view.webContents.executeJavaScript(`
        document.documentElement.className = '';
        if ('${theme}' !== 'ceefax') {
          document.documentElement.classList.add('theme-${theme}');
        }
      `).catch(() => {});
    });
    // Also notify the main renderer to update its local state
    winState.window.webContents.send('theme-changed', theme);
  }
});

ipcMain.on('set-cookie-pref', (event, pref) => {
  cookiePref = pref;
});

// --- Dashboard IPC Handlers ---
let dashboardConfig = { weather: true, sports: true, games: true, team: 'Arsenal', startWithDashboard: true, startWithReadme: true };
const apiService = require('./api-service.js');

ipcMain.on('set-dashboard-config', (event, config) => {
  dashboardConfig = config;
  for (const winState of windows.values()) {
    winState.tabs.forEach((view) => {
      view.webContents.send('dashboard-changed', config);
    });
  }
});

ipcMain.handle('get-dashboard-config', () => dashboardConfig);

ipcMain.handle('get-weather-data', async () => {
  let locationQuery = dashboardConfig.location;
  if (!locationQuery) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    const parts = timeZone.split('/');
    locationQuery = parts[parts.length - 1].replace(/_/g, ' ');
  }
  console.log('Fetching weather for:', locationQuery);
  const result = await apiService.fetchWeather(locationQuery);
  console.log('Weather result:', result);
  return result;
});

ipcMain.handle('get-sports-data', async (event, team) => {
  const targetTeam = team || dashboardConfig.team || 'Arsenal';
  console.log('Fetching sports for:', targetTeam);
  const result = await apiService.fetchSports(targetTeam);
  console.log('Sports result:', result);
  return result;
});
// ------------------------------

ipcMain.on('show-settings-menu', (event) => {
  const win = event.sender.getOwnerBrowserWindow();
  const settingsWin = new BrowserWindow({
    parent: win,
    modal: true,
    width: 600,
    height: 500,
    title: 'Settings',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  settingsWin.loadFile('settings.html');
});
