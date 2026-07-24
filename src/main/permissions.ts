import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { GamePaths } from '../shared/api';

/**
 * The game's `package` folder must be writable for every Findias mutation
 * (install/update writes a temp file then renames, delete removes files, disable
 * moves files into a subfolder, archive creates a subfolder). When the game is
 * installed under a protected location — e.g. the `gamania` client's default
 * `C:\Program Files\…\Mabinogi` — that folder's ACLs deny writes to an
 * unelevated process, so every mutation fails with `EPERM`/`EACCES`. This module
 * detects that condition (a cheap write probe) and models the resulting error so
 * setup can offer a one-time permission fix instead of crashing mid-operation.
 */

/** Name of the throwaway probe file created (and deleted) in the package root. */
const WRITE_PROBE_FILE_NAME = '.findias-writetest';

/** A user-facing message shown when a mutation fails because the folder is protected. */
export const PERMISSION_ERROR_MESSAGE =
  "Findias can't write to your game's package folder because it's in a protected " +
  'location (like Program Files). Re-run setup to fix the folder permissions.';

/**
 * A mutation failed because the target folder denied write access. Thrown in
 * place of the raw Node `EPERM`/`EACCES` error so the renderer shows a clear,
 * actionable message rather than a cryptic errno string. Reported to Sentry like
 * any other unexpected error (we want continued visibility that the fix works).
 */
export class PermissionError extends Error {
  constructor(message: string = PERMISSION_ERROR_MESSAGE, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PermissionError';
  }
}

/** Whether `error` is a Node filesystem permission error (`EPERM` or `EACCES`). */
export const isPermissionError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const { code } = error;
  return code === 'EPERM' || code === 'EACCES';
};

/**
 * Probe whether the `package` folder is writable by creating (and immediately
 * deleting) a dotfile in it. Returns `false` on a permission error and `true` on
 * success. Any other failure (e.g. the folder was removed) also resolves `false`,
 * since the folder isn't usable for mutations regardless. The dotted name keeps
 * the probe file out of the package scanner's `.it` grammar even if a crash
 * leaves one behind.
 */
export const checkPackageWritable = async (paths: GamePaths): Promise<boolean> => {
  const probePath = join(paths.packageDir, WRITE_PROBE_FILE_NAME);
  try {
    const handle = await fs.open(probePath, 'w');
    await handle.close();
    return true;
  } catch {
    return false;
  } finally {
    await fs.rm(probePath, { force: true }).catch(() => {});
  }
};
