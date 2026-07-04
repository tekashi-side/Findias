import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  IpcChannels,
  type AppInfo,
  type ChooseFolderResult,
  type DownloadProgress,
  type ForeignMod,
  type GamePaths,
  type SetupState,
} from '../shared/api';
import type { ModListState } from '../shared/modList';
import { loadSettings, saveSettings } from './settingsStore';
import { getFeatureFlags, isFeatureEnabled } from './featureFlags';
import { resolveGamePaths, validateGameRoot, type ValidationResult } from './gameLocation';
import { catalogModIds, resolveModList } from './modResolver';
import { installOrUpdateMod } from './modInstaller';
import { archiveForeignMods, hasForeignMods, listForeignMods } from './modArchive';
import { quitAndInstallUpdate } from './updater';
import { createPackageModStore } from './modStore';
import { CatalogError, type Catalog } from './providers/catalog';
import { createManifestCatalogProvider } from './providers/manifestCatalog';
import { createLoggingFetch } from './providers/loggingFetch';
import { createPackageFolderProvider } from './providers/packageFolder';

/**
 * Resolve the dev network logger from `FINDIAS_LOG_NETWORK` (tri-state):
 * unset -> on in development, off when packaged; `0`/`false` -> force off;
 * `1`/`true` -> force on; `verbose` -> force on and also dump (redacted) headers.
 * Returns `undefined` when logging is off, so the default `fetch` is used.
 */
const resolveLoggingFetch = () => {
  const mode = process.env.FINDIAS_LOG_NETWORK;
  const off = mode === '0' || mode === 'false';
  const on = mode === '1' || mode === 'true' || mode === 'verbose' || (!off && !app.isPackaged);
  return on ? createLoggingFetch({ verbose: mode === 'verbose' }) : undefined;
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
 * fetched. Null means "can't verify", so the archive step treats every
 * pre-existing non-official mod as an orphan (consistent with resolveModList's
 * offline behavior). Uses the shared cached provider, so this warms the cache
 * for the mod-list refresh that follows setup.
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
  const { gameRootPath, modSetupCompleted } = await loadSettings();
  const shouldIncludePrereleases = await arePrereleasesEligible();
  if (!gameRootPath) {
    return { gameRootPath: null, valid: false, shouldIncludePrereleases, needsModArchive: false };
  }
  const { ok } = await validateGameRoot(gameRootPath);
  // Only scan while the one-time archive step is pending. The cheap folder check
  // runs first so the catalog is fetched only when pre-existing mods exist, and
  // orphans are then determined against the catalog (mods already in the catalog
  // are legit and must not be flagged/archived).
  let needsModArchive = false;
  if (ok && !modSetupCompleted) {
    const paths = resolveGamePaths(gameRootPath);
    const anyForeign = await hasForeignMods(paths, null);
    needsModArchive = anyForeign && (await hasForeignMods(paths, await resolveCatalogModIds()));
  }
  return { gameRootPath, valid: ok, shouldIncludePrereleases, needsModArchive };
};

/** Resolve the stored game paths, throwing a clear error if setup is invalid. */
const requireGamePaths = async (): Promise<GamePaths> => {
  const { gameRootPath } = await loadSettings();
  const validation: ValidationResult = gameRootPath
    ? await validateGameRoot(gameRootPath)
    : { ok: false, error: 'No game folder is configured.' };

  if (!gameRootPath || !validation.ok) {
    throw new Error(validation.error ?? 'No game folder is configured.');
  }
  return resolveGamePaths(gameRootPath);
};

/**
 * Build the current mod list: scan the package folder + fetch the catalog, then
 * resolve. A catalog failure (offline, rate-limited, no manifest) degrades
 * softly — installed mods are still returned (as orphans) so the user can manage
 * them, and the failure is reported via `catalog.available`.
 */
const resolveCurrentState = async (
  paths: GamePaths,
  options: { force?: boolean } = {},
): Promise<ModListState> => {
  const shouldIncludePrereleases = await arePrereleasesEligible();
  const installed = await createPackageFolderProvider(paths).list();
  try {
    const catalog = await catalogProvider.getCatalog(shouldIncludePrereleases, {
      force: options.force,
    });
    const { groups, metadata } = resolveModList(catalog, installed);
    return { groups, catalog: { available: true }, metadata };
  } catch (error) {
    const message =
      error instanceof CatalogError ? error.message : 'Could not load the mod catalog.';
    const { groups, metadata } = resolveModList(null, installed);
    return { groups, catalog: { available: false, error: message }, metadata };
  }
};

