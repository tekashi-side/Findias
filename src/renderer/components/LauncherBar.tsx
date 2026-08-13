import type { FC } from 'react';
import { ArrowUpCircle, Play, Power, PowerOff } from 'lucide-react';
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
  /**
   * Whether any mod operation or catalog refresh is running (single-mod op, Update
   * All, refresh, or toggle-all). Derived once by the parent and used to disable
   * the bar's actions. Excludes `isStarting`, which each action adds explicitly.
   */
  isActionInProgress: boolean;
  /** Whether a Start Game request is in flight. */
  isStarting: boolean;
  /** Whether there are disabled managed mods to enable (else "Enable All" is disabled). */
  canEnableAll: boolean;
  /** Whether there are enabled managed mods to disable (else "Disable All" is disabled). */
  canDisableAll: boolean;
  /** Which "toggle all" batch is currently running, if any (drives its spinner/progress). */
  toggleAllDirection: 'enable' | 'disable' | 'disable-volatile' | null;
  /** Whether a batch "toggle all mods" is running. */
  isTogglingAll: boolean;
  /** Progress of the running "toggle all mods" batch. */
  toggleAllProgress: { done: number; total: number };
  /** Whether "Start Game" launches the game directly (vs. opening the launcher only). */
  shouldStartGameAutomatically: boolean;
  /** Update all mods (if any are available), then launch the game. */
  onUpdateAndStart: () => void;
  /** Enable every disabled managed mod. */
  onEnableAll: () => void;
  /** Disable every enabled managed mod. */
  onDisableAll: () => void;
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
  isActionInProgress,
  isStarting,
  canEnableAll,
  canDisableAll,
  toggleAllDirection,
  isTogglingAll,
  toggleAllProgress,
  shouldStartGameAutomatically,
  onUpdateAndStart,
  onEnableAll,
  onDisableAll,
  onStartGameAutomaticallyChange,
}) => {
  const hasUpdates = updateCount > 0;
  const isGreen = hasUpdates || isUpdatingAll;
  const showSpinner = isUpdatingAll || isStarting;
  const ActionIcon = hasUpdates ? ArrowUpCircle : Play;

  return (
    <div className="flex shrink-0 items-center gap-4 px-6 py-4">
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
            ? 'Update All Mods & Start Launcher'
            : 'Start Launcher'}
      </Button>

      <div className="flex items-center gap-2">
        <Switch
          id="start-game-automatically"
          checked={shouldStartGameAutomatically}
          onCheckedChange={onStartGameAutomaticallyChange}
          disabled={isStarting || isTogglingAll}
        />
        <Label htmlFor="start-game-automatically">Start game automatically</Label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          disabled={isActionInProgress || isStarting || !canEnableAll}
          onClick={onEnableAll}
          variant="outline"
        >
          {toggleAllDirection === 'enable' ? (
            <Spinner data-icon="inline-start" aria-hidden />
          ) : (
            <Power data-icon="inline-start" aria-hidden />
          )}
          {toggleAllDirection === 'enable'
            ? `Enabling… (${toggleAllProgress.done}/${toggleAllProgress.total})`
            : 'Enable All Mods'}
        </Button>
        <Button
          disabled={isActionInProgress || isStarting || !canDisableAll}
          onClick={onDisableAll}
          variant="outline"
        >
          {toggleAllDirection === 'disable' ? (
            <Spinner data-icon="inline-start" aria-hidden />
          ) : (
            <PowerOff data-icon="inline-start" aria-hidden />
          )}
          {toggleAllDirection === 'disable'
            ? `Disabling… (${toggleAllProgress.done}/${toggleAllProgress.total})`
            : 'Disable All Mods'}
        </Button>
      </div>
    </div>
  );
};

export default LauncherBar;
