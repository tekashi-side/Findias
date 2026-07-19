import type { FC } from 'react';
import { ArrowUpCircle, CircleCheck, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type LauncherBarProps = {
  /** Number of mods currently offering an update. */
  updateCount: number;
  /** Whether a batch "Update All" is running. */
  isUpdatingAll: boolean;
  /** Progress of the running "Update All" batch. */
  updateAllProgress: { done: number; total: number };
  /** Whether a single-mod operation (install/update/toggle/delete) is running. */
  isBusy: boolean;
  /** Whether the mod list is refreshing. */
  isFetching: boolean;
  /** Whether a Start Game request is in flight. */
  isStarting: boolean;
  onUpdateAll: () => void;
  onStartGame: () => void;
};

/**
 * Full-width bar pinned to the bottom of the main view. Hosts the primary
 * "Start Game" action alongside the relocated "Update All Mods" button. Every
 * control is disabled while any mod operation is in progress.
 */
const LauncherBar: FC<LauncherBarProps> = ({
  updateCount,
  isUpdatingAll,
  updateAllProgress,
  isBusy,
  isFetching,
  isStarting,
  onUpdateAll,
  onStartGame,
}) => {
  const isActionInProgress = isBusy || isUpdatingAll || isFetching;
  const hasUpdates = updateCount > 0;

  return (
    <div className="flex shrink-0 items-center gap-2 px-6 py-4">
      <Button onClick={onStartGame} disabled={isActionInProgress || isStarting}>
        {isStarting ? (
          <Spinner data-icon="inline-start" aria-hidden />
        ) : (
          <Play data-icon="inline-start" aria-hidden />
        )}
        Start Game
      </Button>

      <Button
        variant={hasUpdates ? 'default' : 'secondary'}
        className={cn(hasUpdates && 'bg-emerald-600 text-white hover:bg-emerald-600/90')}
        onClick={onUpdateAll}
        disabled={!hasUpdates || isActionInProgress}
      >
        {isUpdatingAll ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden />
            Updating… ({updateAllProgress.done}/{updateAllProgress.total})
          </>
        ) : hasUpdates ? (
          <>
            <ArrowUpCircle data-icon="inline-start" aria-hidden />
            Update All Mods ({updateCount})
          </>
        ) : (
          <>
            <CircleCheck data-icon="inline-start" aria-hidden />
            Up to date
          </>
        )}
      </Button>
    </div>
  );
};

export default LauncherBar;
