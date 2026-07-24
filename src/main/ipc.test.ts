import { beforeEach, describe, expect, it, vi } from 'vitest';

// ipc.ts imports `electron` and pulls in the updater / catalog provider at module
// load. Mock those (and the two collaborators the tested logic depends on) so the
// module imports cleanly under Vitest and the inputs are fully controllable. The
// shared `IpcChannels` map is intentionally NOT mocked so the handler test keys
// off the real channel name.
const {
  loadSettingsMock,
  isFeatureEnabledMock,
  getFeatureFlagsMock,
  ipcMainMock,
  reportErrorMock,
  grantPackageWriteAccessMock,
  validateGameRootMock,
  resolveGamePathsMock,
} = vi.hoisted(() => ({
  loadSettingsMock: vi.fn(),
  isFeatureEnabledMock: vi.fn(),
  getFeatureFlagsMock: vi.fn(),
  ipcMainMock: { handle: vi.fn(), on: vi.fn() },
  reportErrorMock: vi.fn(),
  grantPackageWriteAccessMock: vi.fn(),
  validateGameRootMock: vi.fn(),
  resolveGamePathsMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { isPackaged: true },
  BrowserWindow: {},
  dialog: {},
  ipcMain: ipcMainMock,
}));
vi.mock('./updater', () => ({ quitAndInstallUpdate: vi.fn() }));
vi.mock('./providers/manifestCatalog', () => ({
  createManifestCatalogProvider: () => ({ getCatalog: vi.fn() }),
}));
vi.mock('./settingsStore', () => ({ loadSettings: loadSettingsMock, saveSettings: vi.fn() }));
vi.mock('./featureFlags', () => ({
  isFeatureEnabled: isFeatureEnabledMock,
  getFeatureFlags: getFeatureFlagsMock,
}));
vi.mock('./elevation', () => ({ grantPackageWriteAccess: grantPackageWriteAccessMock }));
// gameLocation touches the filesystem; stub it so requireGamePaths is controllable.
vi.mock('./gameLocation', () => ({
  validateGameRoot: validateGameRootMock,
  resolveGamePaths: resolveGamePathsMock,
}));
// telemetry pulls in @sentry/electron/main at import; stub it so ipc imports cleanly.
vi.mock('./telemetry', () => ({
  reportError: reportErrorMock,
  setErrorReportingEnabled: vi.fn(),
  addBreadcrumb: vi.fn(),
  setModContext: vi.fn(),
}));

import { arePrereleasesEligible, registerIpcHandlers } from './ipc';
import { IpcChannels } from '../shared/api';
import { PermissionError } from './permissions';

/** Find a registered `ipcMain.handle` handler by channel, failing if absent. */
const invokeHandlerFor = (channel: string): ((event: unknown, ...args: unknown[]) => unknown) => {
  const registration = ipcMainMock.handle.mock.calls.find(([registered]) => registered === channel);
  expect(registration).toBeDefined();
  return registration![1];
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('arePrereleasesEligible', () => {
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])('persisted=%s AND flag=%s -> %s', async (shouldIncludePrereleases, flagEnabled, expected) => {
    loadSettingsMock.mockResolvedValue({ gameRootPath: null, shouldIncludePrereleases });
    isFeatureEnabledMock.mockReturnValue(flagEnabled);

    expect(await arePrereleasesEligible()).toBe(expected);
  });

  it('gates on the prereleases feature flag when the user has opted in', async () => {
    loadSettingsMock.mockResolvedValue({ gameRootPath: null, shouldIncludePrereleases: true });
    isFeatureEnabledMock.mockReturnValue(false);

    await arePrereleasesEligible();

    expect(isFeatureEnabledMock).toHaveBeenCalledWith('prereleases');
  });
});

describe('getFeatureFlags IPC handler', () => {
  it('serves the resolved flags synchronously via event.returnValue', () => {
    const flags = { prereleases: true };
    getFeatureFlagsMock.mockReturnValue(flags);

    registerIpcHandlers();

    const registration = ipcMainMock.on.mock.calls.find(
      ([channel]) => channel === IpcChannels.getFeatureFlags,
    );
    expect(registration).toBeDefined();

    const handler = registration![1] as (event: { returnValue?: unknown }) => void;
    const event: { returnValue?: unknown } = {};
    handler(event);

    expect(event.returnValue).toBe(flags);
  });
});

describe('getSetupState IPC handler', () => {
  it('reports the folder as not writable when no game folder is set', async () => {
    loadSettingsMock.mockResolvedValue({
      gameRootPath: null,
      shouldIncludePrereleases: false,
      isModSetupCompleted: false,
      isErrorReportingEnabled: true,
      shouldStartGameAutomatically: true,
    });
    isFeatureEnabledMock.mockReturnValue(false);

    registerIpcHandlers();
    const state = await invokeHandlerFor(IpcChannels.getSetupState)({});

    expect(state).toMatchObject({ isValid: false, isPackageWritable: false });
  });
});

describe('fixPackagePermissions IPC handler', () => {
  beforeEach(() => {
    loadSettingsMock.mockResolvedValue({
      gameRootPath: 'X:\\game\\appdata',
      shouldIncludePrereleases: false,
      isModSetupCompleted: true,
      isErrorReportingEnabled: true,
      shouldStartGameAutomatically: true,
    });
    isFeatureEnabledMock.mockReturnValue(false);
    validateGameRootMock.mockResolvedValue({ isOk: true });
    resolveGamePathsMock.mockReturnValue({
      root: 'X:\\game\\appdata',
      packageDir: 'X:\\game\\appdata\\package',
      disabledDir: 'X:\\game\\appdata\\package\\disabled',
      archivedDir: 'X:\\game\\appdata\\package\\archived',
    });
  });

  it('is registered', () => {
    registerIpcHandlers();
    expect(() => invokeHandlerFor(IpcChannels.fixPackagePermissions)).not.toThrow();
  });

  it('rethrows a filesystem permission error as a PermissionError, and still reports it', async () => {
    const eperm = Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
    grantPackageWriteAccessMock.mockRejectedValue(eperm);

    registerIpcHandlers();
    const handler = invokeHandlerFor(IpcChannels.fixPackagePermissions);

    await expect(handler({})).rejects.toBeInstanceOf(PermissionError);
    // Reported to Sentry with the original errno (visibility that the fix works).
    expect(reportErrorMock).toHaveBeenCalledWith(eperm, expect.anything());
  });

  it('rethrows a non-permission error unchanged', async () => {
    const boom = new Error('boom');
    grantPackageWriteAccessMock.mockRejectedValue(boom);

    registerIpcHandlers();
    const handler = invokeHandlerFor(IpcChannels.fixPackagePermissions);

    await expect(handler({})).rejects.toBe(boom);
    expect(reportErrorMock).toHaveBeenCalledWith(boom, expect.anything());
  });
});
