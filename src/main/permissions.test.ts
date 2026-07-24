import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GamePaths } from '../shared/api';
import {
  checkPackageWritable,
  isPermissionError,
  PermissionError,
  PERMISSION_ERROR_MESSAGE,
} from './permissions';

/** Build a GamePaths whose packageDir is `packageDir` (other dirs are unused here). */
const gamePathsFor = (packageDir: string): GamePaths => ({
  root: join(packageDir, '..'),
  packageDir,
  disabledDir: join(packageDir, 'disabled'),
  archivedDir: join(packageDir, 'archived'),
});

describe('isPermissionError', () => {
  it.each([
    ['EPERM', true],
    ['EACCES', true],
    ['ENOENT', false],
    ['EEXIST', false],
  ])('code %s -> %s', (code, expected) => {
    expect(isPermissionError(Object.assign(new Error('x'), { code }))).toBe(expected);
  });

  it.each([[null], [undefined], ['a string'], [42], [{}], [new Error('no code')]])(
    'returns false for non-errno value %s',
    (value) => {
      expect(isPermissionError(value)).toBe(false);
    },
  );
});

describe('PermissionError', () => {
  it('is an Error with a stable name and default message', () => {
    const error = new PermissionError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PermissionError');
    expect(error.message).toBe(PERMISSION_ERROR_MESSAGE);
  });

  it('preserves a provided cause', () => {
    const cause = Object.assign(new Error('EPERM'), { code: 'EPERM' });
    const error = new PermissionError(undefined, { cause });
    expect(error.cause).toBe(cause);
  });
});

describe('checkPackageWritable', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(join(tmpdir(), 'findias-perm-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('returns true for a writable folder and cleans up the probe file', async () => {
    expect(await checkPackageWritable(gamePathsFor(tmp))).toBe(true);
    // No probe file left behind.
    expect(await fs.readdir(tmp)).toEqual([]);
  });

  it('returns false when the folder does not exist', async () => {
    expect(await checkPackageWritable(gamePathsFor(join(tmp, 'missing')))).toBe(false);
  });
});
