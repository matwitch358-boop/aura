const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let win, tray;
let settings = { theme: 'dark' };
const BASE_W = 460, BASE_H = 230;
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try { settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch {}
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch {}
}

// Масштаб под разрешение: 1080p = 1.0
function scaleFor(display) {
  return Math.min(1.6, Math.max(0.85, display.bounds.height / 1080));
}

function place() {
  if (!win) return;
  const d = screen.getPrimaryDisplay();
  const z = scaleFor(d);
  const w = Math.round(BASE_W * z), h = Math.round(BASE_H * z);
  win.webContents.setZoomFactor(z);
  win.setBounds({
    x: Math.round(d.bounds.x + (d.bounds.width - w) / 2),
    y: d.bounds.y + 6,
    width: w, height: h
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: BASE_W, height: BASE_H,
    frame: false, transparent: true, resizable: false, movable: false,
    hasShadow: false, skipTaskbar: true, focusable: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile('index.html');
  win.once('ready-to-show', () => { place(); win.show(); });
  // Прозрачная область пропускает клики к окнам под ней
  win.setIgnoreMouseEvents(true, { forward: true });
  // Периодически подтверждаем «поверх всех окон»
  setInterval(() => { if (win && win.isVisible()) win.setAlwaysOnTop(true, 'screen-saver'); }, 3000);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  tray.setToolTip('AURA');
  const menu = Menu.buildFromTemplate([
    { label: 'Показать / скрыть', click: () => (win.isVisible() ? win.hide() : win.show()) },
    { label: 'Раскрыть островок', click: () => { win.show(); win.webContents.send('expand'); } },
    { type: 'separator' },
    {
      label: 'Запускать вместе с Windows', type: 'checkbox', enabled: app.isPackaged,
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked })
    },
    { type: 'separator' },
    { label: 'Выход', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => (win.isVisible() ? win.hide() : win.show()));
}

ipcMain.handle('settings:get', () => settings);
ipcMain.on('settings:set', (_e, patch) => { settings = { ...settings, ...patch }; saveSettings(); });
ipcMain.on('mouse:ignore', (_e, ignore) => win && win.setIgnoreMouseEvents(ignore, { forward: true }));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.webContents.send('expand'); } });
  app.whenReady().then(() => {
    app.setAppUserModelId('app.aura.island');
    loadSettings();
    createWindow();
    createTray();
    screen.on('display-metrics-changed', place);
    screen.on('display-added', place);
    screen.on('display-removed', place);
  });
  app.on('window-all-closed', () => {}); // живём в трее
}
