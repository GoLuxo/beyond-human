const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
  nativeImage,
  clipboard,
  dialog,
  shell,
  screen,
  crashReporter,
} = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const store = require('./store');
const scheduler = require('./scheduler');
const { log } = require('./log');

const APP_ID = 'com.beyondhuman.app';
const ASSETS = path.join(__dirname, 'assets');
const ICON = path.join(ASSETS, 'icon.png');
const devServer = (process.argv.find((a) => a.startsWith('--dev-server=')) || '').slice('--dev-server='.length);
const startHidden = process.argv.includes('--hidden');

let win = null;
let tray = null;
let quitting = false;
let elevated = false;
let gpuFaults = 0;
const liveNotifications = new Set();

if (process.env.BEYOND_USER_DATA) app.setPath('userData', process.env.BEYOND_USER_DATA);

store.init();

crashReporter.start({ uploadToServer: false });

if (store.getData()?.settings?.graphics !== 'battery' && !store.getMeta().safeGraphics) {
  app.commandLine.appendSwitch('force_high_performance_gpu');
}

app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    log('second instance launched: showing window');
    showWindow();
  });
  app.whenReady().then(boot);
}

function settings() {
  return store.getData()?.settings ?? {};
}

function boundsOnScreen(b) {
  if (!b || typeof b.x !== 'number') return false;
  return screen.getAllDisplays().some(({ workArea: a }) =>
    b.x + 100 > a.x && b.x < a.x + a.width - 100 && b.y >= a.y - 10 && b.y < a.y + a.height - 100,
  );
}

function createWindow() {
  const saved = store.getMeta().bounds;
  const light = settings().theme === 'light';
  win = new BrowserWindow({
    width: saved?.width ?? 1380,
    height: saved?.height ?? 880,
    ...(boundsOnScreen(saved) ? { x: saved.x, y: saved.y } : {}),
    minWidth: 1100,
    minHeight: 720,
    frame: false,
    show: false,
    backgroundColor: light ? '#ffffff' : '#000000',
    icon: ICON,
    title: 'Beyond Human',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      backgroundThrottling: false,
    },
  });

  if (devServer) win.loadURL(devServer);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.once('ready-to-show', () => {
    if (process.env.BEYOND_TEST_OFFSCREEN) {
      const [w, h] = (process.env.BEYOND_TEST_SIZE || '1440x900').split('x').map(Number);
      const [x, y] = (process.env.BEYOND_TEST_POS || '-3000,0').split(',').map(Number);
      win.setBounds({ x, y, width: w, height: h });
      win.showInactive();
      return;
    }
    if (startHidden && store.getData()?.profile?.onboarded) return;
    if (store.getMeta().maximized) win.maximize();
    win.show();
  });

  let boundsTimer = null;
  const rememberBounds = () => {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (!win || win.isDestroyed() || win.isMaximized() || win.isMinimized()) return;
      store.setMeta({ bounds: win.getBounds() });
    }, 500);
  };
  win.on('resize', rememberBounds);
  win.on('move', rememberBounds);
  win.on('maximize', () => {
    store.setMeta({ maximized: true });
    win.webContents.send('window:state', { maximized: true });
  });
  win.on('unmaximize', () => {
    store.setMeta({ maximized: false });
    win.webContents.send('window:state', { maximized: false });
  });

  win.on('close', (e) => {
    if (quitting) return;
    if (elevated || settings().minimizeToTray === false) {
      quitting = true;
      app.quit();
      return;
    }
    e.preventDefault();
    win.hide();
    if (!store.getMeta().trayHintShown) {
      store.setMeta({ trayHintShown: true });
      notify({
        title: 'Beyond Human is still running',
        body: 'Reminders keep coming from the tray. Right-click the tray icon to quit.',
      });
    }
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    log(`renderer gone: ${details.reason} (exit code ${details.exitCode})`);
    if (details.reason === 'clean-exit') return;
    if (details.reason === 'crashed' || details.reason === 'oom') noteGpuFault(`page process ${details.reason}`);
    setTimeout(() => win && !win.isDestroyed() && win.webContents.reload(), 400);
  });
  win.webContents.on('unresponsive', () => log('renderer unresponsive'));
  win.webContents.on('responsive', () => log('renderer responsive again'));
  win.webContents.on('console-message', (e, level, message) => {
    const lvl = e?.level ?? level;
    if (lvl === 'error' || lvl === 3) log(`page error: ${String(e?.message ?? message).slice(0, 500)}`);
  });

  win.on('session-end', () => {
    quitting = true;
  });
  win.on('closed', () => {
    win = null;
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (devServer && url.startsWith(devServer)) return;
    e.preventDefault();
  });
}

