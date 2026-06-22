import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, type FindiasApi } from '../shared/api'

const api: FindiasApi = {
  getAppInfo: () => ipcRenderer.invoke(IpcChannels.getAppInfo)
}

contextBridge.exposeInMainWorld('findias', api)
