import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import SetupGate from './components/SetupGate';
import MainView from './components/MainView';

/** Root shell: setup gate, main view, and global UI providers. */
const App: FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['setupState'],
    queryFn: () => window.findias.getSetupState(),
  });

  let content;
  if (isLoading) {
    content = (
      <div className="mx-auto max-w-sm p-6">
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      </div>
    );
  } else if (error || !data) {
    content = (
      <div className="mx-auto max-w-sm p-6">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>Failed to read application state.</AlertDescription>
        </Alert>
      </div>
    );
  } else {
    content = data.valid ? <MainView setup={data} /> : <SetupGate />;
  }

  return (
    <TooltipProvider>
      {content}
      <Toaster />
    </TooltipProvider>
  );
};

export default App;
