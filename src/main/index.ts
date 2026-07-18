import { join } from 'node:path';
import { app, BrowserWindow, Menu, type WebContents } from 'electron';
import { buildAppMenu } from './appMenu';
import { registerIpcHandlers } from './ipc';
import { initUpdater } from './updater';
import { openExternalUrl } from './openExternal';
import { initTelemetry } from './telemetry';

/**
 * Whether a navigation target is "internal" (the app navigating within itself)
 * and should be allowed. In dev the renderer is served over http, so same-origin
 * covers Vite's occasional full-page reloads; in a packaged build it's loaded
 * from `file:` (whose origin is always "null"), so we allow only an exact
 * self-reload and treat every other `file:` target as external.
 */
const isInternalNavigation = (target: string, currentUrl: string): boolean => {
  try {
    const next = new URL(target);
    const current = new URL(currentUrl);
    if (current.protocol === 'file:') return next.href === current.href;
    return next.origin === current.origin;
  } catch {
    return false;
  }
};

// Dev-only: give the dev server its own userData folder so it never shares
// settings/caches with the installed app. Windows is case-insensitive, so the
// dev name ("findias") and the packaged productName ("Findias") would otherwise
// resolve to the same folder. Must run before anything reads userData.
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'findias-dev'));
}

// Initialize error reporting as early as possible, but only after userData is set
// (Sentry caches scope/offline events there). No-op unless packaged or opted in
// via FINDIAS_SENTRY_DEV=1. The renderer routes its events through this process.
initTelemetry();

/** Block Ctrl/Cmd+wheel page zoom; keyboard zoom is omitted from the app menu. */
const blockCtrlWheelZoom = (webContents: WebContents): void => {
  webContents.on('before-input-event', (event, input) => {
    if (input.type === 'mouseWheel' && (input.control || input.meta)) {
      event.preventDefault();
    }
  });
};

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
    // Frameless: no native menu bar (autoHideMenuBar would be a no-op).
    frame: false,
    center: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.on('ready-to-show', () => window.show());

  blockCtrlWheelZoom(window.webContents);

  // Open external links in the user's browser, never inside the app window.
  // Both guards funnel through `openExternalUrl`, so only http(s) targets open.
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  // Defense-in-depth: a top-level navigation would replace the SPA. Keep the app
  // on its own page and send anything else to the browser.
  window.webContents.on('will-navigate', (event, url) => {
    if (isInternalNavigation(url, window.webContents.getURL())) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

void app.whenReady().then(() => {
  Menu.setApplicationMenu(buildAppMenu());
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
