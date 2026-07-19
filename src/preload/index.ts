import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IpcChannels,
  type DownloadProgress,
  type FeatureFlags,
  type FindiasApi,
  type UpdateStatus,
} from '../shared/api';

// Feature flags are constant for the session, so resolve them once, synchronously,
// at preload load. The main handler is registered before the window loads.
const featureFlags = ipcRenderer.sendSync(IpcChannels.getFeatureFlags) as FeatureFlags;

const api: FindiasApi = {
  featureFlags,
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.getAppInfo),
  getSetupState: () => ipcRenderer.invoke(IpcChannels.getSetupState),
  chooseGameFolder: () => ipcRenderer.invoke(IpcChannels.chooseGameFolder),
  startGame: () => ipcRenderer.invoke(IpcChannels.startGame),
  listForeignMods: () => ipcRenderer.invoke(IpcChannels.listForeignMods),
  completeModSetup: (shouldArchive) =>
    ipcRenderer.invoke(IpcChannels.completeModSetup, shouldArchive),
  refresh: () => ipcRenderer.invoke(IpcChannels.refresh),
  installOrUpdate: (modId) => ipcRenderer.invoke(IpcChannels.installOrUpdate, modId),
  deleteMod: (modId) => ipcRenderer.invoke(IpcChannels.deleteMod, modId),
  setDisabled: (modId, isDisabled) =>
    ipcRenderer.invoke(IpcChannels.setDisabled, modId, isDisabled),
  setShouldIncludePrereleases: (shouldIncludePrereleases) =>
    ipcRenderer.invoke(IpcChannels.setShouldIncludePrereleases, shouldIncludePrereleases),
  setErrorReportingEnabled: (isEnabled) =>
    ipcRenderer.invoke(IpcChannels.setErrorReportingEnabled, isEnabled),
  onDownloadProgress: (callback) => {
    const listener = (_event: IpcRendererEvent, progress: DownloadProgress): void =>
      callback(progress);
    ipcRenderer.on(IpcChannels.downloadProgress, listener);
    return () => ipcRenderer.removeListener(IpcChannels.downloadProgress, listener);
  },
  onUpdateStatus: (callback) => {
    const listener = (_event: IpcRendererEvent, status: UpdateStatus): void => callback(status);
    ipcRenderer.on(IpcChannels.updateStatus, listener);
    return () => ipcRenderer.removeListener(IpcChannels.updateStatus, listener);
  },
  installUpdate: () => ipcRenderer.send(IpcChannels.installUpdate),
  openExternal: (url) => ipcRenderer.send(IpcChannels.openExternal, url),
  minimizeWindow: () => ipcRenderer.send(IpcChannels.windowMinimize),
  closeWindow: () => ipcRenderer.send(IpcChannels.windowClose),
  debugTelemetry: (kind) => ipcRenderer.invoke(IpcChannels.debugTelemetry, kind),
};

contextBridge.exposeInMainWorld('findias', api);
