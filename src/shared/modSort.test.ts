import { describe, expect, it } from 'vitest';
import type { ModGroupRow, ModVariantRow } from './modList';
import { sortModGroups } from './modSort';

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

describe('sortModGroups', () => {
  it('sorts (name, asc) alphabetically with orphans pinned last, matching the resolver default', () => {
    const groups = [
      makeGroup('Zebra Mod'),
      makeGroup('Orphaned B', { isOrphan: true }),
      makeGroup('Apple Mod'),
      makeGroup('Orphaned A', { isOrphan: true }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'name', 'asc'))).toEqual([
      'Apple Mod',
      'Zebra Mod',
      'Orphaned A',
      'Orphaned B',
    ]);
  });

  it('leaves the input array untouched', () => {
    const groups = [makeGroup('Zebra Mod'), makeGroup('Apple Mod')];
    sortModGroups(groups, 'name', 'asc');
    expect(namesInOrder(groups)).toEqual(['Zebra Mod', 'Apple Mod']);
  });

  it('reverses non-pinned groups on (name, desc) but keeps orphans last and alphabetical', () => {
    const groups = [
      makeGroup('Apple Mod'),
      makeGroup('Zebra Mod'),
      makeGroup('Orphaned B', { isOrphan: true }),
      makeGroup('Orphaned A', { isOrphan: true }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'name', 'desc'))).toEqual([
      'Zebra Mod',
      'Apple Mod',
      'Orphaned A',
      'Orphaned B',
    ]);
  });

  it('sorts by the most recent variant updatedAt within a multi-variant group', () => {
    const groups = [
      makeGroup('Multi', {
        variants: [
          makeVariant({ modId: 'v1', updatedAt: '2026-01-01T00:00:00.000Z' }),
          makeVariant({ modId: 'v2', updatedAt: '2026-06-01T00:00:00.000Z' }),
        ],
      }),
      makeGroup('Older', { updatedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'asc'))).toEqual(['Older', 'Multi']);
  });

  it('reverses on (updatedAt, desc), newest first, orphans still pinned last', () => {
    const groups = [
      makeGroup('Old', { updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeGroup('New', { updatedAt: '2026-06-01T00:00:00.000Z' }),
      makeGroup('Orphan', { isOrphan: true }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'desc'))).toEqual([
      'New',
      'Old',
      'Orphan',
    ]);
  });

  it('breaks equal timestamps alphabetically in both directions', () => {
    // A batch repack stamps many mods with the same instant; the tie-break is
    // deliberately not reversed, so they read A-Z either way.
    const sameInstant = '2026-03-01T00:00:00.000Z';
    const groups = [
      makeGroup('Charlie', { updatedAt: sameInstant }),
      makeGroup('Alpha', { updatedAt: sameInstant }),
      makeGroup('Bravo', { updatedAt: sameInstant }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'asc'))).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'desc'))).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
  });

  it('orders a tied timestamp against a distinct one by date first, then name', () => {
    const groups = [
      makeGroup('Zulu', { updatedAt: '2026-03-01T00:00:00.000Z' }),
      makeGroup('Alpha', { updatedAt: '2026-03-01T00:00:00.000Z' }),
      makeGroup('Mike', { updatedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'desc'))).toEqual([
      'Mike',
      'Alpha',
      'Zulu',
    ]);
  });

  it('pins a non-orphan group with no updatedAt under updatedAt, but sorts it normally under name', () => {
    const noTimestamp = makeGroup('No Timestamp', {
      variants: [
        makeVariant({
          modId: 'nt',
          state: { isInCatalog: true, presence: 'absent', isUpdateAvailable: false },
        }),
      ],
    });
    const withTimestamp = makeGroup('Has Timestamp', { updatedAt: '2026-01-01T00:00:00.000Z' });
    const groups = [noTimestamp, withTimestamp];

    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'asc'))).toEqual([
      'Has Timestamp',
      'No Timestamp',
    ]);
    expect(namesInOrder(sortModGroups(groups, 'name', 'asc'))).toEqual([
      'Has Timestamp',
      'No Timestamp',
    ]);
  });

  it('treats an unparseable updatedAt as no timestamp rather than sorting on NaN', () => {
    const groups = [
      makeGroup('Malformed', { updatedAt: 'not-a-date' }),
      makeGroup('Early', { updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeGroup('Late', { updatedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'desc'))).toEqual([
      'Late',
      'Early',
      'Malformed',
    ]);
  });

  it('ignores an unparseable timestamp in favor of a usable sibling variant', () => {
    const groups = [
      makeGroup('Mixed', {
        variants: [
          makeVariant({ modId: 'bad', updatedAt: 'not-a-date' }),
          makeVariant({ modId: 'good', updatedAt: '2026-06-01T00:00:00.000Z' }),
        ],
      }),
      makeGroup('Older', { updatedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(namesInOrder(sortModGroups(groups, 'updatedAt', 'desc'))).toEqual(['Mixed', 'Older']);
  });
});