function noteGpuFault(reason) {
  gpuFaults += 1;
  log(`graphics fault ${gpuFaults}: ${reason}`);
  if (gpuFaults >= 2 && !store.getMeta().safeGraphics) {
    store.setMeta({ safeGraphics: true, safeReason: reason });
    log('safe graphics mode enabled');
  }
}

function detectElevation() {
  if (process.platform !== 'win32') return;
  execFile('net', ['session'], { windowsHide: true }, (err) => {
    elevated = !err;
    if (elevated) log('running with administrator rights: closing the window will quit the app');
  });
}

function showWindow() {
  if (!win || win.isDestroyed()) createWindow();
  else if (win.webContents.isCrashed()) {
    log('window shown with a crashed page: reloading');
    win.webContents.reload();
  }
  if (win.isMinimized()) win.restore();
  if (process.env.BEYOND_TEST_OFFSCREEN) return win.showInactive();
  win.show();
  win.focus();
  return undefined;
}

function send(channel, payload) {
  showWindow();
  const deliver = () => win.webContents.send(channel, payload);
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', deliver);
  else deliver();
}

function notify({ title, body, view, silent }) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: ICON, silent: Boolean(silent) });
  liveNotifications.add(n);
  n.on('click', () => {
    liveNotifications.delete(n);
    if (view) send('navigate', view);
    else showWindow();
  });
  n.on('close', () => liveNotifications.delete(n));
  n.show();
}

function trayTooltip() {
  const now = new Date();
  const streak = scheduler.currentStreak(store.getData()?.days, now);
  const day = `Day ${scheduler.dayOfYear(now)} of ${scheduler.daysInYear(now.getFullYear())}`;
  return `Beyond Human\n${day}${streak ? `, ${streak}-day streak` : ''}`;
}

