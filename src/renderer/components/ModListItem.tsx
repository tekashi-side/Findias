import type { FC } from 'react';
import { Info } from 'lucide-react';
import type { DownloadProgress } from '@shared/api';
import type { ModAction, ModVariantRow } from '@shared/modList';
import { formatBytes, formatDate } from '../format';
import StatusChip from './StatusChip';
import ModActions from './ModActions';
import ModProgressBar from './ModProgressBar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemTitle,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';

type ModListItemProps = {
  variant: ModVariantRow;
  /** Group tags to display above the row (omitted for variant sub-rows). */
  tags?: string[];
  isBusy: boolean;
  progress?: DownloadProgress;
  /** When true, the catalog banner is active, so the updateType chip is shown. */
  isOutdated: boolean;
  /** When true, a bulk update is in flight, so all actions on this row are disabled. */
  isLocked: boolean;
  onAction: (action: ModAction, modId: string) => void;
  /** True when this row is open in the detail pane. */
  isSelected?: boolean;
  /** Select this row to open it in the detail pane. */
  onSelect?: (modId: string) => void;
};

/** Build the one-line "release vX • installed vY • size • updated" summary for a variant. */
const versionSummary = (variant: ModVariantRow): string => {
  const release =
    variant.releaseVersion === null ? 'Not in release' : `Release v${variant.releaseVersion}`;
  const installed =
    variant.installedVersion === null ? 'Not installed' : `Installed v${variant.installedVersion}`;
  const size = variant.size === null ? '' : ` • ${formatBytes(variant.size)}`;
  const updatedDate = variant.updatedAt ? formatDate(variant.updatedAt) : '';
  const updated = updatedDate ? ` • ${updatedDate}` : '';
  return `${release} • ${installed}${size}${updated}`;
};

/**
 * A single mod/variant row: name, status, version summary, optional tags and
 * conflict notes, action buttons (Delete behind an {@link AlertDialog} confirm),
 * and a determinate/indeterminate progress bar while an action is in flight.
 */
const ModListItem: FC<ModListItemProps> = ({
  variant,
  tags,
  isBusy,
  progress,
  isOutdated,
  isLocked,
  onAction,
  isSelected = false,
  onSelect,
}) => {
  const isDisabled = isBusy || isLocked;

  const shouldShowUpdateType = isOutdated && variant.updateType !== null;

  return (
    <Item
      variant="outline"
      className={cn(
        'items-start',
        !variant.state.isInCatalog && 'opacity-50 transition-opacity hover:opacity-100',
        isSelected && 'border-primary/60 bg-primary/5',
      )}
      data-selected={isSelected || undefined}
      onClick={() => onSelect?.(variant.modId)}
    >
      <ItemContent>
        <ItemTitle className="flex-wrap break-words">
          <span className="break-words">{variant.name}</span>
          <StatusChip state={variant.state} />
        </ItemTitle>

        {((shouldShowUpdateType && variant.updateType) || (tags && tags.length > 0)) && (
          <div className="flex flex-wrap gap-1">
            {shouldShowUpdateType && variant.updateType && (
              <Badge
                variant="outline"
                className={cn(
                  'gap-1',
                  variant.updateType === 'volatile'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                )}
              >
                {variant.updateType === 'volatile' ? 'Volatile' : 'Stable'}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-default items-center"
                      aria-label={
                        variant.updateType === 'volatile'
                          ? 'Volatile mods are likely affected by patches'
                          : 'Stable mods usually survive patches'
                      }
                    >
                      <Info className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {variant.updateType === 'volatile'
                      ? 'Likely affected by patches'
                      : 'Usually survives patches'}
                  </TooltipContent>
                </Tooltip>
              </Badge>
            )}
            {tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <ItemDescription>{versionSummary(variant)}</ItemDescription>

        {variant.conflicts.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Conflicts with {variant.conflicts.map((c) => c.modName).join(', ')}. Disable or delete
            it to enable this mod.
          </p>
        )}
      </ItemContent>

      <ItemActions onClick={(e) => e.stopPropagation()}>
        <ModActions variant={variant} isDisabled={isDisabled} onAction={onAction} />
      </ItemActions>

      {isBusy && (
        <ItemFooter>
          <ModProgressBar progress={progress} />
        </ItemFooter>
      )}
    </Item>
  );
};

export default ModListItem;
