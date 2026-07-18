import { beforeEach, describe, expect, it, vi } from 'vitest';

// ipc.ts imports `electron` and pulls in the updater / catalog provider at module
// load. Mock those (and the two collaborators the tested logic depends on) so the
// module imports cleanly under Vitest and the inputs are fully controllable. The
// shared `IpcChannels` map is intentionally NOT mocked so the handler test keys
// off the real channel name.
const { loadSettingsMock, isFeatureEnabledMock, getFeatureFlagsMock, ipcMainMock } = vi.hoisted(
  () => ({
    loadSettingsMock: vi.fn(),
    isFeatureEnabledMock: vi.fn(),
    getFeatureFlagsMock: vi.fn(),
    ipcMainMock: { handle: vi.fn(), on: vi.fn() },
  }),
);

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
// telemetry pulls in @sentry/electron/main at import; stub it so ipc imports cleanly.
vi.mock('./telemetry', () => ({
  reportError: vi.fn(),
  setErrorReportingEnabled: vi.fn(),
  addBreadcrumb: vi.fn(),
  setModContext: vi.fn(),
}));

import { arePrereleasesEligible, registerIpcHandlers } from './ipc';
import { IpcChannels } from '../shared/api';

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
