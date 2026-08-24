const { contextBridge, ipcRenderer } = require('electron');

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

  // Events from main process
  onUrlUpdated: (callback) => ipcRenderer.on('url-updated', (_event, url) => callback(url)),
  onFocusAddressBar: (callback) => ipcRenderer.on('focus-address-bar', () => callback()),
  onTabUpdated: (callback) => ipcRenderer.on('tab-updated', (_event, tab) => callback(tab)),
  onTabClosed: (callback) => ipcRenderer.on('tab-closed', (_event, id) => callback(id)),
  onActiveTabChanged: (callback) => ipcRenderer.on('active-tab-changed', (_event, id) => callback(id)),
});
