import { describe, expect, it } from 'vitest';
import { getAppMenuRoles } from './appMenu';

const ZOOM_ROLES = ['zoomIn', 'zoomOut', 'resetZoom'] as const;

describe('getAppMenuTemplate', () => {
  it.each([false, true])('omits zoom roles when isPackaged=%s', (isPackaged) => {
    const roles = getAppMenuRoles(isPackaged);
    for (const role of ZOOM_ROLES) {
      expect(roles).not.toContain(role);
    }
  });

  it('includes reload in packaged builds without dev-only View items', () => {
    const roles = getAppMenuRoles(true);
    expect(roles).toContain('reload');
    expect(roles).not.toContain('forceReload');
    expect(roles).not.toContain('toggleDevTools');
  });

  it('includes reload, forceReload, and toggleDevTools in dev builds', () => {
    const roles = getAppMenuRoles(false);
    expect(roles).toContain('reload');
    expect(roles).toContain('forceReload');
    expect(roles).toContain('toggleDevTools');
  });
});
