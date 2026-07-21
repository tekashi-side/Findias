/**
 * Shared IPC contract types. Imported by main, preload, and renderer so all
 * three processes agree on the shape of the bridge exposed on `window.findias`.
 */

import type { ModListState } from './modList';

/** Known feature-flag keys. Add new gated capabilities here. */
export type FeatureFlag = 'prereleases' | 'previewAppUpdateToast';

/** Active state of every feature flag, resolved in the main process. */
export type FeatureFlags = Record<FeatureFlag, boolean>;

export interface AppInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  /** OS platform identifier (e.g. `win32`, `darwin`, `linux`). */
  platform: string;
  /** OS release/kernel version string (e.g. `10.0.26200`). */
  osVersion: string;
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
 * Which storefront/launcher the game was installed through. Inferred from the
 * chosen game folder path (never persisted), so it can't drift from the folder.
 */
export type GameLauncher = 'steam' | 'nexon';

/**
 * Result of a Start Game request. On success the main process quits Findias, so
 * the renderer only ever acts on a failure (showing a toast).
 */
export type StartGameResult =
  | { isOk: true; launcher: GameLauncher }
  | {
      isOk: false;
      /** `no-game-folder`: setup is invalid. `launch-failed`: the OS had no handler. */
      reason: 'no-game-folder' | 'launch-failed';
      launcher?: GameLauncher;
    };

/**
 * Whether Findias is ready to operate. The app is gated until a game folder is
 * both chosen and still valid (its `package` subfolder exists).
 */
export interface SetupState {
  gameRootPath: string | null;
  isValid: boolean;
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
  shouldShowModArchive: boolean;
  /** Whether anonymous error reporting is enabled (opt-out; defaults to true). */
  isErrorReportingEnabled: boolean;
  /**
   * The launcher inferred from the game folder path, or null when no folder is
   * set. Read-only and derived (never persisted); used to display the detected
   * launcher in settings.
   */
  gameLauncher: GameLauncher | null;
  /**
   * Whether "Start Game" launches the game directly (true) or only opens the
   * launcher (false). Persisted; defaults to true. Drives the LauncherBar switch.
   */
  shouldStartGameAutomatically: boolean;
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
  isOk: boolean;
  /** True when the user dismissed the native dialog. */
  isCanceled?: boolean;
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
  /**
   * Launch Mabinogi via the inferred launcher's protocol URI. On success the
   * main process quits Findias; on failure it resolves with a `launch-failed`
   * (or `no-game-folder`) result so the renderer can show a toast.
   */
  startGame(): Promise<StartGameResult>;
  /** List pre-existing, non-official mods in the package root (for the archive step). */
  listForeignMods(): Promise<ForeignMod[]>;
  /**
   * Complete the one-time mod-archive setup step. When `shouldArchive` is true, moves
   * every pre-existing non-official mod into `package/archived`. Always marks the
   * step complete and returns the fresh setup state.
   */
  completeModSetup(shouldArchive: boolean): Promise<SetupState>;
  /** Scan the package folder, fetch the catalog, and resolve the mod list. */
  refresh(): Promise<ModListState>;
  /** Install (or replace with) the latest release version of a mod. */
  installOrUpdate(modId: string): Promise<ModListState>;
  /** Delete every managed file for a mod (package root + disabled). */
  deleteMod(modId: string): Promise<ModListState>;
  /** Move a mod between the package root and `package/disabled`. */
  setDisabled(modId: string, isDisabled: boolean): Promise<ModListState>;
  /** Persist whether prereleases are eligible, then re-resolve the mod list. */
  setShouldIncludePrereleases(shouldIncludePrereleases: boolean): Promise<ModListState>;
  /** Persist and immediately apply the anonymous error-reporting opt-out. */
  setErrorReportingEnabled(isEnabled: boolean): Promise<void>;
  /**
   * Persist whether "Start Game" launches the game directly or only opens the
   * launcher. Applied on the next Start Game request.
   */
  setStartGameAutomatically(shouldStartGameAutomatically: boolean): Promise<void>;
  /** Subscribe to download progress; returns an unsubscribe function. */
  onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void;
  /** Subscribe to app self-update status events; returns an unsubscribe function. */
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void;
  /** Quit and install a downloaded app update (restarts into the new version). */
  installUpdate(): void;
  /**
   * Open an http(s) URL in the user's default browser. Renderer anchors can't
   * navigate the app shell, so links (e.g. in mod READMEs) route through here.
   * The main process ignores non-web protocols.
   */
  openExternal(url: string): void;
  /** Minimize the application window. */
  minimizeWindow(): void;
  /** Toggle maximize / restore on the application window. */
  toggleMaximizeWindow(): void;
  /** Subscribe to maximize-state changes; returns an unsubscribe function. */
  onWindowMaximizeChanged(callback: (isMaximized: boolean) => void): () => void;
  /** Close the application window. */
  closeWindow(): void;
  /**
   * Dev-only: trigger a main-process telemetry test path (manual report, an
   * uncaught exception, or a native crash). The handler is only registered in
   * development builds; the renderer only calls it from the dev-only self-test
   * panel.
   */
  debugTelemetry(kind: 'report' | 'throw' | 'nativeCrash'): Promise<void>;
}

/** IPC channel names, kept in one place to avoid string drift across processes. */
export const IpcChannels = {
  getFeatureFlags: 'featureFlags:get',
  getAppInfo: 'app:getInfo',
  getSetupState: 'setup:getState',
  chooseGameFolder: 'setup:chooseGameFolder',
  startGame: 'game:start',
  listForeignMods: 'setup:listForeignMods',
  completeModSetup: 'setup:completeModSetup',
  refresh: 'mods:refresh',
  installOrUpdate: 'mods:installOrUpdate',
  deleteMod: 'mods:delete',
  setDisabled: 'mods:setDisabled',
  setShouldIncludePrereleases: 'settings:setShouldIncludePrereleases',
  setErrorReportingEnabled: 'settings:setErrorReportingEnabled',
  setStartGameAutomatically: 'settings:setStartGameAutomatically',
  downloadProgress: 'mods:downloadProgress',
  updateStatus: 'update:status',
  installUpdate: 'update:install',
  openExternal: 'shell:openExternal',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggleMaximize',
  windowMaximizeChanged: 'window:maximizeChanged',
  windowClose: 'window:close',
  debugTelemetry: 'debug:telemetry',
} as const;
