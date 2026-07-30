import type { FC } from 'react';
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpAZ,
  ArrowUpNarrowWide,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isSortBy, isSortDirection, type SortBy, type SortDirection } from '@/lib/modSort';

type SortMenuProps = {
  sortBy: SortBy;
  sortDirection: SortDirection;
  onSortByChange: (value: SortBy) => void;
  onSortDirectionChange: (value: SortDirection) => void;
};

const SORT_BY_LABEL: Record<SortBy, string> = { name: 'Name', updatedAt: 'Updated At' };

/** Leading icon reflects both the active key and direction, so the trigger
 *  communicates the full sort state without needing extra label text. */
const triggerIcon = (sortBy: SortBy, direction: SortDirection) => {
  if (sortBy === 'name') return direction === 'asc' ? ArrowDownAZ : ArrowUpAZ;
  return direction === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow;
};

/**
 * A single-select sort control shown next to the tag filter. One radio group
 * picks the sort key (Name / Updated At), separated from a second radio group
 * for direction (Ascending / Descending) — the two choices are independent.
 */
const SortMenu: FC<SortMenuProps> = ({
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionChange,
}) => {
  const Icon = triggerIcon(sortBy, sortDirection);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between">
          <Icon data-icon="inline-start" aria-hidden />
          {SORT_BY_LABEL[sortBy]}
          <ChevronDown data-icon="inline-end" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => isSortBy(value) && onSortByChange(value)}
        >
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="updatedAt">Updated At</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(value) => isSortDirection(value) && onSortDirectionChange(value)}
        >
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortMenu;
