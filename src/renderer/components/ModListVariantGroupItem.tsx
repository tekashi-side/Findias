import { useState, type FC } from 'react';
import { ChevronDown } from 'lucide-react';
import type { DownloadProgress } from '@shared/api';
import type { ModAction, ModGroupRow } from '@shared/modList';
import ModListItem from './ModListItem';
import ModActions from './ModActions';
import ModProgressBar from './ModProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';

type ModListVariantGroupItemProps = {
  group: ModGroupRow;
  busyModId?: string;
  progressByMod: Record<string, DownloadProgress>;
  isOutdated: boolean;
  /** When true, a bulk update is in flight, so all variant actions are disabled. */
  isLocked: boolean;
  onAction: (action: ModAction, modId: string) => void;
  /** Currently-selected variant modId (highlighted in the list). */
  selectedModId: string | null;
  /** Select a variant to open it in the detail pane. */
  onSelect: (modId: string) => void;
};

/**
 * A mutually-exclusive variant group rendered as a collapsible {@link Item}: the
 * header toggles an expandable list of variant rows. Collapsed by default so
 * groups stay compact. Only one variant may be installed at a time; installing
 * another auto-switches. When a variant is installed, the header surfaces that
 * variant's actions (update/enable/disable/delete) so the user can act without
 * expanding; install is never offered here since we can't know which variant.
 */
const ModListVariantGroupItem: FC<ModListVariantGroupItemProps> = ({
  group,
  busyModId,
  progressByMod,
  isOutdated,
  isLocked,
  onAction,
  selectedModId,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const installedMod = group.variants.find((variant) => variant.modId === group.installedVariantId);
  const isBusy = installedMod?.modId === busyModId;
  const isDisabled = isBusy || isLocked;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Item variant="outline" className="items-start select-none">
          <ItemContent>
            <ItemTitle className="flex-wrap break-words">
              <span className="break-words">{group.name}</span>
              <Badge variant="outline" className="border-sky-500/30 text-sky-700 dark:text-sky-400">
                {group.variants.length} variants
              </Badge>
            </ItemTitle>

            {group.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {group.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <ItemDescription>
              {installedMod ? `Installed: ${installedMod.name}` : 'Pick one variant to install'}
            </ItemDescription>
          </ItemContent>

          <ItemActions>
            {installedMod && (
              <ModActions variant={installedMod} isDisabled={isDisabled} onAction={onAction} />
            )}
            <Button variant="outline" size="icon-sm" aria-label="Toggle variants" tabIndex={-1}>
              <ChevronDown
                className={cn('size-4 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </Button>
          </ItemActions>

          {/* Only when collapsed: an expanded group's child row shows its own bar. */}
          {installedMod && isBusy && !isOpen && (
            <ItemFooter>
              <ModProgressBar progress={progressByMod[installedMod.modId]} />
            </ItemFooter>
          )}
        </Item>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ItemGroup className="gap-2 pt-2.5 pl-4">
          {group.variants.map((variant) => (
            <ModListItem
              key={variant.modId}
              variant={variant}
              isBusy={variant.modId === busyModId}
              progress={progressByMod[variant.modId]}
              isOutdated={isOutdated}
              isLocked={isLocked}
              onAction={onAction}
              isSelected={variant.modId === selectedModId}
              onSelect={onSelect}
            />
          ))}
        </ItemGroup>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ModListVariantGroupItem;
