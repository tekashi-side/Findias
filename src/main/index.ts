import { join } from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { registerIpcHandlers } from './ipc';
import { initUpdater } from './updater';

// Dev-only: give the dev server its own userData folder so it never shares
// settings/caches with the installed app. Windows is case-insensitive, so the
// dev name ("findias") and the packaged productName ("Findias") would otherwise
// resolve to the same folder. Must run before anything reads userData.
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'findias-dev'));
}

const createWindow = (): void => {
  const window = new BrowserWindow({
    // width: 1600,
    // height: 900,
    width: 1366,
    height: 768,
    // width: 1280,
    // height: 720,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    center: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.on('ready-to-show', () => window.show());

  // Open external links in the user's browser, never inside the app window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

void app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // Check the Findias releases feed once on launch (no-op in dev/unpackaged).
  initUpdater(() => BrowserWindow.getAllWindows()[0] ?? null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
