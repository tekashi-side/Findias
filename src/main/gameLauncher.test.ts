import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

// gameLauncher imports `shell` from electron at module load; stub it so the
// module can be imported without a running Electron runtime. detectLauncher is
// pure and never touches it.
vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }));

// resolveNexonLogCwd probes the filesystem for the Nexon Launcher dir; stub it so
// the tests control whether that dir "exists".
vi.mock('node:fs', () => ({ existsSync: vi.fn() }));

import { detectLauncher, resolveNexonLogCwd } from './gameLauncher';

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

describe('resolveNexonLogCwd', () => {
  const originalEnv = process.env['ProgramFiles(x86)'];

  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    process.env['ProgramFiles(x86)'] = 'C:\\Program Files (x86)';
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env['ProgramFiles(x86)'];
    else process.env['ProgramFiles(x86)'] = originalEnv;
  });

  it('returns the Nexon Launcher dir when it exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    expect(resolveNexonLogCwd()).toBe('C:\\Program Files (x86)\\Nexon\\Nexon Launcher');
  });

  it('falls back to the OS temp dir when the Nexon Launcher dir is missing', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(resolveNexonLogCwd()).toBe(tmpdir());
  });
});
