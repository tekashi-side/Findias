import type { FC } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, FolderInput, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';

/**
 * Second setup step: shown when a valid game folder already contains pre-existing
 * (non-official) mods. Warns that they may conflict with the mods Findias manages
 * and offers to archive them (a non-destructive move into `package/archived`) or
 * skip. Either choice completes the one-time step for this folder.
 */
const SetupArchiveStep: FC = () => {
  const queryClient = useQueryClient();

  const { data: foreignMods, isLoading } = useQuery({
    queryKey: ['foreignMods'],
    queryFn: () => window.findias.listForeignMods(),
  });

  const complete = useMutation({
    mutationFn: (archive: boolean) => window.findias.completeModSetup(archive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['setupState'] });
    },
  });

  const count = foreignMods?.length ?? 0;

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-heading text-3xl font-semibold">Existing mods detected</h1>
          <p className="text-sm text-muted-foreground">
            Findias found {count === 1 ? '1 mod' : `${count} mods`} already installed in your{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">package</code> folder that
            weren&apos;t installed by Findias.
          </p>
        </div>

        <Alert className="border-amber-500/30 text-amber-700 dark:text-amber-400">
          <TriangleAlert />
          <AlertTitle>Custom mods can conflict with Uiscias mods</AlertTitle>
          <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
            Running mods from other sources alongside the official Uiscias mods can cause game
            issues when they edit the same files. We recommend archiving them to prevent your game
            from experiencing any issues.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-8" />
          </div>
        ) : (
          count > 0 && (
            <ScrollArea className="rounded-2xl border [&>[data-slot=scroll-area-viewport]]:max-h-57">
              <ItemGroup className="p-2">
                {foreignMods?.map((mod) => (
                  <Item key={mod.fileName} variant="muted" size="sm">
                    <ItemMedia variant="icon">
                      <FolderInput />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="break-all">{mod.displayName}</ItemTitle>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </ScrollArea>
          )
        )}

        <p className="text-center text-xs text-muted-foreground">
          Nothing will be deleted. Archiving just moves these files into a{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">package\archived</code> folder that
          the game and Findias both ignore, so you can restore them later.
        </p>

        {complete.isError && (
          <Alert variant="destructive">
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center gap-2">
          <Button onClick={() => complete.mutate(true)} disabled={complete.isPending}>
            <Archive />
            {complete.isPending ? 'Working…' : 'Archive existing mods'}
          </Button>
          <Button
            variant="outline"
            onClick={() => complete.mutate(false)}
            disabled={complete.isPending}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupArchiveStep;
