/**
 * DTOs that cross the IPC boundary to describe the rendered mod list. These are
 * the normalized, serializable view models the renderer consumes — derived in
 * the main process by the resolver from the catalog + installed sources. They
 * carry no GitHub- or filesystem-specific detail.
 *
 * The list is **grouped**, mirroring the manifest: every entry is a group, and a
 * non-variant mod is simply a group with a single variant.
 */

/**
 * The canonical, orthogonal description of a mod's state, computed by merging the
 * release catalog with what is on disk. This is the single source of truth for
 * both filtering and display; every "status" label is derived from it.
 */
export interface ModState {
  /** In the current release catalog. `false` => orphan (present on disk only). */
  isInCatalog: boolean;
  /** On-disk presence: not installed, installed+enabled, or installed+disabled. */
  presence: 'absent' | 'enabled' | 'disabled';
  /**
   * Installed version differs from the release version (either older, or — after
   * a catalog re-baseline — newer than what the catalog now points to). In both
   * cases the fix is to reconcile to the catalog's file. Only meaningful when
   * `isInCatalog` and `presence !== 'absent'`; always `false` otherwise.
   */
  isUpdateAvailable: boolean;
}

/**
 * The finite set of display labels a mod can be shown as. Not a stored field:
 * this is purely the output alphabet of {@link toDisplayStatus}, which projects
 * the orthogonal {@link ModState} down to a single mutually-exclusive badge.
 */
export type ModStatus =
  | 'not-installed' // in the release, not on disk
  | 'up-to-date' // installed (enabled) at the release version
  | 'update-available' // installed (enabled) at a version that differs from the release
  | 'disabled' // present only in package/disabled
  | 'orphan'; // installed but absent from the current release

/**
 * Project a {@link ModState} onto its single presentational {@link ModStatus}.
 * `disabled` is reported before `isUpdateAvailable`, so a disabled-with-update mod
 * shows the "Disabled" label (its update is still surfaced via `state`/actions).
 */
export const toDisplayStatus = (state: ModState): ModStatus => {
  if (!state.isInCatalog) return 'orphan';
  if (state.presence === 'absent') return 'not-installed';
  if (state.presence === 'disabled') return 'disabled';
  return state.isUpdateAvailable ? 'update-available' : 'up-to-date';
};

/**
 * Freshness class of a released variant: `stable` usually survives a game patch,
 * `volatile` likely breaks. The main-process schema (`manifestSchema.ts`) is the
 * runtime source of truth — it degrades unknown manifest values to `volatile` —
 * so by the time a value reaches this DTO it is always one of these two.
 */
export type UpdateType = 'stable' | 'volatile';

/** An action the user may take on a variant row. */
export type ModAction = 'install' | 'update' | 'enable' | 'disable' | 'delete';

/** A mod that conflicts with another (shares one or more `usedFiles`). */
export interface ModConflict {
  modId: string;
  modName: string;
}

/** A single installable variant row (the whole mod for a non-variant group). */
export interface ModVariantRow {
  /** Stable identity (the `<ModFileName>` segment). */
  modId: string;
  /** Human-readable display name from the manifest. */
  name: string;
  /** The canonical, orthogonal state; drives both filtering and the display label. */
  state: ModState;
  /** Version offered by the latest release, or null if absent from it (orphan). */
  releaseVersion: number | null;
  /** Version currently on disk, or null if not installed. */
  installedVersion: number | null;
  /** Release asset size in bytes, when known. */
  size: number | null;
  /** Canonical release file name, when known. */
  fileName: string | null;
  /**
   * UTC ISO-8601 instant the mod was last repacked, from the catalog. Absent for
   * orphans and for manifests published before this field existed.
   */
  updatedAt?: string;
  /** Freshness class, or null for orphans. */
  updateType: UpdateType | null;
  /** Lifetime downloads across every released version of this variant. */
  downloadCount?: number;
  /** Valid actions for this row, in display order. */
  actions: ModAction[];
  /** Repo-relative game files this variant modifies, in manifest order. Empty for orphans. */
  usedFiles: string[];
  /**
   * Currently-enabled mods (from other groups) that share `usedFiles` with this
   * variant. When non-empty, any action that would enable this mod is removed
   * and the UI shows which mods to disable/delete first.
   */
  conflicts: ModConflict[];
  /** Mod author, from the catalog (absent for orphans). */
  modAuthor?: string;
  /** Additional credits, from the catalog (absent for orphans). */
  modAdditionalCredits?: string;
  /** Recent update notes, from the catalog (absent for orphans). */
  recentUpdateNotes?: string;
  /** README markdown for this variant, when the catalog provides it. */
  readme?: string;
  /** Release-pinned image URLs for this variant's carousel, when provided. */
  images?: string[];
}

/** A catalog group: a single mod, or a mutually-exclusive set of variants. */
export interface ModGroupRow {
  groupId: string;
  /** Group display name (rendered as the row/header title). */
  name: string;
  /** Group-level tags. */
  tags: string[];
  hasVariants: boolean;
  isMutuallyExclusive: boolean;
  /** modId of the currently-installed variant in this group, if any. */
  installedVariantId: string | null;
  variants: ModVariantRow[];
  /** Group-level README markdown, used as a fallback when a variant has none. */
  readme?: string;
  /** Group-level image URLs, used as a fallback when a variant has none. */
  images?: string[];
}

