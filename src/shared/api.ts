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
  /** Where pre-existing, non-official mods are moved during setup. Never scanned. */
  archivedDir: string;
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
  /**
   * True when the game folder is valid but the one-time mod-archive setup step
   * has not been completed for it AND pre-existing (non-official) mods are
   * present in the package root. Drives the second setup step.
   */
  needsModArchive: boolean;
}

/** A pre-existing, non-official mod file detected in the package root. */
export interface ForeignMod {
  /** Exact file name on disk. */
  fileName: string;
  /** Natural display name (extension + trailing version stripped). */
  displayName: string;
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
  /**
   * Active state of the app's feature flags, resolved once in the main process
   * and read synchronously at preload load. Constant for the session.
   */
  readonly featureFlags: FeatureFlags;
  getAppInfo(): Promise<AppInfo>;
  getSetupState(): Promise<SetupState>;
  chooseGameFolder(): Promise<ChooseFolderResult>;
  /** List pre-existing, non-official mods in the package root (for the archive step). */
  listForeignMods(): Promise<ForeignMod[]>;
  /**
   * Complete the one-time mod-archive setup step. When `archive` is true, moves
   * every pre-existing non-official mod into `package/archived`. Always marks the
   * step complete and returns the fresh setup state.
   */
  completeModSetup(archive: boolean): Promise<SetupState>;
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
  getFeatureFlags: 'featureFlags:get',
  getAppInfo: 'app:getInfo',
  getSetupState: 'setup:getState',
  chooseGameFolder: 'setup:chooseGameFolder',
  listForeignMods: 'setup:listForeignMods',
  completeModSetup: 'setup:completeModSetup',
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
