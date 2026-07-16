import type { FC } from 'react';
import { ChevronDown, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

type TagFilterProps = {
  /** Every tag present across the catalog, deduped and sorted. */
  allTags: string[];
  /** Tags currently applied to the filter (logical-OR across them). */
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

/** Build the count-based trigger label: "Tags" / "1 Tag" / "N Tags". */
const triggerLabel = (count: number): string => {
  if (count === 0) return 'Tags';
  return `${count} ${count === 1 ? 'Tag' : 'Tags'}`;
};

/**
 * A multi-select tag filter shown to the right of the mod tabs. Selecting tags
 * narrows the list to mods carrying at least one selected tag (logical OR), on
 * top of the active tab and search filters.
 */
const TagFilter: FC<TagFilterProps> = ({ allTags, selectedTags, onChange }) => {
  const toggle = (tag: string, isChecked: boolean): void => {
    onChange(isChecked ? [...selectedTags, tag] : selectedTags.filter((t) => t !== tag));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-30 justify-between" disabled={allTags.length === 0}>
          <Tag data-icon="inline-start" aria-hidden />
          {triggerLabel(selectedTags.length)}
          <ChevronDown data-icon="inline-end" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
        <ScrollArea className="h-64">
          {allTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={selectedTags.includes(tag)}
              onCheckedChange={(isChecked) => toggle(tag, isChecked)}
              onSelect={(e) => e.preventDefault()}
            >
              {tag}
            </DropdownMenuCheckboxItem>
          ))}
        </ScrollArea>
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>Clear filters</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TagFilter;
