import type { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, Rocket } from 'lucide-react';
import type { ChooseFolderResult } from '@shared/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from '@/components/ui/item';

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
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-lg flex-col gap-6 text-center">
        <h1 className="font-heading text-3xl font-semibold">Findias Setup</h1>
        <p className="text-sm text-muted-foreground">
          To get started, choose your Mabinogi game folder. This is the{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">appdata</code> folder inside your
          Mabinogi install — it contains a{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">package</code> subfolder. Findias
          needs this before it can manage mods.
        </p>

        <ItemGroup className="text-left">
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Rocket />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Nexon Launcher</ItemTitle>
              <ItemDescription className="font-mono text-xs whitespace-nowrap">
                C:\Nexon\Library\mabinogi\appdata
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Gamepad2 />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Steam</ItemTitle>
              <ItemDescription className="font-mono text-xs whitespace-nowrap">
                C:\Program Files (x86)\Steam\steamapps\common\Mabinogi\appdata
              </ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>

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

        <div className="flex justify-center">
          <Button onClick={() => choose.mutate()} disabled={choose.isPending}>
            {choose.isPending ? 'Opening…' : 'Choose game folder'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupGate;
