import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  IpcChannels,
  type AppInfo,
  type ChooseFolderResult,
  type DownloadProgress,
  type ForeignMod,
  type GamePaths,
  type SetupState,
  type StartGameResult,
} from '../shared/api';
import type { ModListState } from '../shared/modList';
import { loadSettings, saveSettings } from './settingsStore';
import { getFeatureFlags, isFeatureEnabled } from './featureFlags';
import { resolveGamePaths, validateGameRoot, type ValidationResult } from './gameLocation';
import { detectLauncher, startGame } from './gameLauncher';
import { catalogModIds, resolveModList } from './modResolver';
import { installOrUpdateMod } from './modInstaller';
import { archiveForeignMods, hasForeignMods, listForeignMods } from './modArchive';
import { quitAndInstallUpdate } from './updater';
import { createPackageModStore } from './modStore';
import { CatalogError, type Catalog } from './providers/catalog';
import { createManifestCatalogProvider } from './providers/manifestCatalog';
import { createLoggingFetch } from './providers/loggingFetch';
import { createPackageFolderProvider } from './providers/packageFolder';
import { openExternalUrl } from './openExternal';
import { addBreadcrumb, reportError, setErrorReportingEnabled, setModContext } from './telemetry';

/**
 * Resolve the dev network logger from `FINDIAS_LOG_NETWORK` (tri-state):
 * unset -> on in development, off when packaged; `0`/`false` -> force off;
 * `1`/`true` -> force on; `verbose` -> force on and also dump (redacted) headers.
 * Returns `undefined` when logging is off, so the default `fetch` is used.
 */
const resolveLoggingFetch = () => {
  const mode = process.env.FINDIAS_LOG_NETWORK;
  const isLoggingOff = mode === '0' || mode === 'false';
  const isLoggingEnabled =
    mode === '1' || mode === 'true' || mode === 'verbose' || (!isLoggingOff && !app.isPackaged);
  return isLoggingEnabled ? createLoggingFetch({ isVerbose: mode === 'verbose' }) : undefined;
};

/**
 * A single catalog provider for the whole main process. Constructing it once
 * lets its in-memory catalog cache survive across IPC calls, so a burst of
 * mutations reuses one release-feed fetch instead of one per handler.
 */
const loggingFetch = resolveLoggingFetch();
const catalogProvider = createManifestCatalogProvider(
  loggingFetch ? { fetchFn: loggingFetch } : {},
);

/**
 * Whether prerelease Uiscias releases should be considered: the persisted opt-in
 * AND-ed with the `prereleases` feature flag. In a packaged build the flag is
 * off, so this is always false no matter what `findias-settings.json` says.
 */
export const arePrereleasesEligible = async (): Promise<boolean> => {
  const { shouldIncludePrereleases } = await loadSettings();
  return shouldIncludePrereleases && isFeatureEnabled('prereleases');
};

/**
 * The set of modIds in the current catalog, or null when the catalog can't be
 * fetched. Null means "can't verify": the archive step fails closed on null (it
 * never prompts or archives without a catalog, since it can't tell orphans from
 * legitimate catalog mods). Uses the shared cached provider, so this warms the
 * cache for the mod-list refresh that follows setup.
 */
const resolveCatalogModIds = async (): Promise<Set<string> | null> => {
  try {
    const catalog = await catalogProvider.getCatalog(await arePrereleasesEligible());
    return catalogModIds(catalog);
  } catch {
    return null;
  }
};

/** Resolve the current setup state by re-validating the stored path on disk. */
const computeSetupState = async (): Promise<SetupState> => {
  const { gameRootPath, isModSetupCompleted, isErrorReportingEnabled } = await loadSettings();
  const shouldIncludePrereleases = await arePrereleasesEligible();
  if (!gameRootPath) {
    return {
      gameRootPath: null,
      isValid: false,
      shouldIncludePrereleases,
      shouldShowModArchive: false,
      isErrorReportingEnabled,
      gameLauncher: null,
    };
  }
  const { isOk } = await validateGameRoot(gameRootPath);
  // Only scan while the one-time archive step is pending. The cheap folder check
  // runs first so the catalog is fetched only when pre-existing mods exist, and
  // orphans are then determined against the catalog (mods already in the catalog
  // are legit and must not be flagged/archived).
  let shouldShowModArchive = false;
  if (isOk && !isModSetupCompleted) {
    const paths = resolveGamePaths(gameRootPath);
    const hasAnyForeignMod = await hasForeignMods(paths, null);
    if (hasAnyForeignMod) {
      const knownModIds = await resolveCatalogModIds();
      // Fail closed: never prompt archival against an unavailable catalog, or we
      // would flag legitimate catalog mods as orphans.
      shouldShowModArchive = knownModIds !== null && (await hasForeignMods(paths, knownModIds));
    }
  }
  return {
    gameRootPath,
    isValid: isOk,
    shouldIncludePrereleases,
    shouldShowModArchive,
    isErrorReportingEnabled,
    gameLauncher: detectLauncher(gameRootPath),
  };
};

