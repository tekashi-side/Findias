import { useMemo, type FC } from 'react';
import {
  CircleAlert,
  CircleFadingArrowUp,
  CirclePause,
  Layers,
  PackageCheck,
  type LucideIcon,
} from 'lucide-react';
import type { ModGroupRow, ModVariantRow } from '@shared/modList';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/** The status-based filters offered alongside the text search. */
export type ModTab = 'all' | 'installed' | 'updates' | 'disabled' | 'orphaned';

/** Maps each non-"all" tab to the variants that belong to it, derived from `state`. */
const TAB_VARIANT_MATCH: Record<Exclude<ModTab, 'all'>, (variant: ModVariantRow) => boolean> = {
  // Any catalog-known mod present on disk (enabled or disabled); orphans excluded.
  installed: (v) => v.state.isInCatalog && v.state.presence !== 'absent',
  // An update is available regardless of enabled/disabled or conflict-pruned actions.
  updates: (v) => v.state.isUpdateAvailable,
  // Any disabled mod, catalog-known or orphan.
  disabled: (v) => v.state.presence === 'disabled',
  orphaned: (v) => !v.state.isInCatalog,
};

/** The tabs in display order, with their labels. */
const TAB_ITEMS: readonly { value: ModTab; label: string }[] = [
  { value: 'all', label: 'All Mods' },
  { value: 'installed', label: 'Installed' },
  { value: 'updates', label: 'Updates' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'orphaned', label: 'Orphaned' },
];

/** Presentation icons for each tab; mirrors the theme tabs in {@link SettingsView}. */
const TAB_ICONS: Record<ModTab, LucideIcon> = {
  all: Layers,
  installed: PackageCheck,
  updates: CircleFadingArrowUp,
  disabled: CirclePause,
  orphaned: CircleAlert,
};

/** A group belongs to a tab when any of its variants matches that tab. */
export const groupMatchesTab = (group: ModGroupRow, tab: ModTab): boolean =>
  tab === 'all' || group.variants.some((variant) => TAB_VARIANT_MATCH[tab](variant));

/** Narrow Radix's `string` onValueChange payload back to our tab union. */
const isModTab = (value: string): value is ModTab => TAB_ITEMS.some((item) => item.value === value);

type ModTabsProps = {
  value: ModTab;
  onValueChange: (tab: ModTab) => void;
  /** The full, unfiltered groups; per-status counts are derived from these. */
  groups: ModGroupRow[];
};

/**
 * The status filter tabs (All Mods / Installed / Disabled / Orphaned) shown above
 * the mod list. Counts are computed from the full group list so they reflect
 * per-status totals and stay stable as the text search narrows the visible rows.
 */
const ModTabs: FC<ModTabsProps> = ({ value, onValueChange, groups }) => {
  const counts = useMemo(
    () => ({
      all: groups.length,
      installed: groups.filter((g) => groupMatchesTab(g, 'installed')).length,
      updates: groups.filter((g) => groupMatchesTab(g, 'updates')).length,
      disabled: groups.filter((g) => groupMatchesTab(g, 'disabled')).length,
      orphaned: groups.filter((g) => groupMatchesTab(g, 'orphaned')).length,
    }),
    [groups],
  );

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (isModTab(next)) onValueChange(next);
      }}
      className="shrink-0"
    >
      <TabsList className="w-full">
        {TAB_ITEMS.map((item) => {
          const Icon = TAB_ICONS[item.value];
          return (
            <TabsTrigger key={item.value} value={item.value}>
              <Icon className="size-4" />
              {item.label}
              <span className="tabular-nums text-muted-foreground">{counts[item.value]}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export default ModTabs;
