import type {
  CatalogMetadata,
  ModAction,
  ModConflict,
  ModGroupRow,
  ModState,
  ModVariantRow,
} from '../shared/modList';
import { orphanDisplayName } from '../shared/modFilename';
import type { Catalog, CatalogGroup, CatalogVariant } from './providers/catalog';
import type { InstalledMod } from './providers/installed';

/**
 * The resolver merges the grouped catalog with the installed-mods scan into the
 * grouped rows the UI renders. It depends only on the normalized interfaces,
 * never on GitHub or filesystem specifics. See docs/architecture.md
 * ("Mod resolution").
 */

export interface ResolvedModList {
  groups: ModGroupRow[];
  metadata: CatalogMetadata | null;
}

interface InstalledGroup {
  /** Highest-version enabled file for a modId (in package root), if any. */
  enabledMod?: InstalledMod;
  /** Highest-version disabled file for a modId (in package/disabled), if any. */
  disabledMod?: InstalledMod;
}

/** Actions that would result in a mod being enabled (loaded by the game). */
const ENABLING_ACTIONS: ReadonlySet<ModAction> = new Set<ModAction>([
  'install',
  'update',
  'enable',
]);

/**
 * Group installed files by modId, keeping the highest version seen for the
 * enabled and disabled locations separately. Duplicates (from a crashed update
 * or manual tinkering) collapse to the newest of each; the next mutation
 * reconciles the rest.
 */
const groupInstalledByModId = (installed: InstalledMod[]): Map<string, InstalledGroup> => {
  const groups = new Map<string, InstalledGroup>();
  for (const mod of installed) {
    const group = groups.get(mod.modId) ?? {};
    if (mod.isEnabled) {
      if (!group.enabledMod || mod.version > group.enabledMod.version) group.enabledMod = mod;
    } else if (!group.disabledMod || mod.version > group.disabledMod.version) {
      group.disabledMod = mod;
    }
    groups.set(mod.modId, group);
  }
  return groups;
};

/** The set of every modId present in the catalog, for membership checks. */
export const catalogModIds = (catalog: Catalog): Set<string> => {
  const ids = new Set<string>();
  for (const group of catalog.groups) {
    for (const variant of group.variants) ids.add(variant.modId);
  }
  return ids;
};

/** Index every catalog variant by modId for O(1) lookups. */
const indexCatalogByModId = (
  catalog: Catalog,
): Map<string, { group: CatalogGroup; variant: CatalogVariant }> => {
  const index = new Map<string, { group: CatalogGroup; variant: CatalogVariant }>();
  for (const group of catalog.groups) {
    for (const variant of group.variants) index.set(variant.modId, { group, variant });
  }
  return index;
};

/**
 * Map each game file -> the currently-enabled, catalog-known mods that modify it.
 * Only enabled mods can actually conflict (the game loads only the package root),
 * and only catalog mods expose their `usedFiles`.
 */
const indexEnabledUsedFiles = (
  installedByModId: Map<string, InstalledGroup>,
  catalogIndex: Map<string, { group: CatalogGroup; variant: CatalogVariant }>,
): Map<string, ModConflict[]> => {
  const byFile = new Map<string, ModConflict[]>();
  for (const [modId, group] of installedByModId) {
    if (!group.enabledMod) continue;
    const found = catalogIndex.get(modId);
    if (!found) continue;
    const conflict: ModConflict = { modId, modName: found.variant.modName };
    for (const file of found.variant.usedFiles) {
      const list = byFile.get(file) ?? [];
      list.push(conflict);
      byFile.set(file, list);
    }
  }
  return byFile;
};

/**
 * Collect the enabled mods that conflict with `variant`, excluding same-group
 * siblings (a mutually-exclusive switch handles those) and the variant itself.
 */
const conflictsFor = (
  variant: CatalogVariant,
  siblingIds: ReadonlySet<string>,
  enabledByFile: Map<string, ModConflict[]>,
): ModConflict[] => {
  const byModId = new Map<string, ModConflict>();
  for (const file of variant.usedFiles) {
    for (const conflict of enabledByFile.get(file) ?? []) {
      if (siblingIds.has(conflict.modId)) continue;
      byModId.set(conflict.modId, conflict);
    }
  }
  return [...byModId.values()];
};

/** Compute the row for a single catalog variant. */
const buildVariantRow = (
  variant: CatalogVariant,
  installedGroup: InstalledGroup | undefined,
  conflicts: ModConflict[],
): ModVariantRow => {
  const enabledMod = installedGroup?.enabledMod;
  const disabledMod = installedGroup?.disabledMod;
  const primary = enabledMod ?? disabledMod;

  const state: ModState = {
    isInCatalog: true,
    presence: enabledMod ? 'enabled' : disabledMod ? 'disabled' : 'absent',
    isUpdateAvailable: !!primary && primary.version < variant.version,
  };

  let actions: ModAction[];

  if (!primary) {
    actions = ['install'];
  } else if (!enabledMod && disabledMod) {
    actions =
      disabledMod.version < variant.version ? ['update', 'enable', 'delete'] : ['enable', 'delete'];
  } else if (primary.version < variant.version) {
    actions = ['update', 'disable', 'delete'];
  } else {
    actions = ['disable', 'delete'];
  }

  // A conflict with an already-enabled mod blocks anything that would enable
  // this one. Disable/delete remain so the user can resolve the conflict.
  if (conflicts.length > 0) {
    actions = actions.filter((action) => !ENABLING_ACTIONS.has(action));
  }

  return {
    modId: variant.modId,
    name: variant.modName,
    state,
    releaseVersion: variant.version,
    installedVersion: primary?.version ?? null,
    size: variant.size,
    fileName: variant.fileName,
    updatedAt: variant.updatedAt,
    updateType: variant.updateType,
    actions,
    usedFiles: variant.usedFiles,
    conflicts,
    modAuthor: variant.modAuthor,
    modAdditionalCredits: variant.modAdditionalCredits,
    recentUpdateNotes: variant.recentUpdateNotes,
    readme: variant.readme,
    images: variant.images,
  };
};