/** Resolve the stored game paths, throwing a clear error if setup is invalid. */
const requireGamePaths = async (): Promise<GamePaths> => {
  const { gameRootPath } = await loadSettings();
  const validation: ValidationResult = gameRootPath
    ? await validateGameRoot(gameRootPath)
    : { isOk: false, error: 'No game folder is configured.' };

  if (!gameRootPath || !validation.isOk) {
    throw new Error(validation.error ?? 'No game folder is configured.');
  }
  return resolveGamePaths(gameRootPath);
};

/**
 * Build the current mod list: scan the package folder + fetch the catalog, then
 * resolve. A catalog failure (offline, rate-limited, no manifest) degrades
 * softly — installed mods are still returned (as orphans) so the user can manage
 * them, and the failure is reported via `catalog.isAvailable`.
 */
const resolveCurrentState = async (
  paths: GamePaths,
  options: { shouldForce?: boolean } = {},
): Promise<ModListState> => {
  const shouldIncludePrereleases = await arePrereleasesEligible();
  const installed = await createPackageFolderProvider(paths).list();
  try {
    const catalog = await catalogProvider.getCatalog(shouldIncludePrereleases, {
      shouldForce: options.shouldForce,
    });
    const { groups, metadata } = resolveModList(catalog, installed);
    setModContext({
      installedCount: installed.length,
      catalogAvailable: true,
      shouldIncludePrereleases,
      currentGameVersion: metadata?.currentGameVersion,
      supportedGameVersion: metadata?.supportedGameVersion,
      isOutdated: metadata?.isOutdated,
    });
    return { groups, catalog: { isAvailable: true }, metadata };
  } catch (error) {
    const message =
      error instanceof CatalogError ? error.message : 'Could not load the mod catalog.';
    // Report catalog format failures (schema drift or a Findias bug — the thrown
    // CatalogError carries the Zod error as its `cause`) and any truly unexpected
    // error. Routine, user-recoverable failures (offline, rate-limited, no
    // release) are expected and skipped so they don't burn the free-tier quota.
    if (!(error instanceof CatalogError) || error.code === 'parse') {
      reportError(error, { tags: { operation: 'resolveCatalog' } });
    }
    const { groups, metadata } = resolveModList(null, installed);
    setModContext({
      installedCount: installed.length,
      catalogAvailable: false,
      shouldIncludePrereleases,
    });
    return { groups, catalog: { isAvailable: false, error: message }, metadata };
  }
};

// The Refresh button is the explicit "check for updates" action, so it forces a
// revalidation (a free 304 when the feed is unchanged) rather than serving the
// TTL-cached catalog.
const refresh = async (): Promise<ModListState> =>
  resolveCurrentState(await requireGamePaths(), { shouldForce: true });

/** Locate a variant + its group in the catalog by modId. */
const findVariant = (
  catalog: Catalog,
  modId: string,
): {
  group: Catalog['groups'][number];
  variant: Catalog['groups'][number]['variants'][number];
} | null => {
  for (const group of catalog.groups) {
    const variant = group.variants.find((candidate) => candidate.modId === modId);
    if (variant) return { group, variant };
  }
  return null;
};

/**
 * Install or replace a mod, then return the fresh mod list. The catalog is
 * fetched once and reused for both the lookup and the post-mutation resolve. For
 * a mutually-exclusive variant group, the chosen variant replaces any installed
 * sibling (auto-switch). Download progress is streamed to the calling renderer.
 */
