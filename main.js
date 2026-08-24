const { app, BrowserWindow, WebContentsView, ipcMain, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

app.name = 'Google Chrome';
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('lang', 'en-US');

// We will set the clean User-Agent dynamically in whenReady()
let cleanUA = '';

const cssPath = path.join(__dirname, 'tui-theme.css');
let tuiCss = '';
try { tuiCss = fs.readFileSync(cssPath, 'utf8'); } catch(e) {}

const windows = new Map(); // winId -> { window, tabs, activeTabId, tabCounter }

function applyTuiTheme(webContents) {
  webContents.insertCSS(tuiCss);
}

function createTab(winId, url = 'https://duckduckgo.com') {
  const winState = windows.get(winId);
  if (!winState) return;

  const view = new WebContentsView({
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true
    }
  });
  
  const tabId = ++winState.tabCounter;
  winState.tabs.set(tabId, view);
  
  view.webContents.on('did-finish-load', () => {
    applyTuiTheme(view.webContents);
    if (winState.activeTabId === tabId) {
      winState.window.webContents.send('url-updated', view.webContents.getURL());
    }
  });
  
  view.webContents.on('dom-ready', () => applyTuiTheme(view.webContents));
  
  view.webContents.on('did-navigate', (event, navUrl) => {
    if (winState.activeTabId === tabId) {
      winState.window.webContents.send('url-updated', navUrl);
    }
  });
  
  view.webContents.on('page-title-updated', (event, title) => {
    winState.window.webContents.send('tab-updated', { id: tabId, title, url: view.webContents.getURL() });
  });

  view.webContents.setUserAgent(cleanUA);
  view.webContents.loadURL(url, { userAgent: cleanUA });
  switchTab(winId, tabId);
  return tabId;
}

function switchTab(winId, tabId) {
  const winState = windows.get(winId);
  if (!winState || !winState.tabs.has(tabId)) return;
  
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
  
  winState.window.webContents.send('active-tab-changed', tabId);
  winState.window.webContents.send('url-updated', view.webContents.getURL());
}

function closeTab(winId, tabId) {
  const winState = windows.get(winId);
  if (!winState || !winState.tabs.has(tabId)) return;
  
  const view = winState.tabs.get(tabId);
  // view.webContents.destroy(); // Optional, let garbage collector handle or force destroy
  winState.tabs.delete(tabId);
  
  winState.window.webContents.send('tab-closed', tabId);

  if (winState.tabs.size === 0) {
    winState.window.close();
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

  mainWindow.loadFile('index.html').then(() => {
    createTab(winId, 'file://' + path.join(__dirname, 'readme.html'));
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

  let finalUrl = input.trim();
  if (finalUrl.includes(' ') || (!finalUrl.includes('.') && !finalUrl.startsWith('localhost') && !finalUrl.startsWith('file://'))) {
    finalUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(finalUrl);
  } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('file://')) {
    finalUrl = 'https://' + finalUrl;
  }
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
  if (view) view.webContents.loadURL('file://' + path.join(__dirname, 'readme.html'));
});

ipcMain.handle('get-current-url', (event) => {
  const view = getActiveView(event.sender.getOwnerBrowserWindow().id);
  return view ? view.webContents.getURL() : '';
});

// Tab management from UI
ipcMain.on('ui-new-tab', (event) => createTab(event.sender.getOwnerBrowserWindow().id));
ipcMain.on('ui-switch-tab', (event, tabId) => switchTab(event.sender.getOwnerBrowserWindow().id, tabId));
ipcMain.on('ui-close-tab', (event, tabId) => closeTab(event.sender.getOwnerBrowserWindow().id, tabId));
