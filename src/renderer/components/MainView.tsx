import { useDeferredValue, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleX, PackageOpen, RefreshCw, SearchX, X } from 'lucide-react';
import { toast } from 'sonner';
import type { DownloadProgress, SetupState } from '@shared/api';
import type { ModAction, ModListState } from '@shared/modList';
import ModList from './ModList';
import ModDetail from './ModDetail';
import ModTabs, { groupMatchesTab, type ModTab } from './ModTabs';
import TagFilter from './TagFilter';
import LauncherBar from './LauncherBar';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

const MOD_LIST_KEY = ['modList'] as const;

/** Extract a user-facing message from an unknown thrown value, with a fallback. */
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The action failed.';

type MainViewProps = {
  /** The current setup state, passed down (already loaded) from the app root. */
  setup: SetupState;
};

/**
 * The primary screen once setup is valid: search and refresh, load/error/catalog
 * banners, the scrollable mod list, and toast notifications for failed
 * install/update/delete/toggle actions.
 */
const MainView: FC<MainViewProps> = ({ setup }) => {
  const queryClient = useQueryClient();
  const [progressByMod, setProgressByMod] = useState<Record<string, DownloadProgress>>({});
  const [isOutdatedDismissed, setIsOutdatedDismissed] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ModTab>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [updateAllProgress, setUpdateAllProgress] = useState({ done: 0, total: 0 });
  // Synchronous mirror of `isUpdatingAll` so the install mutation's `onError` can
  // suppress its per-mod toast during a batch (the batch reports one summary).
  const isUpdatingAllRef = useRef(false);
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: MOD_LIST_KEY,
    queryFn: () => window.findias.refresh(),
  });

  // Optimistic mirror of the persisted setting so the switch responds instantly.
  // Seeded from the (already-loaded) setup prop so the first render is correct.
  const [shouldStartGameAutomatically, setShouldStartGameAutomatically] = useState(
    setup.shouldStartGameAutomatically,
  );
  useEffect(() => {
    setShouldStartGameAutomatically(setup.shouldStartGameAutomatically);
  }, [setup.shouldStartGameAutomatically]);

  const startGameAutomatically = useMutation({
    mutationFn: (shouldStart: boolean) => window.findias.setStartGameAutomatically(shouldStart),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['setupState'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  /** Optimistically reflect the auto-start toggle, then persist it. */
  const handleStartGameAutomaticallyChange = (shouldStart: boolean): void => {
    setShouldStartGameAutomatically(shouldStart);
    startGameAutomatically.mutate(shouldStart);
  };

  useEffect(() => {
    return window.findias.onDownloadProgress((progress) => {
      setProgressByMod((prev) => ({ ...prev, [progress.modId]: progress }));
    });
  }, []);

  /** Drop the download-progress entry for a mod once its action settles. */
  const clearProgress = (modId: string): void =>
    setProgressByMod((prev) => {
      const next = { ...prev };
      delete next[modId];
      return next;
    });

  /** Prime the cached mod list with the fresh state returned by a mutation. */
  const seedModList = (state: ModListState): void => {
    queryClient.setQueryData(MOD_LIST_KEY, state);
  };

  const install = useMutation({
    mutationFn: (modId: string) => window.findias.installOrUpdate(modId),
    onSuccess: seedModList,
    onError: (e) => {
      // During "Update All" the batch aggregates failures into one summary toast.
      if (!isUpdatingAllRef.current) toast.error(errorMessage(e));
    },
    onSettled: (_data, _error, modId) => clearProgress(modId),
  });

  const remove = useMutation({
    mutationFn: (modId: string) => window.findias.deleteMod(modId),
    onSuccess: seedModList,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggle = useMutation({
    mutationFn: ({ modId, isDisabled }: { modId: string; isDisabled: boolean }) =>
      window.findias.setDisabled(modId, isDisabled),
    onSuccess: seedModList,
    onError: (e) => toast.error(errorMessage(e)),
  });

  // On success the main process quits Findias, so only failures are handled here.
  const start = useMutation({
    mutationFn: () => window.findias.startGame(),
    onSuccess: (result) => {
      if (result.isOk) return;
      toast.error(
        result.reason === 'no-game-folder'
          ? 'No game folder is set. Choose your Mabinogi folder in Settings.'
          : "Couldn't open your game launcher. Make sure Steam or the Nexon Launcher is installed.",
      );
    },
    onError: () => toast.error('Could not start the game.'),
  });

  /** Dispatch a row's action to the matching mutation. */
  const handleAction = (action: ModAction, modId: string): void => {
    if (action === 'delete') remove.mutate(modId);
    else if (action === 'enable') toggle.mutate({ modId, isDisabled: false });
    else if (action === 'disable') toggle.mutate({ modId, isDisabled: true });
    else install.mutate(modId);
  };

  const busyModId = install.isPending
    ? install.variables
    : remove.isPending
      ? remove.variables
      : toggle.isPending
        ? toggle.variables.modId
        : undefined;

  const isBusy = Boolean(busyModId);
  const groups = data?.groups ?? [];
  const isOutdated = data?.metadata?.isOutdated ?? false;

  // Every variant currently offering an update, including disabled ones. Note the
  // installer always writes to the package root, so updating a disabled mod
  // re-enables it. Matches the "Updates" tab count.
  const updatableModIds = useMemo(
    () =>
      groups
        .flatMap((g) => g.variants)
        .filter((v) => v.actions.includes('update'))
        .map((v) => v.modId),
    [groups],
  );
  const updateCount = updatableModIds.length;

  /**
   * Sequentially update every mod that has an update available. The list is
   * snapshotted up front because each mutation reseeds the cache (and thus
   * `groups`). Failures don't abort the batch. Returns whether every update
   * succeeded so the caller can gate the follow-on launch.
   */
  const handleUpdateAll = async (): Promise<boolean> => {
    const ids = updatableModIds;
    if (ids.length === 0) return true;
    isUpdatingAllRef.current = true;
    setIsUpdatingAll(true);
    setUpdateAllProgress({ done: 0, total: ids.length });
    const failed: string[] = [];
    try {
      for (const modId of ids) {
        try {
          await install.mutateAsync(modId);
        } catch {
          failed.push(modId);
        }
        setUpdateAllProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    } finally {
      isUpdatingAllRef.current = false;
      setIsUpdatingAll(false);
    }
    // On full success stay silent: the combined action launches and quits, so a
    // success toast would only flash before the app closes. Only report
    // failures, which also explains why the launch was aborted.
    if (failed.length > 0) {
      const succeeded = ids.length - failed.length;
      toast.error(`Updated ${succeeded} of ${ids.length} mods. ${failed.length} failed.`);
    }
    return failed.length === 0;
  };

  /** Update all mods (if any), then launch. Aborts the launch if any update failed. */
  const handleUpdateAndStart = async (): Promise<void> => {
    if (updateCount > 0) {
      const didAllSucceed = await handleUpdateAll();
      if (!didAllSucceed) return;
    }
    start.mutate();
  };

  // Every tag present across the catalog, deduped and sorted, for the tag filter.
  const allTags = useMemo(
    () => [...new Set(groups.flatMap((g) => g.tags))].sort((a, b) => a.localeCompare(b)),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    const byTab = groups.filter((g) => groupMatchesTab(g, tab));
    // Logical-OR: keep groups carrying at least one of the selected tags.
    const byTags =
      selectedTags.length === 0
        ? byTab
        : byTab.filter((g) => selectedTags.some((tag) => g.tags.includes(tag)));
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return byTags;
    return byTags.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.variants.some((v) => v.name.toLowerCase().includes(q)),
    );
  }, [groups, deferredSearch, tab, selectedTags]);

  // Resolve the selected variant + its group from the full (unfiltered) list, so
  // the detail pane survives search/tab changes that hide the row.
  const selected = useMemo(() => {
    if (!selectedModId) return null;
    for (const group of groups) {
      const variant = group.variants.find((v) => v.modId === selectedModId);
      if (variant) return { group, variant };
    }
    return null;
  }, [groups, selectedModId]);

  const trimmedSearch = deferredSearch.trim();
  const hasSearchOrTags = Boolean(trimmedSearch) || selectedTags.length > 0;

  const handleClearFilters = (): void => {
    setSearch('');
    setSelectedTags([]);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex h-full min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex shrink-0 items-center gap-2">
            <InputGroup className="grow">
              <InputGroupInput
                placeholder="Search for mods"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <CircleX />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching || isBusy || isUpdatingAll}
            >
              {isFetching ? (
                <Spinner data-icon="inline-start" aria-hidden />
              ) : (
                <RefreshCw data-icon="inline-start" aria-hidden />
              )}
              {isFetching ? 'Refreshing' : 'Refresh'}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 items-center gap-2">
              <ModTabs value={tab} onValueChange={setTab} groups={groups} />
              <TagFilter allTags={allTags} selectedTags={selectedTags} onChange={setSelectedTags} />
            </div>

            {isLoading && (
              <div className="flex shrink-0 justify-center py-12">
                <Spinner className="size-8" />
              </div>
            )}

            {isError && (
              <Alert variant="destructive" className="shrink-0">
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Failed to load the mod list.'}
                </AlertDescription>
                <AlertAction>
                  <Button variant="outline" size="sm" onClick={() => void refetch()}>
                    Retry
                  </Button>
                </AlertAction>
              </Alert>
            )}

            {data && isOutdated && !isOutdatedDismissed && (
              <Alert className="shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-400">
                <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
                  New game patch ({data.metadata?.currentGameVersion}) — some mods may need updates.
                </AlertDescription>
                <AlertAction>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-amber-700/90 hover:text-amber-700 dark:text-amber-400/90 dark:hover:text-amber-400"
                    aria-label="Dismiss"
                    onClick={() => setIsOutdatedDismissed(true)}
                  >
                    <X className="size-4" />
                  </Button>
                </AlertAction>
              </Alert>
            )}

            {data && !data.catalog.isAvailable && (
              <Alert className="shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-400">
                <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
                  {data.catalog.error ?? 'The mod catalog is currently unavailable.'} Showing the
                  mods already on disk.
                </AlertDescription>
              </Alert>
            )}

            {data && groups.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PackageOpen />
                  </EmptyMedia>
                  <EmptyTitle>No mods to show</EmptyTitle>
                  <EmptyDescription>
                    {data.catalog.isAvailable
                      ? 'No compatible mods were found in the latest Uiscias release.'
                      : 'No managed mods are installed.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {data && groups.length > 0 && filteredGroups.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchX />
                  </EmptyMedia>
                  <EmptyTitle>No matches</EmptyTitle>
                  <EmptyDescription>
                    {trimmedSearch ? (
                      <>No mods match &ldquo;{trimmedSearch}&rdquo; in this view.</>
                    ) : selectedTags.length > 0 ? (
                      'No mods match the selected tags.'
                    ) : (
                      'No mods in this view.'
                    )}
                  </EmptyDescription>
                </EmptyHeader>
                {hasSearchOrTags && (
                  <EmptyContent>
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            )}

            {filteredGroups.length > 0 && (
              <ScrollArea className="-mr-3 min-h-0 flex-1">
                <div className="pr-3">
                  <ModList
                    groups={filteredGroups}
                    busyModId={busyModId}
                    progressByMod={progressByMod}
                    isOutdated={isOutdated}
                    isLocked={isUpdatingAll}
                    onAction={handleAction}
                    selectedModId={selectedModId}
                    onSelect={setSelectedModId}
                  />
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <Separator orientation="vertical" />

        <div className="h-full w-[35%] max-w-xl min-w-0 shrink-0">
          <ModDetail variant={selected?.variant ?? null} group={selected?.group ?? null} />
        </div>
      </div>

      <Separator />

      <LauncherBar
        updateCount={updateCount}
        isUpdatingAll={isUpdatingAll}
        updateAllProgress={updateAllProgress}
        isBusy={isBusy}
        isFetching={isFetching}
        isStarting={start.isPending}
        shouldStartGameAutomatically={shouldStartGameAutomatically}
        onUpdateAndStart={() => void handleUpdateAndStart()}
        onStartGameAutomaticallyChange={handleStartGameAutomaticallyChange}
      />
    </div>
  );
};

export default MainView;