const installOrUpdate = async (event: IpcMainInvokeEvent, modId: string): Promise<ModListState> => {
  const paths = await requireGamePaths();
  const shouldIncludePrereleases = await arePrereleasesEligible();
  const catalog = await catalogProvider.getCatalog(shouldIncludePrereleases);
  const found = findVariant(catalog, modId);
  if (!found) {
    throw new Error(`"${modId}" is not available in the latest release.`);
  }

  const { group, variant } = found;
  const replaceSiblings = group.isMutuallyExclusive
    ? group.variants
        .filter((candidate) => candidate.modId !== modId)
        .map((candidate) => candidate.modId)
    : [];

  await installOrUpdateMod({
    entry: variant,
    store: createPackageModStore(paths),
    packageDir: paths.packageDir,
    replaceSiblings,
    onProgress: (receivedBytes) => {
      const progress: DownloadProgress = { modId, receivedBytes, totalBytes: variant.size };
      event.sender.send(IpcChannels.downloadProgress, progress);
    },
  });

  const installed = await createPackageFolderProvider(paths).list();
  const { groups, metadata } = resolveModList(catalog, installed);
  return { groups, catalog: { isAvailable: true }, metadata };
};

/**
 * Delete a mod, then return the fresh mod list. Foreign orphans are identified
 * by a `modId` that is a real `.it` file name and are deleted by exact name;
 * managed mods delete every version by their parsed modId.
 */
const deleteMod = async (modId: string): Promise<ModListState> => {
  const paths = await requireGamePaths();
  const store = createPackageModStore(paths);
  if (modId.toLowerCase().endsWith('.it')) {
    await store.removeByFileName(modId);
  } else {
    await store.removeManaged(modId);
  }
  return resolveCurrentState(paths);
};

/** List the orphan mods in the package root (for the archive step). */
const getForeignMods = async (): Promise<ForeignMod[]> =>
  listForeignMods(await requireGamePaths(), await resolveCatalogModIds());

/**
 * Complete the one-time mod-archive setup step. When `shouldArchive` is true, move
 * every orphan mod (non-official and absent from the catalog) into
 * `package/archived`; catalog mods are left in place. Always persist the
 * completion flag so the step is not shown again for this folder, then return
 * the fresh setup state.
 */
const completeModSetup = async (shouldArchive: boolean): Promise<SetupState> => {
  if (shouldArchive) {
    // Fail closed: without a catalog we can't tell orphans from legitimate mods,
    // so archive nothing rather than risk moving catalog mods.
    const knownModIds = await resolveCatalogModIds();
    if (knownModIds) await archiveForeignMods(await requireGamePaths(), knownModIds);
  }
  const settings = await loadSettings();
  await saveSettings({ ...settings, isModSetupCompleted: true });
  return computeSetupState();
};

/**
 * Move a mod in/out of `package/disabled`, then return the fresh mod list.
 * Foreign orphans are identified by a `modId` that is a real `.it` file name and
 * are moved by exact name; managed mods move every version by their parsed modId.
 */
const setDisabled = async (modId: string, isDisabled: boolean): Promise<ModListState> => {
  const paths = await requireGamePaths();
  const store = createPackageModStore(paths);
  if (modId.toLowerCase().endsWith('.it')) {
    await store.setDisabledByFileName(modId, isDisabled);
  } else {
    await store.setDisabled(modId, isDisabled);
  }
  return resolveCurrentState(paths);
};

/**
 * Persist the prerelease preference, then re-resolve against the new filter.
 * When the `prereleases` feature is inactive the control is hidden in the UI, so
 * this is a defensive guard: a request to enable is ignored (never persisted)
 * and the settings are left untouched.
 */
const setShouldIncludePrereleases = async (
  shouldIncludePrereleases: boolean,
): Promise<ModListState> => {
  if (isFeatureEnabled('prereleases')) {
    const settings = await loadSettings();
    await saveSettings({ ...settings, shouldIncludePrereleases });
  }
  return resolveCurrentState(await requireGamePaths());
};

/**
 * Register an invoke handler that reports *unexpected* errors it throws to Sentry
 * (with full fidelity, before IPC serialization loses the class/cause) and
 * rethrows so the renderer still gets it for the toast. A CatalogError is an
 * expected, user-facing failure (already shown via toast/banner) and is skipped
 * unless its code is `parse` (schema drift / a real bug) — the same predicate
 * `resolveCurrentState` uses — so routine offline/rate-limited failures (and
 * "Update All" bursts) don't burn the free-tier quota.
 */
