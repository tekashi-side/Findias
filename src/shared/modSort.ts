/**
 * The one definition of mod-list display order, shared by the main process
 * (which emits the default order) and the renderer (which re-sorts to the
 * user's preference). Keeping it here means the two can never disagree about
 * where orphans go or how ties break.
 */

import { isOrphanGroup, type ModGroupRow } from './modList';

/** The fields the mod list can be sorted by. */
export const SORT_BY_VALUES = ['name', 'updatedAt'] as const;
export type SortBy = (typeof SORT_BY_VALUES)[number];

/** Sort direction; applies independently of `SortBy`. */
export const SORT_DIRECTION_VALUES = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTION_VALUES)[number];

/** The order the main process emits, and the renderer's starting preference. */
export const DEFAULT_SORT_BY: SortBy = 'name';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';

export const isSortBy = (value: unknown): value is SortBy =>
  typeof value === 'string' && (SORT_BY_VALUES as readonly string[]).includes(value);

export const isSortDirection = (value: unknown): value is SortDirection =>
  typeof value === 'string' && (SORT_DIRECTION_VALUES as readonly string[]).includes(value);

/**
 * A group's effective timestamp for the `updatedAt` sort: the most recent
 * parseable `updatedAt` among its variants, or `null` if none carry one.
 * Unparseable values are skipped rather than yielding `NaN`, which would make
 * the comparator inconsistent.
 */
const groupUpdatedAt = (group: ModGroupRow): number | null => {
  let latest: number | null = null;
  for (const variant of group.variants) {
    if (!variant.updatedAt) continue;
    const timestamp = new Date(variant.updatedAt).getTime();
    if (!Number.isFinite(timestamp)) continue;
    if (latest === null || timestamp > latest) latest = timestamp;
  }
  return latest;
};

/** A group paired with the keys its position depends on, computed once. */
type DecoratedGroup = {
  group: ModGroupRow;
  isPinned: boolean;
  timestamp: number;
};

/**
 * Order groups for display. Orphans — and, under `updatedAt`, any group with no
 * usable timestamp — are pinned to the bottom, alphabetical among themselves and
 * never reversed by `direction`. Equal sort keys break alphabetically, also
 * unreversed, so a batch of same-instant repacks always reads A-Z.
 *
 * Sort keys are computed once per group rather than per comparison, so a
 * timestamp is parsed once instead of O(n log n) times.
 */
export const sortModGroups = (
  groups: readonly ModGroupRow[],
  sortBy: SortBy,
  direction: SortDirection,
): ModGroupRow[] => {
  const sign = direction === 'asc' ? 1 : -1;

  const decorated: DecoratedGroup[] = groups.map((group) => {
    const updatedAt = sortBy === 'updatedAt' ? groupUpdatedAt(group) : null;
    return {
      group,
      isPinned: isOrphanGroup(group) || (sortBy === 'updatedAt' && updatedAt === null),
      timestamp: updatedAt ?? 0,
    };
  });

  decorated.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return Number(a.isPinned) - Number(b.isPinned);
    const byName = a.group.name.localeCompare(b.group.name);
    if (a.isPinned) return byName;
    const delta = sortBy === 'name' ? byName : a.timestamp - b.timestamp;
    return delta === 0 ? byName : sign * delta;
  });

  return decorated.map((entry) => entry.group);
};