/**
 * Namespace prefix for orphan group IDs. An orphan's `groupId` would otherwise
 * be its `modId`, which can collide with a catalog group's `groupId` — e.g. a
 * mod once shipped standalone as `UisciasStatus_*.it` (modId `Status`) that is
 * later re-published as the variant group `Status`. Two rows sharing a
 * `groupId` produce duplicate React keys and broken list reconciliation, so we
 * keep the orphan identity in its own namespace. Only the display/React key is
 * namespaced; actions still key off the variant's real `modId`.
 */
const ORPHAN_GROUP_ID_PREFIX = 'orphan:';

/** Build a row for an installed mod absent from the catalog (enable/disable + delete). */
const buildOrphanGroup = (modId: string, installedGroup: InstalledGroup): ModGroupRow => {
  const primary = installedGroup.enabledMod ?? installedGroup.disabledMod;
  const isEnabled = Boolean(installedGroup.enabledMod);
  // Show the file's natural name (extension + trailing version stripped, prefix
  // kept) so the user can tell where an orphan came from.
  const name = primary ? orphanDisplayName(primary.fileName) : modId;
  const variant: ModVariantRow = {
    modId,
    name,
    state: {
      isInCatalog: false,
      presence: isEnabled ? 'enabled' : 'disabled',
      isUpdateAvailable: false,
    },
    releaseVersion: null,
    installedVersion: primary?.version ?? null,
    size: null,
    fileName: primary?.fileName ?? null,
    updateType: null,
    actions: isEnabled ? ['disable', 'delete'] : ['enable', 'delete'],
    usedFiles: [],
    conflicts: [],
  };
  return {
    groupId: `${ORPHAN_GROUP_ID_PREFIX}${modId}`,
    name,
    tags: [],
    hasVariants: false,
    isMutuallyExclusive: false,
    installedVariantId: modId,
    variants: [variant],
  };
};

/** A group is an orphan group when its (only) variant is an orphan. */
const isOrphanGroup = (group: ModGroupRow): boolean =>
  group.variants.some((variant) => !variant.state.isInCatalog);

/**
 * Order groups for display: catalog groups first (alphabetical), then orphans
 * (alphabetical among themselves) pinned to the bottom of the list.
 */
const compareGroups = (a: ModGroupRow, b: ModGroupRow): number => {
  const orphanDelta = Number(isOrphanGroup(a)) - Number(isOrphanGroup(b));
  return orphanDelta !== 0 ? orphanDelta : a.name.localeCompare(b.name);
};

/** Pick the installed variant of a group (preferring the enabled location). */
const installedVariantId = (
  group: CatalogGroup,
  installedByModId: Map<string, InstalledGroup>,
): string | null => {
  let disabledMatch: string | null = null;
  for (const variant of group.variants) {
    const installed = installedByModId.get(variant.modId);
    if (installed?.enabledMod) return variant.modId;
    if (installed?.disabledMod && disabledMatch === null) disabledMatch = variant.modId;
  }
  return disabledMatch;
};

/**
 * Merge the grouped catalog and the installed-mods scan into grouped rows, plus
 * catalog-wide metadata. Pure and deterministic. When `catalog` is null (the
 * fetch failed), every installed mod is returned as an orphan group and
 * `metadata` is null.
 */
export const resolveModList = (
  catalog: Catalog | null,
  installed: InstalledMod[],
): ResolvedModList => {
  const installedByModId = groupInstalledByModId(installed);

  if (!catalog) {
    const groups = [...installedByModId.entries()].map(([modId, group]) =>
      buildOrphanGroup(modId, group),
    );
    return { groups: groups.sort(compareGroups), metadata: null };
  }

  const catalogIndex = indexCatalogByModId(catalog);
  const enabledByFile = indexEnabledUsedFiles(installedByModId, catalogIndex);

  const groups: ModGroupRow[] = catalog.groups.map((group) => {
    const siblingIds = new Set(group.variants.map((variant) => variant.modId));
    const variants = group.variants.map((variant) =>
      buildVariantRow(
        variant,
        installedByModId.get(variant.modId),
        conflictsFor(variant, siblingIds, enabledByFile),
      ),
    );
    return {
      groupId: group.groupId,
      name: group.modName,
      tags: group.findiasTags,
      hasVariants: group.hasVariants,
      isMutuallyExclusive: group.isMutuallyExclusive,
      installedVariantId: installedVariantId(group, installedByModId),
      variants,
      readme: group.readme,
      images: group.images,
    };
  });

  // Installed mods with no catalog variant become orphan groups (toggle + delete).
  for (const [modId, installedGroup] of installedByModId) {
    if (!catalogIndex.has(modId)) groups.push(buildOrphanGroup(modId, installedGroup));
  }

  const metadata: CatalogMetadata = {
    ...catalog.metadata,
    isOutdated: catalog.metadata.supportedGameVersion !== catalog.metadata.currentGameVersion,
  };

  return { groups: groups.sort(compareGroups), metadata };
};
