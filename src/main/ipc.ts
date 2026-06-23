import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import {
  IpcChannels,
  type AppInfo,
  type ChooseFolderResult,
  type SetupState
} from '../shared/api'
import type { ModListState } from '../shared/modList'
import { loadSettings, saveSettings } from './settingsStore'
import { resolveGamePaths, validateGameRoot, type ValidationResult } from './gameLocation'
import { resolveModList } from './modResolver'
import { CatalogError } from './providers/catalog'
import { createGitHubReleaseCatalogProvider } from './providers/githubReleaseCatalog'
import { createPackageFolderProvider } from './providers/packageFolder'

/** Resolve the current setup state by re-validating the stored path on disk. */
const computeSetupState = async (): Promise<SetupState> => {
  const { gameRootPath } = await loadSettings()
  if (!gameRootPath) {
    return { gameRootPath: null, valid: false }
  }
  const { ok } = await validateGameRoot(gameRootPath)
  return { gameRootPath, valid: ok }
}

/**
 * Scan the package folder and fetch the catalog, then resolve them into the mod
 * list. A catalog failure (offline, rate-limited) degrades softly: installed
 * mods are still returned (as orphans) so the user can manage them, and the
 * failure is reported via `catalog.available`.
 */
const refresh = async (): Promise<ModListState> => {
  const { gameRootPath } = await loadSettings()
  const validation: ValidationResult = gameRootPath
    ? await validateGameRoot(gameRootPath)
    : { ok: false, error: 'No game folder is configured.' }

  if (!gameRootPath || !validation.ok) {
    throw new Error(validation.error ?? 'No game folder is configured.')
  }

  const paths = resolveGamePaths(gameRootPath)
  const installed = await createPackageFolderProvider(paths).list()

  try {
    const catalog = await createGitHubReleaseCatalogProvider().getCatalog()
    return { rows: resolveModList(catalog, installed), catalog: { available: true } }
  } catch (error) {
    const message =
      error instanceof CatalogError ? error.message : 'Could not load the mod catalog.'
    return { rows: resolveModList([], installed), catalog: { available: false, error: message } }
  }
}

export const registerIpcHandlers = (): void => {
  ipcMain.handle(
    IpcChannels.getAppInfo,
    (): AppInfo => ({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node
    })
  )

  ipcMain.handle(IpcChannels.getSetupState, () => computeSetupState())

  ipcMain.handle(IpcChannels.refresh, () => refresh())

  ipcMain.handle(IpcChannels.chooseGameFolder, async (event): Promise<ChooseFolderResult> => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions = {
      title: 'Select your Mabinogi game folder (appdata)',
      properties: ['openDirectory' as const]
    }

    const result = owner
      ? await dialog.showOpenDialog(owner, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true }
    }

    const chosen = result.filePaths[0]
    const validation = await validateGameRoot(chosen)
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }

    const settings = await loadSettings()
    await saveSettings({ ...settings, gameRootPath: chosen })
    return { ok: true, state: { gameRootPath: chosen, valid: true } }
  })
}
