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
   * Installed version is older than the release version. Only meaningful when
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
  | 'up-to-date' // installed (enabled) at >= the release version
  | 'update-available' // installed (enabled) at an older version than the release
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
  /** Freshness class (`stable` | `volatile`), or null for orphans. */
  updateType: string | null;
  /** Valid actions for this row, in display order. */
  actions: ModAction[];
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
  mutuallyExclusive: boolean;
  /** modId of the currently-installed variant in this group, if any. */
  installedVariantId: string | null;
  variants: ModVariantRow[];
  /** Group-level README markdown, used as a fallback when a variant has none. */
  readme?: string;
  /** Group-level image URLs, used as a fallback when a variant has none. */
  images?: string[];
}

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
  outdated: boolean;
}

/** Status of the remote catalog fetch for the current refresh. */
export interface CatalogStatus {
  /** False when the catalog could not be loaded (offline, rate-limited, etc.). */
  available: boolean;
  /** User-facing explanation when `available` is false. */
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
