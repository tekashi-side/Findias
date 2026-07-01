import { app, type BrowserWindow } from 'electron';
// electron-updater is CommonJS; import the default and destructure so the
// electron-vite (Rollup) interop resolves `autoUpdater` correctly.
import electronUpdater from 'electron-updater';
import { IpcChannels, type UpdateStatus } from '../shared/api';

const { autoUpdater } = electronUpdater;

type GetWindow = () => BrowserWindow | null;

/** Forward an update event to the renderer, if a live window exists. */
const emit = (getWindow: GetWindow, status: UpdateStatus): void => {
  const window = getWindow();
  if (window && !window.isDestroyed()) {
    window.webContents.send(IpcChannels.updateStatus, status);
  }
};

/**
 * Wire electron-updater (GitHub provider -> tekashi-side/Findias) and forward its
 * lifecycle over IPC. Checks once on launch and downloads automatically; the
 * renderer prompts "restart to install" when `update-downloaded` fires.
 *
 * A no-op in dev/unpackaged builds: there is no `app-update.yml`, so
 * `checkForUpdates()` would throw. `autoInstallOnAppQuit` is left at its default
 * (on), so an ignored-but-downloaded update installs on the next normal quit.
 */
export const initUpdater = (getWindow: GetWindow): void => {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;

  autoUpdater.on('checking-for-update', () => emit(getWindow, { state: 'checking' }));
  autoUpdater.on('update-available', (info) =>
    emit(getWindow, { state: 'available', version: info.version }),
  );
  autoUpdater.on('update-not-available', () => emit(getWindow, { state: 'not-available' }));
  autoUpdater.on('download-progress', (progress) =>
    emit(getWindow, { state: 'progress', percent: progress.percent }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    emit(getWindow, { state: 'downloaded', version: info.version }),
  );
  autoUpdater.on('error', (error) =>
    emit(getWindow, { state: 'error', message: error?.message ?? 'Update failed.' }),
  );

  void autoUpdater.checkForUpdates();
};

/** Quit and install a downloaded update, restarting into the new version. */
export const quitAndInstallUpdate = (): void => {
  autoUpdater.quitAndInstall();
};