const handleInvoke = <Args extends unknown[], Result>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Result | Promise<Result>,
): void => {
  ipcMain.handle(channel, async (event, ...args: Args) => {
    // Leave a trail of recent actions so a captured error shows what led to it.
    // Deliberately record only the channel name, not args, so a future channel
    // that takes a path or user-entered string can't leak it into Sentry.
    addBreadcrumb({ category: 'ipc', message: channel, level: 'info' });
    try {
      return await handler(event, ...args);
    } catch (error) {
      if (!(error instanceof CatalogError) || error.code === 'parse') {
        reportError(error, { tags: { channel } });
      }
      throw error;
    }
  });
};

export const registerIpcHandlers = (): void => {
  // Synchronous so the preload can resolve the flags as a constant at load time.
  ipcMain.on(IpcChannels.getFeatureFlags, (event) => {
    event.returnValue = getFeatureFlags();
  });

  handleInvoke(
    IpcChannels.getAppInfo,
    (): AppInfo => ({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    }),
  );

  handleInvoke(IpcChannels.getSetupState, () => computeSetupState());

  handleInvoke(IpcChannels.startGame, async (): Promise<StartGameResult> => {
    const { gameRootPath } = await loadSettings();
    const result = await startGame(gameRootPath);
    // On success, quit so Findias isn't running alongside the game. Deferred a
    // tick so the launcher hand-off completes and the renderer's invoke settles
    // before the app exits.
    if (result.isOk) setTimeout(() => app.quit(), 100);
    return result;
  });

  handleInvoke(IpcChannels.listForeignMods, () => getForeignMods());

  handleInvoke(IpcChannels.completeModSetup, (_event, shouldArchive: boolean) =>
    completeModSetup(shouldArchive),
  );

  handleInvoke(IpcChannels.refresh, () => refresh());

  handleInvoke(IpcChannels.installOrUpdate, (event, modId: string) =>
    installOrUpdate(event, modId),
  );

  handleInvoke(IpcChannels.deleteMod, (_event, modId: string) => deleteMod(modId));

  handleInvoke(IpcChannels.setDisabled, (_event, modId: string, isDisabled: boolean) =>
    setDisabled(modId, isDisabled),
  );

  handleInvoke(
    IpcChannels.setShouldIncludePrereleases,
    (_event, shouldIncludePrereleases: boolean) =>
      setShouldIncludePrereleases(shouldIncludePrereleases),
  );

  handleInvoke(IpcChannels.setErrorReportingEnabled, (_event, isEnabled: boolean) =>
    setErrorReportingEnabled(isEnabled),
  );

  ipcMain.on(IpcChannels.installUpdate, () => quitAndInstallUpdate());

  ipcMain.on(IpcChannels.openExternal, (_event, url: string) => openExternalUrl(url));

  ipcMain.on(IpcChannels.windowMinimize, (event) =>
    BrowserWindow.fromWebContents(event.sender)?.minimize(),
  );

  ipcMain.on(IpcChannels.windowClose, (event) =>
    BrowserWindow.fromWebContents(event.sender)?.close(),
  );

  handleInvoke(IpcChannels.chooseGameFolder, async (event): Promise<ChooseFolderResult> => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      title: 'Select your Mabinogi game folder (appdata)',
      properties: ['openDirectory' as const],
    };

    const result = owner
      ? await dialog.showOpenDialog(owner, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return { isOk: false, isCanceled: true };
    }

    const chosen = result.filePaths[0];
    const validation = await validateGameRoot(chosen);
    if (!validation.isOk) {
      return { isOk: false, error: validation.error };
    }

    // Reset the one-time mod-archive step so the newly chosen folder is
    // re-checked for pre-existing mods.
    const settings = await loadSettings();
    await saveSettings({ ...settings, gameRootPath: chosen, isModSetupCompleted: false });
    return { isOk: true, state: await computeSetupState() };
  });

  // Dev-only telemetry self-test paths for the Settings panel. Guarded on
  // `import.meta.env.DEV` so the whole block is dead-stripped from packaged
  // builds — the renderer only ever calls this from the dev:log-gated panel.
  if (import.meta.env.DEV) {
    ipcMain.handle(
      IpcChannels.debugTelemetry,
      (_event, kind: 'report' | 'throw' | 'nativeCrash') => {
        if (kind === 'report') return reportError(new Error('Sentry test: main manual report'));
        if (kind === 'nativeCrash') return process.crash();
        setTimeout(() => {
          throw new Error('Sentry test: main uncaught');
        });
      },
    );
  }
};
