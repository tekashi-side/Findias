import { afterEach, describe, expect, it, vi } from 'vitest';

// `featureFlags` reads `app.isPackaged` at call time, so a mutable mock lets a
// single import be re-evaluated under both dev (unpackaged) and packaged states.
const electronMock = vi.hoisted(() => ({ app: { isPackaged: false } }));
vi.mock('electron', () => electronMock);

import { getFeatureFlags, isFeatureEnabled } from './featureFlags';

afterEach(() => {
  electronMock.app.isPackaged = false;
});

describe('dev-only feature flags', () => {
  it('are active in unpackaged builds', () => {
    electronMock.app.isPackaged = false;
    expect(isFeatureEnabled('prereleases')).toBe(true);
    expect(isFeatureEnabled('previewAppUpdateToast')).toBe(true);
    expect(getFeatureFlags()).toEqual({ prereleases: true, previewAppUpdateToast: true });
  });

  it('are inactive in packaged builds', () => {
    electronMock.app.isPackaged = true;
    expect(isFeatureEnabled('prereleases')).toBe(false);
    expect(isFeatureEnabled('previewAppUpdateToast')).toBe(false);
    expect(getFeatureFlags()).toEqual({ prereleases: false, previewAppUpdateToast: false });
  });
});
