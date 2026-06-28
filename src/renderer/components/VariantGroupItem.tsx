import type { FC } from 'react';
import type { DownloadProgress } from '@shared/api';
import type { ModAction, ModGroupRow } from '@shared/modList';
import ModListItem from './ModListItem';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

type VariantGroupItemProps = {
  group: ModGroupRow;
  busyModId?: string;
  progressByMod: Record<string, DownloadProgress>;
  outdated: boolean;
  onAction: (action: ModAction, modId: string) => void;
};

/**
 * A mutually-exclusive variant group: a header (name + tags, no action buttons)
 * over an expandable list of variants. Only one variant may be installed at a
 * time; installing another auto-switches. The header has no buttons because all
 * actions belong to the individual variants.
 */
const VariantGroupItem: FC<VariantGroupItemProps> = ({
  group,
  busyModId,
  progressByMod,
  outdated,
  onAction,
}) => {
  const installed = group.variants.find((variant) => variant.modId === group.installedVariantId);

  return (
    <Accordion type="single" collapsible defaultValue={group.groupId} className="my-1.5">
      <AccordionItem value={group.groupId}>
        <AccordionTrigger>
          <div className="flex min-w-0 grow flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium break-words">{group.name}</span>
              <Badge variant="outline" className="border-sky-500/30 text-sky-700 dark:text-sky-400">
                {group.variants.length} variants
              </Badge>
            </div>

            {group.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {group.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-sm font-normal text-muted-foreground">
              {installed ? `Installed: ${installed.name}` : 'Pick one variant to install'}
            </p>
          </div>
        </AccordionTrigger>

        <AccordionContent>
          <div className="flex flex-col">
            {group.variants.map((variant) => (
              <ModListItem
                key={variant.modId}
                variant={variant}
                busy={variant.modId === busyModId}
                progress={progressByMod[variant.modId]}
                outdated={outdated}
                onAction={onAction}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default VariantGroupItem;
