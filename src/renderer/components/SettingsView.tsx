import type { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChooseFolderResult, SetupState } from '@shared/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';

type SettingsViewProps = {
  setup: SetupState;
};

/**
 * Dedicated settings screen that replaces the two-column mod view. Each setting
 * category is wrapped in an {@link Item} (mirroring the mod list). For now it
 * offers a single option: re-selecting the Mabinogi game folder. A successful
 * change invalidates the setup state and mod list so both reflect the new path.
 */
const SettingsView: FC<SettingsViewProps> = ({ setup }) => {
  const queryClient = useQueryClient();

  const choose = useMutation<ChooseFolderResult>({
    mutationFn: () => window.findias.chooseGameFolder(),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ['setupState'] });
        void queryClient.invalidateQueries({ queryKey: ['modList'] });
      }
    },
  });

  const result = choose.data;
  const validationError = result && !result.ok && !result.canceled ? result.error : undefined;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <h1 className="font-heading text-3xl font-semibold">Settings</h1>

      <ItemGroup className="max-w-2xl">
        <Item variant="outline" className="items-start">
          <ItemContent>
            <ItemTitle>Game folder</ItemTitle>
            <ItemDescription>
              The Mabinogi <code className="rounded bg-muted px-1 py-0.5 text-xs">appdata</code>{' '}
              folder Findias manages mods in.
            </ItemDescription>
            <span className="text-xs break-all text-muted-foreground">{setup.gameRootPath}</span>

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
          </ItemContent>

          <ItemActions>
            <Button variant="outline" onClick={() => choose.mutate()} disabled={choose.isPending}>
              {choose.isPending ? 'Opening…' : 'Change game folder'}
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>
    </div>
  );
};

export default SettingsView;
