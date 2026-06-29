import type { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChooseFolderResult } from '@shared/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** First-run screen prompting the user to pick their Mabinogi game folder. */
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
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold">Welcome to Findias</h1>
      <p className="text-sm text-muted-foreground">
        To get started, choose your Mabinogi game folder. This is the{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">appdata</code> folder inside your
        Mabinogi install — it contains a{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">package</code> subfolder. Findias
        needs this before it can manage mods.
      </p>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      {choose.isError && (
        <Alert variant="destructive">
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
  );
};

export default SetupGate;
