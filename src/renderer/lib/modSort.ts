import type { ModGroupRow } from '@shared/modList';

/** The fields the mod list can be sorted by. */
export const SORT_BY_VALUES = ['name', 'updatedAt'] as const;
export type SortBy = (typeof SORT_BY_VALUES)[number];

/** Sort direction; applies independently of `SortBy`. */
export const SORT_DIRECTION_VALUES = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTION_VALUES)[number];

export const isSortBy = (value: unknown): value is SortBy =>
  typeof value === 'string' && (SORT_BY_VALUES as readonly string[]).includes(value);

export const isSortDirection = (value: unknown): value is SortDirection =>
  typeof value === 'string' && (SORT_DIRECTION_VALUES as readonly string[]).includes(value);

/** A group is an orphan group when its (only) variant is an orphan. Mirrors
 *  `isOrphanGroup` in `src/main/modResolver.ts`; duplicated here since the
 *  renderer has no access to main-process modules. */
const isOrphanGroup = (group: ModGroupRow): boolean =>
  group.variants.some((variant) => !variant.state.isInCatalog);

/** A group's effective timestamp for the `updatedAt` sort: the most recent
 *  `updatedAt` among its variants, or `null` if none carry one. */
const groupUpdatedAt = (group: ModGroupRow): number | null => {
  const timestamps = group.variants
    .map((variant) => variant.updatedAt)
    .filter((updatedAt): updatedAt is string => Boolean(updatedAt))
    .map((updatedAt) => new Date(updatedAt).getTime());
  return timestamps.length === 0 ? null : Math.max(...timestamps);
};

/**
 * Order groups for display given the active sort. Orphans (and, when sorting
 * by `updatedAt`, any group with no usable timestamp) are always pinned to
 * the bottom, alphabetical among themselves, regardless of `sortBy`/
 * `direction` — this replicates `compareGroups` in `modResolver.ts` for the
 * default `(name, asc)` case and extends it consistently to `updatedAt`.
 */
export const compareModGroups = (
  a: ModGroupRow,
  b: ModGroupRow,
  sortBy: SortBy,
  direction: SortDirection,
): number => {
  const isPinned = (group: ModGroupRow): boolean =>
    isOrphanGroup(group) || (sortBy === 'updatedAt' && groupUpdatedAt(group) === null);

  const aPinned = isPinned(a);
  const bPinned = isPinned(b);
  if (aPinned !== bPinned) return Number(aPinned) - Number(bPinned);
  if (aPinned && bPinned) return a.name.localeCompare(b.name);

  const sign = direction === 'asc' ? 1 : -1;
  if (sortBy === 'name') return sign * a.name.localeCompare(b.name);

  const aUpdatedAt = groupUpdatedAt(a) ?? 0;
  const bUpdatedAt = groupUpdatedAt(b) ?? 0;
  return sign * (aUpdatedAt - bUpdatedAt);
};
