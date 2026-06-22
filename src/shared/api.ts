/**
 * Shared IPC contract types. Imported by main, preload, and renderer so all
 * three processes agree on the shape of the bridge exposed on `window.findias`.
 */

export interface AppInfo {
  appVersion: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
}

/** The allow-listed surface exposed to the renderer via contextBridge. */
export interface FindiasApi {
  getAppInfo(): Promise<AppInfo>
}

/** IPC channel names, kept in one place to avoid string drift across processes. */
export const IpcChannels = {
  getAppInfo: 'app:getInfo'
} as const