/**
 * A group is an orphan group when its (only) variant is an orphan. Lives here,
 * beside {@link toDisplayStatus}, so the main process and the renderer share one
 * definition instead of each keeping a copy.
 */
export const isOrphanGroup = (group: ModGroupRow): boolean =>
  group.variants.some((variant) => !variant.state.isInCatalog);

/** The modId lists plus availability flags for every bulk action, split by target. */
export interface BulkActions {
  /**
   * Variants offering `update`, including disabled ones — the installer always
   * writes to the package root, so updating a disabled mod re-enables it. Powers
   * "Update All".
   */
  updatableModIds: string[];
  /** Managed, currently-enabled variants (they offer `disable`). */
  enabledModIds: string[];
  /** Managed, currently-disabled variants (they offer `enable`). */
  disabledModIds: string[];
  /** The subset of `enabledModIds` flagged `volatile` (the banner's target). */
  enabledVolatileModIds: string[];
  /** How many updates are available; also the "Updates" tab count. */
  updateCount: number;
  /**
   * Whether "Enable All" would do anything. Note: enabling every disabled row can
   * re-create a conflict between two rows that were both disabled (per-row
   * detection only sees the enabled set), which the next refresh re-surfaces.
   */
  canEnableAll: boolean;
  /** Whether "Disable All" would do anything (something is enabled). */
  canDisableAll: boolean;
  /** Whether "Disable Volatile Mods" would do anything (an enabled volatile remains). */
  canDisableVolatile: boolean;
}

/**
 * Derive everything the bulk actions (Update All / Enable All / Disable All /
 * Disable Volatile) need: the id lists to act on plus whether each is a no-op.
 * Orphans (`state.isInCatalog === false`) are excluded on purpose: we never want
 * a bulk action to touch them (e.g. "Enable All" switching a disabled orphan back
 * on). The resolver's `actions` are the source of truth — an enabled row always
 * offers `disable`, a disabled row always offers `enable` — so we read presence
 * off them rather than re-deriving it here.
 */
export const deriveBulkActions = (groups: readonly ModGroupRow[]): BulkActions => {
  const updatableModIds: string[] = [];
  const enabledModIds: string[] = [];
  const disabledModIds: string[] = [];
  const enabledVolatileModIds: string[] = [];
  for (const group of groups) {
    for (const variant of group.variants) {
      if (!variant.state.isInCatalog) continue;
      if (variant.actions.includes('update')) updatableModIds.push(variant.modId);
      if (variant.actions.includes('disable')) {
        enabledModIds.push(variant.modId);
        if (variant.updateType === 'volatile') enabledVolatileModIds.push(variant.modId);
      }
      if (variant.actions.includes('enable')) {
        disabledModIds.push(variant.modId);
      }
    }
  }
  return {
    updatableModIds,
    enabledModIds,
    disabledModIds,
    enabledVolatileModIds,
    updateCount: updatableModIds.length,
    canEnableAll: disabledModIds.length > 0,
    canDisableAll: enabledModIds.length > 0,
    canDisableVolatile: enabledVolatileModIds.length > 0,
  };
};

/**
 * Group-level freshness, derived from the variants since the catalog only carries
 * it per-variant. **Volatile wins**: any volatile variant makes the whole group
 * read `volatile` (a conservative warning while a patch is pending); otherwise
 * `stable` if any variant is stable; otherwise null (e.g. an orphan group whose
 * variants carry no freshness class).
 */
export const groupUpdateType = (group: ModGroupRow): UpdateType | null => {
  if (group.variants.some((variant) => variant.updateType === 'volatile')) return 'volatile';
  if (group.variants.some((variant) => variant.updateType === 'stable')) return 'stable';
  return null;
};

/** Catalog-wide metadata for the renderer, including the derived freshness flag. */
export interface CatalogMetadata {
  schemaVersion: number;
  currentGameVersion: string;
  supportedGameVersion: string;
  generatedAt: string;
  /**
   * True when the catalog's verified game version differs from the latest known
   * client version. Drives ONLY the top-of-app banner (and the conditional
   * display of per-mod `updateType`); it never affects a variant's `status`.
   */
  isOutdated: boolean;
}

/** Status of the remote catalog fetch for the current refresh. */
export interface CatalogStatus {
  /** False when the catalog could not be loaded (offline, rate-limited, etc.). */
  isAvailable: boolean;
  /** User-facing explanation when `isAvailable` is false. */
  error?: string;
}

/**
 * The full result of a refresh: the grouped rows, whether the remote catalog was
 * reachable, and catalog-wide metadata. When the catalog is unavailable, groups
 * still reflect what is installed on disk (all as orphans) and `metadata` is null.
 */
export interface ModListState {
  groups: ModGroupRow[];
  catalog: CatalogStatus;
  metadata: CatalogMetadata | null;
}
