import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TitleBarProps = {
  /** Whether the settings toggle is meaningful (true once setup is valid). */
  isSettingsAvailable: boolean;
  /** Whether the settings screen is currently shown. */
  isSettingsOpen: boolean;
  /** Toggle the settings screen on/off. */
  onToggleSettings: () => void;
};

/**
 * Custom window chrome for the frameless BrowserWindow: the app name on the left
 * and settings/minimize/close controls on the right. The bar itself is a drag
 * region (`-webkit-app-region: drag`); the buttons opt out so they stay clickable.
 */
const TitleBar: FC<TitleBarProps> = ({ isSettingsAvailable, isSettingsOpen, onToggleSettings }) => {
  const { data: appInfo } = useQuery({
    queryKey: ['appInfo'],
    queryFn: () => window.findias.getAppInfo(),
  });

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b pr-1 pl-3 [-webkit-app-region:drag]">
      <span className="text-base font-bold text-muted-foreground select-none">Findias</span>
      <div className="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
        <span className="mr-1 text-xs text-muted-foreground/40 tabular-nums select-none">
          v{appInfo?.appVersion ?? '…'}
        </span>
        {isSettingsAvailable && (
          <Button
            variant={isSettingsOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label="Settings"
            aria-pressed={isSettingsOpen}
            onClick={onToggleSettings}
          >
            <Settings className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Minimize"
          onClick={() => window.findias.minimizeWindow()}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          className="hover:bg-destructive hover:text-white"
          onClick={() => window.findias.closeWindow()}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default TitleBar;