// The Refresh button is the explicit "check for updates" action, so it forces a
// revalidation (a free 304 when the feed is unchanged) rather than serving the
// TTL-cached catalog.
const refresh = async (): Promise<ModListState> =>
  resolveCurrentState(await requireGamePaths(), { force: true });

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
  const replaceSiblings = group.mutuallyExclusive
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
  return { groups, catalog: { available: true }, metadata };
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
 * Complete the one-time mod-archive setup step. When `archive` is true, move
 * every orphan mod (non-official and absent from the catalog) into
 * `package/archived`; catalog mods are left in place. Always persist the
 * completion flag so the step is not shown again for this folder, then return
 * the fresh setup state.
 */
const completeModSetup = async (archive: boolean): Promise<SetupState> => {
  if (archive) {
    await archiveForeignMods(await requireGamePaths(), await resolveCatalogModIds());
  }
  const settings = await loadSettings();
  await saveSettings({ ...settings, modSetupCompleted: true });
  return computeSetupState();
};

/** Move a mod in/out of `package/disabled`, then return the fresh mod list. */
const setDisabled = async (modId: string, disabled: boolean): Promise<ModListState> => {
  const paths = await requireGamePaths();
  await createPackageModStore(paths).setDisabled(modId, disabled);
  return resolveCurrentState(paths);
};

/**
 * Persist the prerelease preference, then re-resolve against the new filter.
 * When the `prereleases` feature is inactive the control is hidden in the UI, so
 * this is a defensive guard: a request to enable is ignored (never persisted)
 * and the settings are left untouched.
 */
const setShouldIncludePrereleases = async (value: boolean): Promise<ModListState> => {
  if (isFeatureEnabled('prereleases')) {
    const settings = await loadSettings();
    await saveSettings({ ...settings, shouldIncludePrereleases: value });
  }
  return resolveCurrentState(await requireGamePaths());
};

export const registerIpcHandlers = (): void => {
  // Synchronous so the preload can resolve the flags as a constant at load time.
  ipcMain.on(IpcChannels.getFeatureFlags, (event) => {
    event.returnValue = getFeatureFlags();
  });

  ipcMain.handle(
    IpcChannels.getAppInfo,
    (): AppInfo => ({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    }),
  );

  ipcMain.handle(IpcChannels.getSetupState, () => computeSetupState());

  ipcMain.handle(IpcChannels.listForeignMods, () => getForeignMods());

  ipcMain.handle(IpcChannels.completeModSetup, (_event, archive: boolean) =>
    completeModSetup(archive),
  );

  ipcMain.handle(IpcChannels.refresh, () => refresh());

  ipcMain.handle(IpcChannels.installOrUpdate, (event, modId: string) =>
    installOrUpdate(event, modId),
  );

  ipcMain.handle(IpcChannels.deleteMod, (_event, modId: string) => deleteMod(modId));

  ipcMain.handle(IpcChannels.setDisabled, (_event, modId: string, disabled: boolean) =>
    setDisabled(modId, disabled),
  );

  ipcMain.handle(IpcChannels.setShouldIncludePrereleases, (_event, value: boolean) =>
    setShouldIncludePrereleases(value),
  );

  ipcMain.on(IpcChannels.installUpdate, () => quitAndInstallUpdate());

  ipcMain.on(IpcChannels.windowMinimize, (event) =>
    BrowserWindow.fromWebContents(event.sender)?.minimize(),
  );

  ipcMain.on(IpcChannels.windowClose, (event) =>
    BrowserWindow.fromWebContents(event.sender)?.close(),
  );

  ipcMain.handle(IpcChannels.chooseGameFolder, async (event): Promise<ChooseFolderResult> => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      title: 'Select your Mabinogi game folder (appdata)',
      properties: ['openDirectory' as const],
    };

    const result = owner
      ? await dialog.showOpenDialog(owner, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }

    const chosen = result.filePaths[0];
    const validation = await validateGameRoot(chosen);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    // Reset the one-time mod-archive step so the newly chosen folder is
    // re-checked for pre-existing mods.
    const settings = await loadSettings();
    await saveSettings({ ...settings, gameRootPath: chosen, modSetupCompleted: false });
    return { ok: true, state: await computeSetupState() };
  });
};