function createTray() {
  const image = nativeImage.createFromPath(path.join(ASSETS, 'tray.png'));
  tray = new Tray(image.isEmpty() ? nativeImage.createFromPath(ICON) : image);
  tray.setToolTip(trayTooltip());
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Beyond Human', click: () => showWindow() },
      { type: 'separator' },
      { label: 'Light up today', click: () => send('command', 'checkin') },
      { label: 'Add a task', click: () => send('command', 'new-task') },
      { label: 'Start a focus session', click: () => send('command', 'focus-start') },
      { label: 'Write in journal', click: () => send('navigate', 'journal') },
      { type: 'separator' },
      {
        label: 'Quit Beyond Human',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', () => showWindow());
  setInterval(() => tray && tray.setToolTip(trayTooltip()), 60 * 1000);
}

function registerIpc() {
  ipcMain.handle('store:load', () => ({
    data: store.getData(),
    version: app.getVersion(),
    dataPath: store.getDataPath(),
    safeGraphics: Boolean(store.getMeta().safeGraphics),
    safeReason: store.getMeta().safeReason ?? '',
  }));
  const recentReloads = [];
  ipcMain.on('gfx:device-lost', (_e, reason) => {
    log(`graphics device lost: ${String(reason).slice(0, 200)}`);
    if (!store.getMeta().safeGraphics) store.setMeta({ safeGraphics: true, safeReason: 'the graphics device was lost' });
    const now = Date.now();
    while (recentReloads.length && now - recentReloads[0] > 60000) recentReloads.shift();
    if (recentReloads.length >= 3) return log('device lost again: not reloading to avoid a loop');
    recentReloads.push(now);
    win?.webContents.reload();
    return undefined;
  });
  ipcMain.on('gfx:reset-safe', () => {
    log('safe graphics mode turned off by the user: relaunching');
    store.setMeta({ safeGraphics: false, safeReason: '' });
    quitting = true;
    app.relaunch();
    app.exit(0);
  });
  ipcMain.on('store:save', (_e, data) => store.setData(data));
  ipcMain.on('store:save-sync', (e, data) => {
    e.returnValue = store.setData(data);
  });

  ipcMain.on('notify', (_e, payload) => {
    if (payload && typeof payload.title === 'string') notify(payload);
  });

  ipcMain.on('win:minimize', () => win?.minimize());
  ipcMain.on('win:toggle-maximize', () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('win:close', () => win?.close());
  ipcMain.handle('win:is-maximized', () => Boolean(win?.isMaximized()));
  ipcMain.on('win:set-background', (_e, color) => {
    if (typeof color === 'string') win?.setBackgroundColor(color);
  });

  ipcMain.handle('app:get-login-item', () => app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin);
  ipcMain.handle('app:set-login-item', (_e, enabled) => {
    if (!app.isPackaged) return false;
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled), args: ['--hidden'] });
    return app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin;
  });
  ipcMain.handle('app:is-packaged', () => app.isPackaged);

  ipcMain.handle('data:export', async (_e, data) => {
    const stamp = new Date().toLocaleDateString('sv');
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export your Beyond Human data',
      defaultPath: path.join(app.getPath('documents'), `beyond-human-backup-${stamp}.json`),
      filters: [{ name: 'Beyond Human backup', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, filePath };
  });

  ipcMain.handle('data:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import a Beyond Human backup',
      properties: ['openFile'],
      filters: [{ name: 'Beyond Human backup', extensions: ['json'] }],
    });
    if (canceled || !filePaths?.[0]) return { ok: false };
    try {
      return { ok: true, data: JSON.parse(fs.readFileSync(filePaths[0], 'utf8')) };
    } catch {
      return { ok: false, error: 'That file is not a valid Beyond Human backup.' };
    }
  });

  const pngFromDataUrl = (dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return null;
    const image = nativeImage.createFromDataURL(dataUrl);
    return image.isEmpty() ? null : image;
  };
  ipcMain.handle('share:save', async (_e, dataUrl, name) => {
    const image = pngFromDataUrl(dataUrl);
    if (!image) return { ok: false };
    const safeName = String(name || 'beyond-human.png').replace(/[^\w.-]/g, '-');
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save your share card',
      defaultPath: path.join(app.getPath('pictures'), safeName),
      filters: [{ name: 'PNG image', extensions: ['png'] }],
    });
    if (canceled || !filePath) return { ok: false };
    fs.writeFileSync(filePath, image.toPNG());
    return { ok: true, filePath };
  });
  ipcMain.handle('share:copy', (_e, dataUrl) => {
    const image = pngFromDataUrl(dataUrl);
    if (!image) return false;
    clipboard.writeImage(image);
    return true;
  });

  ipcMain.on('app:open-data-folder', () => shell.showItemInFolder(store.getDataPath()));
}

function boot() {
  log(`start ${app.getVersion()} (packaged: ${app.isPackaged})`);
  app.on('child-process-gone', (_e, d) => {
    log(`child process gone: ${d.type} ${d.reason} (exit code ${d.exitCode})`);
    if (d.type === 'GPU' && d.reason !== 'clean-exit') noteGpuFault(`GPU process ${d.reason}`);
  });
  detectElevation();
  registerIpc();
  createWindow();
  createTray();
  scheduler.start(store.getData, notify);
}

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
});
