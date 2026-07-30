import { describe, expect, it } from 'vitest';
import type { ModGroupRow, ModVariantRow } from '@shared/modList';
import { compareModGroups } from './modSort';

/** Build a minimal variant row, defaulting to a normal catalog mod. */
const makeVariant = (overrides: Partial<ModVariantRow> = {}): ModVariantRow => ({
  modId: overrides.modId ?? 'variant',
  name: overrides.name ?? 'Variant',
  state: overrides.state ?? { isInCatalog: true, presence: 'absent', isUpdateAvailable: false },
  releaseVersion: null,
  installedVersion: null,
  size: null,
  fileName: null,
  updateType: null,
  actions: [],
  usedFiles: [],
  conflicts: [],
  ...overrides,
});

/** Build a minimal single-variant group; `isOrphan` and `updatedAt` shortcut
 *  the common cases without hand-building a variant + state each time. */
const makeGroup = (
  name: string,
  options: { isOrphan?: boolean; updatedAt?: string; variants?: ModVariantRow[] } = {},
): ModGroupRow => ({
  groupId: name,
  name,
  tags: [],
  hasVariants: false,
  isMutuallyExclusive: false,
  installedVariantId: null,
  variants: options.variants ?? [
    makeVariant({
      modId: name,
      name,
      state: {
        isInCatalog: !options.isOrphan,
        presence: 'absent',
        isUpdateAvailable: false,
      },
      updatedAt: options.isOrphan ? undefined : (options.updatedAt ?? '2026-01-01T00:00:00.000Z'),
    }),
  ],
});

const namesInOrder = (groups: ModGroupRow[]): string[] => groups.map((g) => g.name);

describe('compareModGroups', () => {
  it('sorts (name, asc) alphabetically with orphans pinned last, matching today', () => {
    const groups = [
      makeGroup('Zebra Mod'),
      makeGroup('Orphaned B', { isOrphan: true }),
      makeGroup('Apple Mod'),
      makeGroup('Orphaned A', { isOrphan: true }),
    ];
    const sorted = [...groups].sort((a, b) => compareModGroups(a, b, 'name', 'asc'));
    expect(namesInOrder(sorted)).toEqual(['Apple Mod', 'Zebra Mod', 'Orphaned A', 'Orphaned B']);
  });

  it('reverses non-pinned groups on (name, desc) but keeps orphans last and alphabetical', () => {
    const groups = [
      makeGroup('Apple Mod'),
      makeGroup('Zebra Mod'),
      makeGroup('Orphaned B', { isOrphan: true }),
      makeGroup('Orphaned A', { isOrphan: true }),
    ];
    const sorted = [...groups].sort((a, b) => compareModGroups(a, b, 'name', 'desc'));
    expect(namesInOrder(sorted)).toEqual(['Zebra Mod', 'Apple Mod', 'Orphaned A', 'Orphaned B']);
  });

  it('sorts by the most recent variant updatedAt within a multi-variant group', () => {
    const groupWithNewerSecondVariant = makeGroup('Multi', {
      variants: [
        makeVariant({ modId: 'v1', updatedAt: '2026-01-01T00:00:00.000Z' }),
        makeVariant({ modId: 'v2', updatedAt: '2026-06-01T00:00:00.000Z' }),
      ],
    });
    const older = makeGroup('Older', { updatedAt: '2026-02-01T00:00:00.000Z' });
    const sorted = [...[groupWithNewerSecondVariant, older]].sort((a, b) =>
      compareModGroups(a, b, 'updatedAt', 'asc'),
    );
    expect(namesInOrder(sorted)).toEqual(['Older', 'Multi']);
  });

  it('reverses on (updatedAt, desc), newest first, orphans still pinned last', () => {
    const groups = [
      makeGroup('Old', { updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeGroup('New', { updatedAt: '2026-06-01T00:00:00.000Z' }),
      makeGroup('Orphan', { isOrphan: true }),
    ];
    const sorted = [...groups].sort((a, b) => compareModGroups(a, b, 'updatedAt', 'desc'));
    expect(namesInOrder(sorted)).toEqual(['New', 'Old', 'Orphan']);
  });

  it('pins a non-orphan group with no updatedAt on any variant under updatedAt sort, but sorts it normally under name sort', () => {
    const noTimestamp = makeGroup('No Timestamp', {
      variants: [
        makeVariant({
          modId: 'nt',
          state: { isInCatalog: true, presence: 'absent', isUpdateAvailable: false },
        }),
      ],
    });
    const withTimestamp = makeGroup('Has Timestamp', { updatedAt: '2026-01-01T00:00:00.000Z' });

    const byUpdatedAt = [...[noTimestamp, withTimestamp]].sort((a, b) =>
      compareModGroups(a, b, 'updatedAt', 'asc'),
    );
    expect(namesInOrder(byUpdatedAt)).toEqual(['Has Timestamp', 'No Timestamp']);

    const byName = [...[noTimestamp, withTimestamp]].sort((a, b) =>
      compareModGroups(a, b, 'name', 'asc'),
    );
    expect(namesInOrder(byName)).toEqual(['Has Timestamp', 'No Timestamp']);
  });
});
