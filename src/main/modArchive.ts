import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { ForeignMod, GamePaths } from '../shared/api';
import {
  isOfficialGameFile,
  orphanDisplayName,
  parseManagedModFileName,
} from '../shared/modFilename';

/**
 * One-time setup helpers for pre-existing mods sitting in the package root that
 * Findias can't manage (orphans). On first setup (or after switching to a new
 * game folder) the user is offered the choice to archive these — moving them
 * into `package/archived`, which the game never loads and Findias never scans —
 * so they don't conflict with the mods Findias manages.
 *
 * A file is an orphan candidate when it is a non-official `.it` file whose modId
 * is absent from the current catalog. Mods that ARE in the catalog are left
 * alone: Findias will simply adopt them on the main screen, so archiving them
 * would be wrong. The catalog membership is passed in as `knownModIds`; when it
 * is `null` (catalog unavailable) every non-official file is treated as an
 * orphan, matching the resolver's offline behavior.
 *
 * Nothing is ever deleted, and mod files are never renamed (renaming an `.it`
 * file bricks it). Name collisions inside `archived` are resolved by nesting the
 * file in a suffixed subfolder, preserving the original file name verbatim.
 */

/** A non-official `.it` file lives in the package root and is not a game data file. */
const isForeignModFile = (name: string): boolean =>
  name.toLowerCase().endsWith('.it') && !isOfficialGameFile(name);

/** File names of all non-official `.it` files in the package root. */
const foreignFileNames = async (paths: GamePaths): Promise<string[]> => {
  let entries;
  try {
    entries = await fs.readdir(paths.packageDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && isForeignModFile(entry.name))
    .map((entry) => entry.name);
};

/**
 * File names of the orphan mods in the package root: non-official `.it` files
 * whose modId is not in `knownModIds`. Managed files match the catalog by their
 * parsed modId; anything else uses its full file name (never in the catalog).
 * A `null` catalog treats every non-official file as an orphan.
 */
const orphanFileNames = async (
  paths: GamePaths,
  knownModIds: Set<string> | null,
): Promise<string[]> => {
  const names = await foreignFileNames(paths);
  if (!knownModIds) return names;
  return names.filter((name) => {
    const modId = parseManagedModFileName(name)?.modId ?? name;
    return !knownModIds.has(modId);
  });
};

/** List the orphan mods in the package root (for the archive step). */
export const listForeignMods = async (
  paths: GamePaths,
  knownModIds: Set<string> | null,
): Promise<ForeignMod[]> => {
  const names = await orphanFileNames(paths, knownModIds);
  return names.map((fileName) => ({ fileName, displayName: orphanDisplayName(fileName) }));
};

/** Whether any orphan mods are present in the package root. */
export const hasForeignMods = async (
  paths: GamePaths,
  knownModIds: Set<string> | null,
): Promise<boolean> => (await orphanFileNames(paths, knownModIds)).length > 0;

/** Whether a path exists (of any type). */
const pathExists = async (path: string): Promise<boolean> => {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Resolve a non-colliding destination for `fileName` inside `archivedDir`,
 * keeping the file name unchanged. If `archived/<fileName>` is free it is used;
 * otherwise the file is nested in the next free `archived/<fileName> (n)/`
 * subfolder so both copies are preserved and the duplication is visible.
 */
const resolveArchiveTarget = async (archivedDir: string, fileName: string): Promise<string> => {
  const direct = join(archivedDir, fileName);
  if (!(await pathExists(direct))) return direct;

  for (let n = 1; ; n += 1) {
    const subDir = join(archivedDir, `${fileName} (${n})`);
    if (!(await pathExists(subDir))) {
      await fs.mkdir(subDir, { recursive: true });
      return join(subDir, fileName);
    }
  }
};

/**
 * Move every orphan mod from the package root into `package/archived`,
 * preserving each file's exact name. Mods present in the catalog are left in
 * place. Returns the number of files archived. Idempotent-ish: files already
 * archived earlier are left in place and collisions are nested rather than
 * overwritten.
 */
export const archiveForeignMods = async (
  paths: GamePaths,
  knownModIds: Set<string> | null,
): Promise<number> => {
  const names = await orphanFileNames(paths, knownModIds);
  if (names.length === 0) return 0;

  await fs.mkdir(paths.archivedDir, { recursive: true });
  for (const name of names) {
    const target = await resolveArchiveTarget(paths.archivedDir, name);
    await fs.rename(join(paths.packageDir, name), target);
  }
  return names.length;
};
