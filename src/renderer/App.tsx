import { useState, type FC, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import SetupView from './components/SetupView';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import FeedbackView from './components/FeedbackView';
import TitleBar from './components/TitleBar';
import { useAppUpdate } from './hooks/useAppUpdate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';

/** Which full-screen overlay (if any) replaces the main mod view. */
type Overlay = 'none' | 'settings' | 'feedback';

/** Root view: reads setup state, then routes to {@link SetupView}, {@link MainView}, {@link SettingsView}, or {@link FeedbackView}. */
const App: FC = () => {
  const [overlay, setOverlay] = useState<Overlay>('none');

  useAppUpdate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['setupState'],
    queryFn: () => window.findias.getSetupState(),
  });

  const isSettingsAvailable = Boolean(data?.isValid) && !data?.shouldShowModArchive;
  const isSettingsOpen = overlay === 'settings';
  const isFeedbackOpen = overlay === 'feedback';

  /** Toggle an overlay on, or back to the main view if it's already open. */
  const toggleOverlay = (target: Exclude<Overlay, 'none'>): void =>
    setOverlay((current) => (current === target ? 'none' : target));

  /** Wrap content with the persistent frameless title bar shell. */
  const shell = (content: ReactNode): ReactNode => (
    <div className="flex h-full flex-col">
      <TitleBar
        isSettingsAvailable={isSettingsAvailable}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => toggleOverlay('settings')}
        isFeedbackOpen={isFeedbackOpen}
        onToggleFeedback={() => toggleOverlay('feedback')}
      />
      <div className="min-h-0 flex-1">{content}</div>
      <Toaster />
    </div>
  );

  if (isLoading) {
    return shell(
      <div className="mx-auto flex max-w-md justify-center px-4 py-12">
        <Spinner className="size-8" />
      </div>,
    );
  }

  if (error || !data) {
    return shell(
      <div className="mx-auto max-w-md px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to read application state.</AlertDescription>
        </Alert>
      </div>,
    );
  }

  if (!data.isValid || data.shouldShowModArchive) return shell(<SetupView setup={data} />);

  if (isSettingsOpen) return shell(<SettingsView setup={data} />);
  if (isFeedbackOpen) return shell(<FeedbackView />);
  return shell(<MainView />);
};

export default App;
