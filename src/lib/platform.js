const bridge = typeof window !== 'undefined' ? window.beyond : undefined;
const LS_KEY = 'beyond-human-data';

export const isDesktop = Boolean(bridge);

export async function loadData() {
  if (bridge) return bridge.load();
  try {
    return { data: JSON.parse(localStorage.getItem(LS_KEY)), version: 'web', dataPath: 'browser storage' };
  } catch {
    return { data: null, version: 'web', dataPath: 'browser storage' };
  }
}

export function saveData(data, sync = false) {
  if (bridge) return sync ? bridge.saveSync(data) : bridge.save(data);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
  return true;
}

export function systemNotify(payload) {
  if (bridge) return bridge.notify(payload);
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') new Notification(payload.title, { body: payload.body });
  else if (Notification.permission !== 'denied') Notification.requestPermission();
}

export const win = {
  minimize: () => bridge?.minimize(),
  toggleMaximize: () => bridge?.toggleMaximize(),
  close: () => bridge?.close(),
  isMaximized: () => (bridge ? bridge.isMaximized() : Promise.resolve(false)),
  setBackground: (c) => bridge?.setBackground(c),
  onState: (cb) => (bridge ? bridge.onWindowState(cb) : () => {}),
};

export const system = {
  getLoginItem: () => (bridge ? bridge.getLoginItem() : Promise.resolve(false)),
  setLoginItem: (v) => (bridge ? bridge.setLoginItem(v) : Promise.resolve(false)),
  isPackaged: () => (bridge ? bridge.isPackaged() : Promise.resolve(false)),
  exportData: async (data) => {
    if (bridge) return bridge.exportData(data);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `beyond-human-backup-${new Date().toLocaleDateString('sv')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    return { ok: true };
  },
  importData: () => (bridge ? bridge.importData() : Promise.resolve({ ok: false, error: 'Import is available in the desktop app.' })),
  openDataFolder: () => bridge?.openDataFolder(),
  saveImage: async (dataUrl, name) => {
    if (bridge) return bridge.saveImage(dataUrl, name);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
    return { ok: true };
  },
  copyImage: async (dataUrl) => {
    if (bridge) return bridge.copyImage(dataUrl);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    }
  },
  gfxDeviceLost: (reason) => bridge?.gfxDeviceLost(reason),
  resetSafeGraphics: () => bridge?.resetSafeGraphics(),
  onNavigate: (cb) => (bridge ? bridge.onNavigate(cb) : () => {}),
  onCommand: (cb) => (bridge ? bridge.onCommand(cb) : () => {}),
};
