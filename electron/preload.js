const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (callback) => {
  const handler = (_e, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('beyond', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.send('store:save', data),
  saveSync: (data) => ipcRenderer.sendSync('store:save-sync', data),
  notify: (payload) => ipcRenderer.send('notify', payload),

  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
  setBackground: (color) => ipcRenderer.send('win:set-background', color),

  getLoginItem: () => ipcRenderer.invoke('app:get-login-item'),
  setLoginItem: (enabled) => ipcRenderer.invoke('app:set-login-item', enabled),
  isPackaged: () => ipcRenderer.invoke('app:is-packaged'),
  exportData: (data) => ipcRenderer.invoke('data:export', data),
  importData: () => ipcRenderer.invoke('data:import'),
  openDataFolder: () => ipcRenderer.send('app:open-data-folder'),
  saveImage: (dataUrl, name) => ipcRenderer.invoke('share:save', dataUrl, name),
  copyImage: (dataUrl) => ipcRenderer.invoke('share:copy', dataUrl),
  gfxDeviceLost: (reason) => ipcRenderer.send('gfx:device-lost', reason),
  resetSafeGraphics: () => ipcRenderer.send('gfx:reset-safe'),

  onNavigate: listen('navigate'),
  onCommand: listen('command'),
  onWindowState: listen('window:state'),
});
