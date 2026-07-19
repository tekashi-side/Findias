import type { FC } from 'react';
import { Files, Info, PanelRightOpen } from 'lucide-react';
import type { ModGroupRow, ModVariantRow } from '@shared/modList';
import ModDetailBody from './ModDetailBody';
import ModDetailDataFiles from './ModDetailDataFiles';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ModDetailProps = {
  /** The selected variant, or null when nothing is selected. */
  variant: ModVariantRow | null;
  /** The selected variant's group, used for group-level doc fallback. */
  group: ModGroupRow | null;
};

/**
 * The detail pane for the selected mod. Catalog mods get a fixed tab bar
 * (Details / Data Files) whose panels scroll independently; orphans have no
 * catalog `usedFiles`, so they render the Details body alone with no tabs. The
 * `key` on `Tabs` remounts it per mod, resetting the selection to Details when
 * the user switches to a different mod.
 */
const ModDetail: FC<ModDetailProps> = ({ variant, group }) => {
  if (!variant) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PanelRightOpen />
            </EmptyMedia>
            <EmptyTitle>No mod selected</EmptyTitle>
            <EmptyDescription>Select a mod to view its contents.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Orphans have no tabs, so the body supplies its own top padding to sit off
  // the pane's top edge.
  if (!variant.state.isInCatalog) {
    return (
      <ScrollArea className="h-full">
        <ModDetailBody variant={variant} group={group} className="pt-6" />
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs
        key={variant.modId}
        defaultValue="details"
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <div className="shrink-0 px-6 pt-6">
          <TabsList>
            <TabsTrigger value="details">
              <Info className="size-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="dataFiles">
              <Files className="size-4" />
              Data Files
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="details" className="min-h-0">
          {/* No top padding here: the tab-to-content gap above supplies it. */}
          <ScrollArea className="h-full">
            <ModDetailBody variant={variant} group={group} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="dataFiles" className="min-h-0">
          <ModDetailDataFiles files={variant.usedFiles} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModDetail;
