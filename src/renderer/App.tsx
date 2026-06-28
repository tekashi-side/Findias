import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import SetupGate from './components/SetupGate';
import MainView from './components/MainView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

/** Root view: reads setup state, then routes to {@link SetupGate} or {@link MainView}. */
const App: FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['setupState'],
    queryFn: () => window.findias.getSetupState(),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-md justify-center px-4 py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to read application state.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return data.valid ? <MainView setup={data} /> : <SetupGate />;
};

export default App;
