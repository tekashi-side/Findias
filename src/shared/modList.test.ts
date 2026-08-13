import { describe, expect, it } from 'vitest';
import type { ModAction, ModGroupRow, ModState, ModVariantRow, UpdateType } from './modList';
import { deriveBulkActionIds, groupUpdateType } from './modList';

/** Build a minimal variant row; `actions`/`updateType`/`state` cover the cases here. */
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

/**
 * Shorthand for a single managed variant with a given presence + actions, so a
 * test reads as "an enabled volatile mod" rather than a wall of state fields.
 */
const managed = (
  modId: string,
  opts: {
    presence: ModState['presence'];
    actions: ModAction[];
    updateType?: UpdateType | null;
    isInCatalog?: boolean;
  },
): ModVariantRow =>
  makeVariant({
    modId,
    name: modId,
    state: {
      isInCatalog: opts.isInCatalog ?? true,
      presence: opts.presence,
      isUpdateAvailable: false,
    },
    updateType: opts.updateType ?? null,
    actions: opts.actions,
  });

/** Wrap variants in a single group so the helpers (which take groups) can consume them. */
const groupOf = (variants: ModVariantRow[], overrides: Partial<ModGroupRow> = {}): ModGroupRow => ({
  groupId: overrides.groupId ?? 'group',
  name: overrides.name ?? 'Group',
  tags: [],
  hasVariants: variants.length > 1,
  isMutuallyExclusive: false,
  installedVariantId: null,
  variants,
  ...overrides,
});

describe('deriveBulkActionIds', () => {
  it('splits managed variants into enabled/disabled by their offered action', () => {
    const groups = [
      groupOf([managed('Enabled', { presence: 'enabled', actions: ['disable'] })], {
        groupId: 'g1',
      }),
      groupOf([managed('Disabled', { presence: 'disabled', actions: ['enable'] })], {
        groupId: 'g2',
      }),
    ];
    expect(deriveBulkActionIds(groups)).toEqual({
      updatableModIds: [],
      enabledModIds: ['Enabled'],
      disabledModIds: ['Disabled'],
      enabledVolatileModIds: [],
    });
  });

  it('lists variants offering update in updatableModIds, including disabled ones', () => {
    const groups = [
      groupOf([managed('UpToDate', { presence: 'enabled', actions: ['disable'] })], {
        groupId: 'g1',
      }),
      // An enabled mod with an update pending offers both update + disable.
      groupOf(
        [managed('EnabledOutdated', { presence: 'enabled', actions: ['update', 'disable'] })],
        {
          groupId: 'g2',
        },
      ),
      // A disabled mod can still update — the installer re-enables it on write.
      groupOf(
        [managed('DisabledOutdated', { presence: 'disabled', actions: ['update', 'enable'] })],
        {
          groupId: 'g3',
        },
      ),
    ];
    const result = deriveBulkActionIds(groups);
    expect(result.updatableModIds).toEqual(['EnabledOutdated', 'DisabledOutdated']);
    expect(result.enabledModIds).toEqual(['UpToDate', 'EnabledOutdated']);
    expect(result.disabledModIds).toEqual(['DisabledOutdated']);
  });

  it('excludes orphans from every list (never re-enable a disabled orphan)', () => {
    // An orphan on disk still carries a `disable`/`enable` action, but must never
    // be swept up by a bulk toggle.
    const groups = [
      groupOf(
        [
          managed('OrphanEnabled', {
            presence: 'enabled',
            actions: ['disable'],
            updateType: 'volatile',
            isInCatalog: false,
          }),
        ],
        { groupId: 'orphan:1' },
      ),
      groupOf(
        [
          managed('OrphanDisabled', {
            presence: 'disabled',
            actions: ['enable'],
            isInCatalog: false,
          }),
        ],
        { groupId: 'orphan:2' },
      ),
    ];
    expect(deriveBulkActionIds(groups)).toEqual({
      updatableModIds: [],
      enabledModIds: [],
      disabledModIds: [],
      enabledVolatileModIds: [],
    });
  });

  it('lists only enabled volatile mods in enabledVolatileModIds (subset of enabledModIds)', () => {
    const groups = [
      groupOf(
        [
          managed('EnabledVolatile', {
            presence: 'enabled',
            actions: ['disable'],
            updateType: 'volatile',
          }),
        ],
        { groupId: 'g1' },
      ),
      groupOf(
        [
          managed('EnabledStable', {
            presence: 'enabled',
            actions: ['disable'],
            updateType: 'stable',
          }),
        ],
        { groupId: 'g2' },
      ),
      // A disabled volatile mod is not "enabled volatile" — it stays out of the subset.
      groupOf(
        [
          managed('DisabledVolatile', {
            presence: 'disabled',
            actions: ['enable'],
            updateType: 'volatile',
          }),
        ],
        { groupId: 'g3' },
      ),
    ];
    const result = deriveBulkActionIds(groups);
    expect(result.enabledModIds).toEqual(['EnabledVolatile', 'EnabledStable']);
    expect(result.disabledModIds).toEqual(['DisabledVolatile']);
    expect(result.enabledVolatileModIds).toEqual(['EnabledVolatile']);
  });

  it('ignores variants that offer neither enable nor disable (e.g. not-installed)', () => {
    const groups = [
      groupOf([managed('NotInstalled', { presence: 'absent', actions: ['install'] })]),
    ];
    expect(deriveBulkActionIds(groups)).toEqual({
      updatableModIds: [],
      enabledModIds: [],
      disabledModIds: [],
      enabledVolatileModIds: [],
    });
  });

  it('walks every variant across multiple groups', () => {
    const groups = [
      groupOf(
        [
          managed('A', { presence: 'enabled', actions: ['disable'], updateType: 'volatile' }),
          managed('B', { presence: 'disabled', actions: ['enable'] }),
        ],
        { groupId: 'variantGroup' },
      ),
      groupOf([managed('C', { presence: 'enabled', actions: ['disable'], updateType: 'stable' })], {
        groupId: 'solo',
      }),
    ];
    expect(deriveBulkActionIds(groups)).toEqual({
      updatableModIds: [],
      enabledModIds: ['A', 'C'],
      disabledModIds: ['B'],
      enabledVolatileModIds: ['A'],
    });
  });
});

describe('groupUpdateType', () => {
  it('returns volatile when any variant is volatile (volatile wins)', () => {
    const group = groupOf([
      makeVariant({ modId: 'a', updateType: 'stable' }),
      makeVariant({ modId: 'b', updateType: 'volatile' }),
    ]);
    expect(groupUpdateType(group)).toBe('volatile');
  });

  it('returns stable when all classed variants are stable', () => {
    const group = groupOf([
      makeVariant({ modId: 'a', updateType: 'stable' }),
      makeVariant({ modId: 'b', updateType: 'stable' }),
    ]);
    expect(groupUpdateType(group)).toBe('stable');
  });

  it('prefers stable over an unclassified (null) sibling', () => {
    const group = groupOf([
      makeVariant({ modId: 'a', updateType: null }),
      makeVariant({ modId: 'b', updateType: 'stable' }),
    ]);
    expect(groupUpdateType(group)).toBe('stable');
  });

  it('returns null when no variant carries a freshness class (e.g. an orphan group)', () => {
    const group = groupOf([makeVariant({ modId: 'a', updateType: null })]);
    expect(groupUpdateType(group)).toBeNull();
  });
});
