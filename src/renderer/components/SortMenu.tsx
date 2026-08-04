import type { FC } from 'react';
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowDownZA,
  ArrowUpNarrowWide,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
  isSortBy,
  isSortDirection,
  type SortBy,
  type SortDirection,
} from '@shared/modSort';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** How a direction reads under one sort key: `desc` is "Newest" for a date. */
type DirectionOption = {
  value: SortDirection;
  label: string;
  icon: LucideIcon;
};

type SortOption = {
  value: SortBy;
  label: string;
  /** Display order for this key's directions; the first entry is its default. */
  directions: readonly [DirectionOption, DirectionOption];
};

/**
 * The sort keys in display order, each owning the labels, icons, and ordering of
 * its own directions — so a new sort key is one entry here and nothing else.
 * Mirrors the `TAB_ITEMS` pattern in {@link ModTabs}.
 */
const SORT_OPTIONS: readonly [SortOption, SortOption] = [
  {
    value: 'name',
    label: 'Name',
    directions: [
      { value: 'asc', label: 'Ascending', icon: ArrowDownAZ },
      { value: 'desc', label: 'Descending', icon: ArrowDownZA },
    ],
  },
  {
    value: 'updatedAt',
    label: 'Updated At',
    directions: [
      { value: 'desc', label: 'Newest', icon: ArrowDownWideNarrow },
      { value: 'asc', label: 'Oldest', icon: ArrowUpNarrowWide },
    ],
  },
];

const optionFor = (sortBy: SortBy): SortOption =>
  SORT_OPTIONS.find((option) => option.value === sortBy) ?? SORT_OPTIONS[0];

const directionFor = (option: SortOption, direction: SortDirection): DirectionOption =>
  option.directions.find((item) => item.value === direction) ?? option.directions[0];

type SortMenuProps = {
  sortBy: SortBy;
  sortDirection: SortDirection;
  onSortByChange: (value: SortBy) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  /** Restore the default sort; the menu only offers it when off-default. */
  onReset: () => void;
};

/**
 * A single-select sort control shown next to the tag filter. One radio group
 * picks the sort key, a second picks the direction — relabelled per key, since
 * "Newest" reads better than "Descending" for a date.
 */
const SortMenu: FC<SortMenuProps> = ({
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionChange,
  onReset,
}) => {
  const option = optionFor(sortBy);
  const direction = directionFor(option, sortDirection);
  const Icon = direction.icon;
  const isDefault = sortBy === DEFAULT_SORT_BY && sortDirection === DEFAULT_SORT_DIRECTION;

  // Picking a key also snaps the direction to that key's default, so Updated At
  // lands on Newest instead of inheriting Name's ascending as "Oldest".
  const handleSortByChange = (value: string): void => {
    if (!isSortBy(value)) return;
    onSortByChange(value);
    onSortDirectionChange(optionFor(value).directions[0].value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-48 justify-between"
          aria-label={`Sort by ${option.label}, ${direction.label}`}
        >
          <Icon data-icon="inline-start" aria-hidden />
          {`Sort: ${option.label}`}
          <ChevronDown data-icon="inline-end" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortBy} onValueChange={handleSortByChange}>
          {SORT_OPTIONS.map((item) => (
            // Stay open on select so the relabelled directions below are visible.
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              onSelect={(e) => e.preventDefault()}
            >
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(value) => isSortDirection(value) && onSortDirectionChange(value)}
        >
          {option.directions.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              onSelect={(e) => e.preventDefault()}
            >
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {!isDefault && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onReset}>Reset to default</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortMenu;
