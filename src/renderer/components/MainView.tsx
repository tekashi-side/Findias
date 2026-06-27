import { useEffect, useState, type FC } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DownloadProgress, SetupState } from '@shared/api';
import type { ModAction, ModListState } from '@shared/modList';
import ModList from './ModList';

type MainViewProps = {
  setup: SetupState;
};

const MOD_LIST_KEY = ['modList'] as const;

/** Return an Error message when available, otherwise a fallback string. */
const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** Main mod-management screen after setup is complete. */
const MainView: FC<MainViewProps> = ({ setup }) => {
  const queryClient = useQueryClient();
  const [progressByMod, setProgressByMod] = useState<Record<string, DownloadProgress>>({});
  const [includePrereleases, setIncludePrereleases] = useState(setup.includePrereleases);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: MOD_LIST_KEY,
    queryFn: () => window.findias.refresh(),
  });

  useEffect(() => {
    return window.findias.onDownloadProgress((progress) => {
      setProgressByMod((prev) => ({ ...prev, [progress.modId]: progress }));
    });
  }, []);

  /** Drop download progress state once an install/update finishes. */
  const clearProgress = (modId: string): void =>
    setProgressByMod((prev) => {
      const next = { ...prev };
      delete next[modId];
      return next;
    });

  /** Write fresh mod list state into the React Query cache. */
  const seedModList = (state: ModListState): void => {
    queryClient.setQueryData(MOD_LIST_KEY, state);
  };

  const install = useMutation({
    mutationFn: (modId: string) => window.findias.installOrUpdate(modId),
    onSuccess: (state) => {
      seedModList(state);
      toast.success('Mod installed.');
    },
    onError: (err) => toast.error(errorMessage(err, 'The action failed.')),
    onSettled: (_data, _error, modId) => clearProgress(modId),
  });

  const remove = useMutation({
    mutationFn: (modId: string) => window.findias.deleteMod(modId),
    onSuccess: (state) => {
      seedModList(state);
      toast.success('Mod deleted.');
    },
    onError: (err) => toast.error(errorMessage(err, 'The action failed.')),
  });

  const toggle = useMutation({
    mutationFn: ({ modId, disabled }: { modId: string; disabled: boolean }) =>
      window.findias.setDisabled(modId, disabled),
    onSuccess: seedModList,
    onError: (err) => toast.error(errorMessage(err, 'The action failed.')),
  });

  const prerelease = useMutation({
    mutationFn: (value: boolean) => window.findias.setIncludePrereleases(value),
    onSuccess: seedModList,
    onError: (err) => toast.error(errorMessage(err, 'The action failed.')),
  });

  /** Toggle prerelease inclusion locally and persist via the main process. */
  const handlePrereleaseChange = (value: boolean): void => {
    setIncludePrereleases(value);
    prerelease.mutate(value);
  };

  /** Route a mod row action to the matching install/delete/toggle mutation. */
  const handleAction = (action: ModAction, modId: string): void => {
    if (action === 'delete') remove.mutate(modId);
    else if (action === 'enable') toggle.mutate({ modId, disabled: false });
    else if (action === 'disable') toggle.mutate({ modId, disabled: true });
    else install.mutate(modId);
  };

  const busyModId = install.isPending
    ? install.variables
    : remove.isPending
      ? remove.variables
      : toggle.isPending
        ? toggle.variables.modId
        : undefined;

  const busy = Boolean(busyModId) || prerelease.isPending;
  const groups = data?.groups ?? [];
  const outdated = data?.metadata?.outdated ?? false;

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h1 className="flex-grow text-3xl font-semibold">Findias</h1>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching || busy}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[55%] truncate text-xs text-muted-foreground">
                {setup.gameRootPath}
              </span>
            </TooltipTrigger>
            <TooltipContent>{setup.gameRootPath}</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2">
            <Switch
              id="include-prereleases"
              size="sm"
              checked={includePrereleases}
              onCheckedChange={handlePrereleaseChange}
              disabled={isFetching || busy}
            />
            <Label htmlFor="include-prereleases" className="text-sm font-normal">
              Include prereleases
            </Label>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="size-8" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription className="flex w-full items-center justify-between gap-2">
              <span>{errorMessage(error, 'Failed to load the mod list.')}</span>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data && outdated && (
          <Alert className="border-amber-500/30 text-amber-300">
            <TriangleAlert />
            <AlertDescription className="text-amber-300/90">
              The mod catalog is verified for game version {data.metadata?.supportedGameVersion},
              but the latest client is {data.metadata?.currentGameVersion}. Some mods may be out of
              date — consider disabling volatile mods until they are updated.
            </AlertDescription>
          </Alert>
        )}

        {data && !data.catalog.available && (
          <Alert className="border-amber-500/30 text-amber-300">
            <TriangleAlert />
            <AlertDescription className="text-amber-300/90">
              {data.catalog.error ?? 'The mod catalog is currently unavailable.'} Showing the mods
              already on disk.
            </AlertDescription>
          </Alert>
        )}

        {data && groups.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No mods to show</EmptyTitle>
              <EmptyDescription>
                {data.catalog.available
                  ? 'No compatible mods were found in the latest Uiscias release.'
                  : 'No managed mods are installed.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {groups.length > 0 && (
          <ScrollArea className="max-h-[420px] pr-3">
            <ModList
              groups={groups}
              busyModId={busyModId}
              progressByMod={progressByMod}
              outdated={outdated}
              onAction={handleAction}
            />
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default MainView;
