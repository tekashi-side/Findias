import type { FC } from 'react';
import type { DownloadProgress } from '@shared/api';
import type { ModAction, ModGroupRow } from '@shared/modList';
import ModListItem from './ModListItem';
import ModListVariantGroupItem from './ModListVariantGroupItem';
import { ItemGroup } from '@/components/ui/item';

type ModListProps = {
  groups: ModGroupRow[];
  busyModId?: string;
  progressByMod: Record<string, DownloadProgress>;
  isOutdated: boolean;
  /** When true, a bulk update is in flight, so all row actions are disabled. */
  isLocked: boolean;
  onAction: (action: ModAction, modId: string) => void;
  /** Currently-selected variant modId, highlighted and shown in the detail pane. */
  selectedModId: string | null;
  /** Select a variant to open it in the detail pane. */
  onSelect: (modId: string) => void;
};

/** Render the grouped mod catalog: variant groups as accordions, single mods as rows. */
const ModList: FC<ModListProps> = ({
  groups,
  busyModId,
  progressByMod,
  isOutdated,
  isLocked,
  onAction,
  selectedModId,
  onSelect,
}) => {
  return (
    <ItemGroup className="gap-2">
      {groups.map((group) =>
        group.hasVariants ? (
          <ModListVariantGroupItem
            key={group.groupId}
            group={group}
            busyModId={busyModId}
            progressByMod={progressByMod}
            isOutdated={isOutdated}
            isLocked={isLocked}
            onAction={onAction}
            selectedModId={selectedModId}
            onSelect={onSelect}
          />
        ) : (
          <ModListItem
            key={group.groupId}
            variant={group.variants[0]}
            tags={group.tags}
            isBusy={group.variants[0].modId === busyModId}
            progress={progressByMod[group.variants[0].modId]}
            isOutdated={isOutdated}
            isLocked={isLocked}
            onAction={onAction}
            isSelected={group.variants[0].modId === selectedModId}
            onSelect={onSelect}
          />
        ),
      )}
    </ItemGroup>
  );
};

export default ModList;
