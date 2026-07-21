import type { FC } from 'react';
import { ArrowUpCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
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
  /** Whether "Start Game" launches the game directly (vs. opening the launcher only). */
  shouldStartGameAutomatically: boolean;
  /** Update all mods (if any are available), then launch the game. */
  onUpdateAndStart: () => void;
  onStartGameAutomaticallyChange: (shouldStartGameAutomatically: boolean) => void;
};

/**
 * Full-width bar pinned to the bottom of the main view. Hosts a single combined
 * action that updates all mods (when any are available) and then launches the
 * game, plus the "Start game automatically" switch. The action is disabled while
 * any mod operation or launch is in progress.
 */
const LauncherBar: FC<LauncherBarProps> = ({
  updateCount,
  isUpdatingAll,
  updateAllProgress,
  isBusy,
  isFetching,
  isStarting,
  shouldStartGameAutomatically,
  onUpdateAndStart,
  onStartGameAutomaticallyChange,
}) => {
  const isActionInProgress = isBusy || isUpdatingAll || isFetching;
  const hasUpdates = updateCount > 0;
  const isGreen = hasUpdates || isUpdatingAll;
  const showSpinner = isUpdatingAll || isStarting;
  const ActionIcon = hasUpdates ? ArrowUpCircle : Play;

  return (
    <div className="flex shrink-0 items-center gap-2 px-6 py-4">
      <Button
        variant="default"
        className={cn(isGreen && 'bg-emerald-600 text-white hover:bg-emerald-600/90')}
        onClick={onUpdateAndStart}
        disabled={isActionInProgress || isStarting}
      >
        {showSpinner ? (
          <Spinner data-icon="inline-start" aria-hidden />
        ) : (
          <ActionIcon data-icon="inline-start" aria-hidden />
        )}
        {isUpdatingAll
          ? `Updating… (${updateAllProgress.done}/${updateAllProgress.total})`
          : hasUpdates
            ? 'Update All Mods & Start Game'
            : 'Start Game'}
      </Button>

      <div className="flex items-center gap-2">
        <Switch
          id="start-game-automatically"
          checked={shouldStartGameAutomatically}
          onCheckedChange={onStartGameAutomaticallyChange}
          disabled={isStarting}
        />
        <Label htmlFor="start-game-automatically">Start game automatically</Label>
      </div>
    </div>
  );
};

export default LauncherBar;
