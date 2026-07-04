import { describe, expect, it } from 'vitest';
import {
  buildManagedModFileName,
  isOfficialGameFile,
  orphanDisplayName,
  parseManagedModFileName,
} from './modFilename';

describe('parseManagedModFileName', () => {
  it('parses a managed file name into id + integer version', () => {
    expect(parseManagedModFileName('uisciasZoom_00001.it')).toEqual({
      fileName: 'uisciasZoom_00001.it',
      modId: 'Zoom',
      version: 1,
    });
  });

  it('compares versions numerically regardless of zero-padding', () => {
    const a = parseManagedModFileName('uisciasDDtimer_6.it');
    const b = parseManagedModFileName('uisciasDDtimer_00011.it');
    expect(a?.version).toBe(6);
    expect(b?.version).toBe(11);
    expect((a?.version ?? 0) < (b?.version ?? 0)).toBe(true);
  });

  it('matches the prefix case-insensitively', () => {
    expect(parseManagedModFileName('UisciasCrom_2.it')?.modId).toBe('Crom');
  });

  it('returns null for non-managed files', () => {
    expect(parseManagedModFileName('data_99999.it')).toBeNull();
    expect(parseManagedModFileName('DDtimer_00005.it')).toBeNull();
    expect(parseManagedModFileName('uisciasExtra_part_1.it')).toBeNull();
    expect(parseManagedModFileName('uisciasZoom_1.txt')).toBeNull();
  });
});

describe('buildManagedModFileName', () => {
  it('round-trips with the parser', () => {
    const name = buildManagedModFileName('Zoom', 5);
    expect(name).toBe('uisciasZoom_5.it');
    expect(parseManagedModFileName(name)?.modId).toBe('Zoom');
  });
});

describe('isOfficialGameFile', () => {
  it('matches official data_<number>.it files case-insensitively', () => {
    expect(isOfficialGameFile('data_00001.it')).toBe(true);
    expect(isOfficialGameFile('DATA_42.IT')).toBe(true);
  });

  it('rejects managed, foreign, and non-.it files', () => {
    expect(isOfficialGameFile('uisciasZoom_1.it')).toBe(false);
    expect(isOfficialGameFile('SomeCustomMod_00001.it')).toBe(false);
    expect(isOfficialGameFile('data_1.txt')).toBe(false);
    expect(isOfficialGameFile('data_.it')).toBe(false);
  });
});

describe('orphanDisplayName', () => {
  it('drops the extension and trailing version, keeping the prefix', () => {
    expect(orphanDisplayName('UisciasSomeOrphanMod_00001.it')).toBe('UisciasSomeOrphanMod');
    expect(orphanDisplayName('SomeCustomMod_00001.it')).toBe('SomeCustomMod');
  });

  it('drops just the extension when there is no version segment', () => {
    expect(orphanDisplayName('randommod.it')).toBe('randommod');
  });
});
