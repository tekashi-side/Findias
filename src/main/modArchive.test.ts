import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { resolveGamePaths } from './gameLocation';
import { archiveForeignMods, hasForeignMods, listForeignMods } from './modArchive';

const root = `${process.env.TEMP ?? process.env.TMPDIR ?? '/tmp'}/findias-modarchive-test`;
const paths = resolveGamePaths(root);

const touch = async (dir: string, name: string, contents = 'x'): Promise<void> => {
  await fs.writeFile(join(dir, name), contents, 'utf-8');
};

describe('listForeignMods / hasForeignMods', () => {
  beforeEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(paths.packageDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('treats every non-official .it file as an orphan when the catalog is unavailable', async () => {
    await touch(paths.packageDir, 'uisciasZoom_5.it');
    await touch(paths.packageDir, 'SomeCustomMod_00001.it');
    await touch(paths.packageDir, 'data_00001.it'); // official, ignored
    await touch(paths.packageDir, 'notes.txt'); // not a mod, ignored

    const list = await listForeignMods(paths, null);

    expect(list).toContainEqual({ fileName: 'uisciasZoom_5.it', displayName: 'uisciasZoom' });
    expect(list).toContainEqual({
      fileName: 'SomeCustomMod_00001.it',
      displayName: 'SomeCustomMod',
    });
    expect(list).toHaveLength(2);
    expect(await hasForeignMods(paths, null)).toBe(true);
  });

  it('excludes catalog mods, keeping only orphans, when a catalog is provided', async () => {
    await touch(paths.packageDir, 'uisciasZoom_5.it'); // modId "Zoom" -> in catalog
    await touch(paths.packageDir, 'uisciasOldMod_2.it'); // modId "OldMod" -> orphan
    await touch(paths.packageDir, 'uotiara.it'); // foreign -> orphan

    const knownModIds = new Set(['Zoom']);
    const list = await listForeignMods(paths, knownModIds);

    expect(list.map((m) => m.fileName).sort()).toEqual(['uisciasOldMod_2.it', 'uotiara.it']);
    expect(await hasForeignMods(paths, knownModIds)).toBe(true);
  });

  it('reports no orphans when every non-official mod is in the catalog', async () => {
    await touch(paths.packageDir, 'uisciasZoom_5.it');
    const knownModIds = new Set(['Zoom']);
    expect(await listForeignMods(paths, knownModIds)).toEqual([]);
    expect(await hasForeignMods(paths, knownModIds)).toBe(false);
  });

  it('reports none when only official files are present', async () => {
    await touch(paths.packageDir, 'data_00001.it');
    expect(await listForeignMods(paths, null)).toEqual([]);
    expect(await hasForeignMods(paths, null)).toBe(false);
  });
});

describe('archiveForeignMods', () => {
  beforeEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(paths.packageDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('moves orphan mods into package/archived and leaves official files', async () => {
    await touch(paths.packageDir, 'uisciasZoom_5.it');
    await touch(paths.packageDir, 'randommod.it');
    await touch(paths.packageDir, 'data_00001.it');

    const moved = await archiveForeignMods(paths, null);

    expect(moved).toBe(2);
    expect((await fs.readdir(paths.packageDir)).sort()).toEqual(['archived', 'data_00001.it']);
    expect((await fs.readdir(paths.archivedDir)).sort()).toEqual([
      'randommod.it',
      'uisciasZoom_5.it',
    ]);
  });

  it('leaves catalog mods in place and only archives orphans', async () => {
    await touch(paths.packageDir, 'uisciasZoom_5.it'); // in catalog -> keep
    await touch(paths.packageDir, 'uisciasOldMod_2.it'); // orphan -> archive

    const moved = await archiveForeignMods(paths, new Set(['Zoom']));

    expect(moved).toBe(1);
    expect((await fs.readdir(paths.packageDir)).sort()).toEqual(['archived', 'uisciasZoom_5.it']);
    expect(await fs.readdir(paths.archivedDir)).toEqual(['uisciasOldMod_2.it']);
  });

  it('preserves the exact file name via a suffixed subfolder on collision', async () => {
    // A previous archive already holds a file with the same name.
    await fs.mkdir(paths.archivedDir, { recursive: true });
    await touch(paths.archivedDir, 'randommod.it', 'old');
    await touch(paths.packageDir, 'randommod.it', 'new');

    await archiveForeignMods(paths, null);

    // The original archived copy is untouched...
    expect(await fs.readFile(join(paths.archivedDir, 'randommod.it'), 'utf-8')).toBe('old');
    // ...and the new one is nested under a suffixed folder, name unchanged.
    const nested = join(paths.archivedDir, 'randommod.it (1)', 'randommod.it');
    expect(await fs.readFile(nested, 'utf-8')).toBe('new');
    // The package root no longer contains the moved file.
    expect(await fs.readdir(paths.packageDir)).toEqual(['archived']);
  });

  it('is a no-op when there are no orphan mods', async () => {
    await touch(paths.packageDir, 'data_00001.it');
    expect(await archiveForeignMods(paths, null)).toBe(0);
    expect(await fs.readdir(paths.packageDir)).toEqual(['data_00001.it']);
  });
});
