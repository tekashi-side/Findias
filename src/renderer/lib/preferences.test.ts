import { describe, expect, it } from 'vitest';
import { readStoredPreference } from './preferences';

type Theme = 'light' | 'dark';
const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

/** A stand-in for `localStorage`: the helper only ever reads one key. */
const storageOf = (stored: string | null): Pick<Storage, 'getItem'> => ({
  getItem: () => stored,
});

describe('readStoredPreference', () => {
  it('returns the stored value when it passes the guard', () => {
    expect(readStoredPreference(storageOf('dark'), 'theme', isTheme, 'light')).toBe('dark');
  });

  it('falls back when nothing is stored', () => {
    expect(readStoredPreference(storageOf(null), 'theme', isTheme, 'light')).toBe('light');
  });

  it('falls back when the stored value is no longer a known option', () => {
    // e.g. a renamed option, a downgrade, or a hand-edited value.
    expect(readStoredPreference(storageOf('solarized'), 'theme', isTheme, 'light')).toBe('light');
  });

  it('passes the requested key through to the storage', () => {
    const readKeys: string[] = [];
    const storage: Pick<Storage, 'getItem'> = {
      getItem: (key) => {
        readKeys.push(key);
        return 'dark';
      },
    };
    readStoredPreference(storage, 'findias-theme', isTheme, 'light');
    expect(readKeys).toEqual(['findias-theme']);
  });
});
