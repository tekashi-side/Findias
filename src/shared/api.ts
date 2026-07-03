/**
 * Shared IPC contract types. Imported by main, preload, and renderer so all
 * three processes agree on the shape of the bridge exposed on `window.findias`.
 */

import type { ModListState } from './modList';

/** Known feature-flag keys. Add new gated capabilities here. */
export type FeatureFlag = 'prereleases';

/** Active state of every feature flag, resolved in the main process. */
export type FeatureFlags = Record<FeatureFlag, boolean>;

export interface AppInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
}

/** Resolved game-folder paths derived from the chosen root. */
export interface GamePaths {
  root: string;
  packageDir: string;
  disabledDir: string;
}

/**
 * Whether Findias is ready to operate. The app is gated until a game folder is
 * both chosen and still valid (its `package` subfolder exists).
 */
export interface SetupState {
  gameRootPath: string | null;
  valid: boolean;
  /**
   * Effective (feature-flag-gated) value of whether prerelease Uiscias releases
   * are considered when fetching the catalog. Always false when the
   * `prereleases` feature is inactive, regardless of the persisted setting.
   */
  shouldIncludePrereleases: boolean;
  /** Active state of the app's feature flags. */
  features: FeatureFlags;
}

/** Result of prompting the user to choose a game folder. */
export interface ChooseFolderResult {
  ok: boolean;
  /** True when the user dismissed the native dialog. */
  canceled?: boolean;
  /** Present when validation failed (e.g. no `package` subfolder). */
  error?: string;
  /** Present on success — the new setup state. */
  state?: SetupState;
}

/** Progress event emitted while a mod is downloading. */
export interface DownloadProgress {
  modId: string;
  receivedBytes: number;
  /** Expected total from the release asset size, or null when unknown. */
  totalBytes: number | null;
}

/**
 * App self-update lifecycle event forwarded from electron-updater in the main
 * process. Drives the renderer's "restart to install" prompt.
 */
export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'progress' | 'downloaded' | 'error';
  /** The available/downloaded release version (when known). */
  version?: string;
  /** Download completion percent (0-100), present only on `progress`. */
  percent?: number;
  /** Human-readable message, present on `error`. */
  message?: string;
}

/** The allow-listed surface exposed to the renderer via contextBridge. */
export interface FindiasApi {
  getAppInfo(): Promise<AppInfo>;
  getSetupState(): Promise<SetupState>;
  chooseGameFolder(): Promise<ChooseFolderResult>;
  /** Scan the package folder, fetch the catalog, and resolve the mod list. */
  refresh(): Promise<ModListState>;
  /** Install (or replace with) the latest release version of a mod. */
  installOrUpdate(modId: string): Promise<ModListState>;
  /** Delete every managed file for a mod (package root + disabled). */
  deleteMod(modId: string): Promise<ModListState>;
  /** Move a mod between the package root and `package/disabled`. */
  setDisabled(modId: string, disabled: boolean): Promise<ModListState>;
  /** Persist whether prereleases are eligible, then re-resolve the mod list. */
  setShouldIncludePrereleases(value: boolean): Promise<ModListState>;
  /** Subscribe to download progress; returns an unsubscribe function. */
  onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void;
  /** Subscribe to app self-update status events; returns an unsubscribe function. */
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void;
  /** Quit and install a downloaded app update (restarts into the new version). */
  installUpdate(): void;
  /** Minimize the application window. */
  minimizeWindow(): void;
  /** Close the application window. */
  closeWindow(): void;
}

/** IPC channel names, kept in one place to avoid string drift across processes. */
export const IpcChannels = {
  getAppInfo: 'app:getInfo',
  getSetupState: 'setup:getState',
  chooseGameFolder: 'setup:chooseGameFolder',
  refresh: 'mods:refresh',
  installOrUpdate: 'mods:installOrUpdate',
  deleteMod: 'mods:delete',
  setDisabled: 'mods:setDisabled',
  setShouldIncludePrereleases: 'settings:setShouldIncludePrereleases',
  downloadProgress: 'mods:downloadProgress',
  updateStatus: 'update:status',
  installUpdate: 'update:install',
  windowMinimize: 'window:minimize',
  windowClose: 'window:close',
} as const;
