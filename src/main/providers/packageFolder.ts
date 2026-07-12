import { type Dirent, promises as fs } from 'node:fs';
import type { GamePaths } from '../../shared/api';
import { isOfficialGameFile, parseManagedModFileName } from '../../shared/modFilename';
import type { InstalledMod, InstalledModsProvider } from './installed';

/** A `.it` file is a mod candidate unless it's an official game data file. */
const isModFile = (name: string): boolean => name.toLowerCase().endsWith('.it');

/** Read a directory's entries, treating a missing directory as empty. */
const readDirSafe = async (dir: string): Promise<Dirent[]> => {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // A missing folder (e.g. no package/disabled yet) is a normal empty result.
    return [];
  }
};

/**
 * Scan a single directory into `InstalledMod[]`. Managed files (`uiscias<name>_<v>.it`)
 * are keyed by their parsed modId; every other non-official `.it` file is a
 * foreign mod keyed by its full file name. Official `data_*.it` files, non-`.it`
 * files, and subdirectories (`disabled/`, `archived/`) are skipped.
 */
const listInDir = async (dir: string, isEnabled: boolean): Promise<InstalledMod[]> => {
  const mods: InstalledMod[] = [];
  for (const entry of await readDirSafe(dir)) {
    if (!entry.isFile()) continue;
    if (!isModFile(entry.name) || isOfficialGameFile(entry.name)) continue;

    const parsed = parseManagedModFileName(entry.name);
    if (parsed) {
      mods.push({
        modId: parsed.modId,
        version: parsed.version,
        fileName: parsed.fileName,
        isEnabled,
        isManaged: true,
      });
    } else {
      // Foreign mod from another provider: identity is the full file name.
      mods.push({
        modId: entry.name,
        version: 0,
        fileName: entry.name,
        isEnabled,
        isManaged: false,
      });
    }
  }
  return mods;
};

/**
 * Current `InstalledModsProvider`: the package folder *is* the record. Managed
 * `.it` files in the root of `package` are enabled; those in `package/disabled`
 * are disabled. Foreign (non-official) `.it` files are also surfaced so the user
 * can see and manage mods installed from other providers. Official `data_*.it`
 * files and everything else are ignored and never touched. Swappable for an
 * `installedMods.json` strategy by adding a sibling file that implements the
 * same interface — no consumer changes.
 */
export const createPackageFolderProvider = (paths: GamePaths): InstalledModsProvider => {
  return {
    list: async (): Promise<InstalledMod[]> => {
      const [enabledMods, disabledMods] = await Promise.all([
        listInDir(paths.packageDir, true),
        listInDir(paths.disabledDir, false),
      ]);
      return [...enabledMods, ...disabledMods];
    },
  };
};
