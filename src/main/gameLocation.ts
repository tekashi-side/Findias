import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { GamePaths } from '../shared/api';

/**
 * Resolve the x86 Program Files folder from Windows env vars (never hard-coded drive).
 * `ProgramFiles(x86)` is always set on 64-bit Windows; the `ProgramFiles` fallback only
 * fires on 32-bit Windows, where `C:\Program Files` *is* the x86 location.
 */
export const resolveProgramFilesX86 = (): string => {
  const systemDrive = process.env.SystemDrive ?? 'C:';
  const systemRoot = `${systemDrive}\\`;
  return (
    process.env['ProgramFiles(x86)'] ??
    process.env.ProgramFiles ??
    join(systemRoot, 'Program Files (x86)')
  );
};

/**
 * Default Mabinogi `appdata` paths for Nexon (system drive) and Steam (default library).
 * Nexon is only probed on `SystemDrive` (e.g. `C:\Nexon\...`); installs on other drives
 * (e.g. `D:\Nexon\...`) are not auto-detected. Steam secondary libraries are out of scope.
 */
export const getDefaultGameRootCandidates = (): string[] => {
  const systemDrive = process.env.SystemDrive ?? 'C:';
  const systemRoot = `${systemDrive}\\`;
  const programFilesX86 = resolveProgramFilesX86();

  return [
    join(systemRoot, 'Nexon', 'Library', 'mabinogi', 'appdata'),
    join(programFilesX86, 'Steam', 'steamapps', 'common', 'Mabinogi', 'appdata'),
  ];
};

/** Return candidate paths that pass {@link validateGameRoot} (order preserved). */
export const detectDefaultGameRoots = async (
  candidates: readonly string[] = getDefaultGameRootCandidates(),
): Promise<string[]> => {
  const found: string[] = [];
  for (const candidate of candidates) {
    const validation = await validateGameRoot(candidate);
    if (validation.isOk) {
      found.push(candidate);
    }
  }
  return found;
};

/** The game's loaded-content folder; only `.it` files in its root are loaded. */
export const PACKAGE_DIR_NAME = 'package';

/** Subfolder of `package` used to hold temporarily disabled mods. */
export const DISABLED_DIR_NAME = 'disabled';

/** Subfolder of `package` where pre-existing non-official mods are archived. */
export const ARCHIVED_DIR_NAME = 'archived';

export interface ValidationResult {
  isOk: boolean;
  error?: string;
}

/** Derive the package + disabled paths from a chosen game root (`appdata`). */
export const resolveGamePaths = (root: string): GamePaths => {
  const packageDir = join(root, PACKAGE_DIR_NAME);
  return {
    root,
    packageDir,
    disabledDir: join(packageDir, DISABLED_DIR_NAME),
    archivedDir: join(packageDir, ARCHIVED_DIR_NAME),
  };
};

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await fs.stat(path)).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Validate that a folder is a usable Mabinogi game root. The defining marker is
 * a `package` subfolder (where the game loads `.it` files from). We deliberately
 * do not require the folder to be named `appdata`, since installs vary.
 */
export const validateGameRoot = async (root: string): Promise<ValidationResult> => {
  if (!root) {
    return { isOk: false, error: 'No folder was selected.' };
  }
  if (!(await isDirectory(root))) {
    return { isOk: false, error: 'The selected folder no longer exists.' };
  }
  if (!(await isDirectory(resolveGamePaths(root).packageDir))) {
    return {
      isOk: false,
      error:
        'This does not look like a Mabinogi appdata folder — no "package" subfolder was found inside it.',
    };
  }
  return { isOk: true };
};
