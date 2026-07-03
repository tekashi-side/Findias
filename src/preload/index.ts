import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IpcChannels,
  type DownloadProgress,
  type FindiasApi,
  type UpdateStatus,
} from '../shared/api';

const api: FindiasApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.getAppInfo),
  getSetupState: () => ipcRenderer.invoke(IpcChannels.getSetupState),
  chooseGameFolder: () => ipcRenderer.invoke(IpcChannels.chooseGameFolder),
  refresh: () => ipcRenderer.invoke(IpcChannels.refresh),
  installOrUpdate: (modId) => ipcRenderer.invoke(IpcChannels.installOrUpdate, modId),
  deleteMod: (modId) => ipcRenderer.invoke(IpcChannels.deleteMod, modId),
  setDisabled: (modId, disabled) => ipcRenderer.invoke(IpcChannels.setDisabled, modId, disabled),
  setShouldIncludePrereleases: (value) =>
    ipcRenderer.invoke(IpcChannels.setShouldIncludePrereleases, value),
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
  minimizeWindow: () => ipcRenderer.send(IpcChannels.windowMinimize),
  closeWindow: () => ipcRenderer.send(IpcChannels.windowClose),
};

contextBridge.exposeInMainWorld('findias', api);
