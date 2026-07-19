import { describe, expect, it, vi } from 'vitest';

// gameLauncher imports `shell` from electron at module load; stub it so the
// module can be imported without a running Electron runtime. detectLauncher is
// pure and never touches it.
vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }));

import { detectLauncher } from './gameLauncher';

describe('detectLauncher', () => {
  it('detects Steam from a default Steam library path', () => {
    expect(
      detectLauncher('C:\\Program Files (x86)\\Steam\\steamapps\\common\\Mabinogi\\appdata'),
    ).toBe('steam');
  });

  it('detects Steam from a custom-drive Steam library path', () => {
    expect(detectLauncher('D:\\SteamLibrary\\steamapps\\common\\Mabinogi\\appdata')).toBe('steam');
  });

  it('detects Steam regardless of case', () => {
    expect(detectLauncher('C:\\Games\\SteamApps\\common\\Mabinogi\\appdata')).toBe('steam');
  });

  it('detects Nexon from a default Nexon Launcher path', () => {
    expect(detectLauncher('C:\\Nexon\\Library\\mabinogi\\appdata')).toBe('nexon');
  });

  it('treats any non-Steam path as Nexon', () => {
    expect(detectLauncher('D:\\Games\\mabinogi\\appdata')).toBe('nexon');
  });

  it('handles forward-slash paths', () => {
    expect(detectLauncher('C:/Program Files (x86)/Steam/steamapps/common/Mabinogi/appdata')).toBe(
      'steam',
    );
  });
});
