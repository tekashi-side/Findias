import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectDefaultGameRoots,
  getDefaultGameRootCandidates,
  resolveGamePaths,
  validateGameRoot,
} from './gameLocation';

describe('resolveGamePaths', () => {
  it('derives package and disabled paths under the root', () => {
    const root = join('X:', 'game', 'appdata');
    const paths = resolveGamePaths(root);
    expect(paths.root).toBe(root);
    expect(paths.packageDir).toBe(join(root, 'package'));
    expect(paths.disabledDir).toBe(join(root, 'package', 'disabled'));
    expect(paths.archivedDir).toBe(join(root, 'package', 'archived'));
  });
});

describe('validateGameRoot', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(join(tmpdir(), 'findias-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('rejects empty input', async () => {
    expect((await validateGameRoot('')).isOk).toBe(false);
  });

  it('rejects a non-existent folder', async () => {
    expect((await validateGameRoot(join(tmp, 'missing'))).isOk).toBe(false);
  });

  it('rejects a folder without a package subfolder', async () => {
    const result = await validateGameRoot(tmp);
    expect(result.isOk).toBe(false);
    expect(result.error).toMatch(/package/i);
  });

  it('accepts a folder containing a package subfolder', async () => {
    await fs.mkdir(join(tmp, 'package'));
    expect((await validateGameRoot(tmp)).isOk).toBe(true);
  });
});

describe('getDefaultGameRootCandidates', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds Nexon and Steam paths from Windows env vars', () => {
    process.env.SystemDrive = 'D:';
    process.env['ProgramFiles(x86)'] = 'D:\\Program Files (x86)';

    const systemRoot = 'D:\\';
    const programFilesX86 = 'D:\\Program Files (x86)';

    // Build expected paths with the same `join` the code uses so separators match the host OS.
    expect(getDefaultGameRootCandidates()).toEqual([
      join(systemRoot, 'Nexon', 'Library', 'mabinogi', 'appdata'),
      join(programFilesX86, 'Steam', 'steamapps', 'common', 'Mabinogi', 'appdata'),
    ]);
  });

  it('falls back when env vars are missing', () => {
    delete process.env.SystemDrive;
    delete process.env['ProgramFiles(x86)'];
    delete process.env.ProgramFiles;

    const systemRoot = 'C:\\';
    const programFilesX86 = join(systemRoot, 'Program Files (x86)');

    expect(getDefaultGameRootCandidates()).toEqual([
      join(systemRoot, 'Nexon', 'Library', 'mabinogi', 'appdata'),
      join(programFilesX86, 'Steam', 'steamapps', 'common', 'Mabinogi', 'appdata'),
    ]);
  });
});

describe('detectDefaultGameRoots', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(join(tmpdir(), 'findias-detect-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const candidate = (name: string): string => join(tmp, name);

  it('returns no paths when none are valid', async () => {
    const candidates = [candidate('nexon'), candidate('steam')];
    expect(await detectDefaultGameRoots(candidates)).toEqual([]);
  });

  it('returns one path when a single candidate is valid', async () => {
    const nexon = candidate('nexon');
    await fs.mkdir(join(nexon, 'package'), { recursive: true });
    const steam = candidate('steam');

    expect(await detectDefaultGameRoots([nexon, steam])).toEqual([nexon]);
  });

  it('returns both paths when both candidates are valid', async () => {
    const nexon = candidate('nexon');
    const steam = candidate('steam');
    await fs.mkdir(join(nexon, 'package'), { recursive: true });
    await fs.mkdir(join(steam, 'package'), { recursive: true });

    expect(await detectDefaultGameRoots([nexon, steam])).toEqual([nexon, steam]);
  });
});
