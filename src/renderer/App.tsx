import { useState, type FC, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import SetupView from './components/SetupView';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import TitleBar from './components/TitleBar';
import { useAppUpdate } from './hooks/useAppUpdate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';

/** Root view: reads setup state, then routes to {@link SetupView}, {@link MainView}, or {@link SettingsView}. */
const App: FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  useAppUpdate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['setupState'],
    queryFn: () => window.findias.getSetupState(),
  });

  const settingsAvailable = Boolean(data?.valid) && !data?.needsModArchive;

  /** Wrap content with the persistent frameless title bar shell. */
  const shell = (content: ReactNode): ReactNode => (
    <div className="flex h-full flex-col">
      <TitleBar
        settingsAvailable={settingsAvailable}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
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

  if (!data.valid || data.needsModArchive) return shell(<SetupView setup={data} />);

  return shell(settingsOpen ? <SettingsView setup={data} /> : <MainView />);
};

export default App;
