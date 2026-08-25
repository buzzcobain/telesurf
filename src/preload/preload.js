const { contextBridge, ipcRenderer } = require('electron');

// Only expose the API if we are running on a local file (e.g. dashboard.html, index.html, settings.html)
// This prevents external websites from accessing browser internal IPCs.
if (window.location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('electronAPI', {
    navigate: (url) => ipcRenderer.send('navigate', url),
    goBack: () => ipcRenderer.send('go-back'),
    goForward: () => ipcRenderer.send('go-forward'),
    refresh: () => ipcRenderer.send('refresh'),
    goHome: () => ipcRenderer.send('go-home'),
    getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
    
    // Tab UI events
    newTab: () => ipcRenderer.send('ui-new-tab'),
    switchTab: (id) => ipcRenderer.send('ui-switch-tab', id),
    closeTab: (id) => ipcRenderer.send('ui-close-tab', id),
    setTheme: (theme) => ipcRenderer.send('set-theme', theme),
    setCookiePref: (pref) => ipcRenderer.send('set-cookie-pref', pref),
    setDashboardConfig: (config) => ipcRenderer.send('set-dashboard-config', config),
    showSettingsMenu: () => ipcRenderer.send('show-settings-menu'),

    // Sync / Promise based requests for dashboard data
    getDashboardConfig: () => ipcRenderer.invoke('get-dashboard-config'),
    getWeatherData: () => ipcRenderer.invoke('get-weather-data'),
    getSportsData: (team) => ipcRenderer.invoke('get-sports-data', team),

    // Events from main process
    onUrlUpdated: (callback) => ipcRenderer.on('url-updated', (_event, url) => callback(url)),
    onFocusAddressBar: (callback) => ipcRenderer.on('focus-address-bar', () => callback()),
    onTabUpdated: (callback) => ipcRenderer.on('tab-updated', (_event, tab) => callback(tab)),
    onTabClosed: (callback) => ipcRenderer.on('tab-closed', (_event, id) => callback(id)),
    onActiveTabChanged: (callback) => ipcRenderer.on('active-tab-changed', (_event, id) => callback(id)),
    onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_event, theme) => callback(theme)),
    onDashboardChanged: (callback) => ipcRenderer.on('dashboard-changed', (_event, config) => callback(config)),
    
    // DevTools events
    onDevToolsConsole: (callback) => ipcRenderer.on('devtools-console', (_event, data) => callback(data)),
    onDevToolsNetwork: (callback) => ipcRenderer.on('devtools-network', (_event, data) => callback(data))
  });
}
