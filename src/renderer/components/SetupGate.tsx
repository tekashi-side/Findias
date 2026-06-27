import type { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ChooseFolderResult } from '@shared/api';

/** First-run screen: pick and validate the Mabinogi game folder. */
const SetupGate: FC = () => {
  const queryClient = useQueryClient();

  const choose = useMutation<ChooseFolderResult>({
    mutationFn: () => window.findias.chooseGameFolder(),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ['setupState'] });
      }
    },
  });

  const result = choose.data;
  const validationError = result && !result.ok && !result.canceled ? result.error : undefined;

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Welcome to Findias</h1>
        <p className="text-muted-foreground">
          To get started, choose your Mabinogi game folder. This is the <code>appdata</code> folder
          inside your Mabinogi install — it contains a <code>package</code> subfolder. Findias needs
          this before it can manage mods.
        </p>

        {validationError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
        {choose.isError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>Something went wrong opening the folder picker.</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={() => choose.mutate()} disabled={choose.isPending}>
            {choose.isPending ? 'Opening…' : 'Choose game folder'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Example: D:\Nexon\Library\mabinogi\appdata</p>
      </div>
    </div>
  );
};

export default SetupGate;
