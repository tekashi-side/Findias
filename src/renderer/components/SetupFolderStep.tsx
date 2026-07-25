import { useState, type FC, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, Rocket } from 'lucide-react';
import type {
  ChooseFolderResult,
  DetectedGameFolder,
  DetectGameFoldersResult,
  GameLauncher,
} from '@shared/api';
import GameFolderItem from './GameFolderItem';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ItemGroup } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';

type FolderMode = 'confirm' | 'dual-select' | 'picker';

const LAUNCHER_LABEL: Record<GameLauncher, string> = {
  nexon: 'Nexon Launcher',
  steam: 'Steam',
};

const launcherIcon = (launcher: GameLauncher): ReactNode =>
  launcher === 'steam' ? <Gamepad2 /> : <Rocket />;

const folderTitle = (folder: DetectedGameFolder): string => LAUNCHER_LABEL[folder.launcher];

const deriveMode = (foundCount: number): FolderMode => {
  if (foundCount === 1) return 'confirm';
  if (foundCount === 2) return 'dual-select';
  return 'picker';
};

/** First-run setup step: auto-detect or prompt for the Mabinogi game folder. */
const SetupFolderStep: FC = () => {
  const queryClient = useQueryClient();
  const [modeOverride, setModeOverride] = useState<FolderMode | null>(null);

  const detect = useQuery({
    queryKey: ['detectGameFolders'],
    queryFn: () => window.findias.detectGameFolders(),
    staleTime: Infinity,
  });

  const invalidateSetup = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['setupState'] });
  };

  const setFolder = useMutation<ChooseFolderResult, Error, string>({
    mutationFn: (path) => window.findias.setGameFolder(path),
    onSuccess: (result) => {
      if (result.isOk) {
        invalidateSetup();
      }
    },
  });

  const choose = useMutation<ChooseFolderResult>({
    mutationFn: () => window.findias.chooseGameFolder(),
    onSuccess: (result) => {
      if (result.isOk) {
        invalidateSetup();
      }
    },
  });

  const setFolderError = setFolder.data && !setFolder.data.isOk ? setFolder.data.error : undefined;
  const chooseResult = choose.data;
  const chooseValidationError =
    chooseResult && !chooseResult.isOk && !chooseResult.isCanceled ? chooseResult.error : undefined;
  const isActionPending = setFolder.isPending || choose.isPending;

  if (detect.isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-8">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (detect.isError || !detect.data) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-lg flex-col gap-4 text-center">
          <Alert variant="destructive">
            <AlertDescription>
              Could not check for an existing Mabinogi install. Please try again.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => void detect.refetch()} size="lg">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const data: DetectGameFoldersResult = detect.data;
  const mode = modeOverride ?? deriveMode(data.found.length);

  if (mode === 'confirm' && data.found.length === 1) {
    const detected = data.found[0];
    return (
      <div className="flex h-full items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-lg flex-col gap-6 text-center">
          <h1 className="font-heading text-3xl font-semibold">Game Folder Detected</h1>
          <p className="text-sm text-muted-foreground">We auto-detected your install location:</p>

          <ItemGroup className="text-left">
            <GameFolderItem
              title={folderTitle(detected)}
              path={detected.path}
              icon={launcherIcon(detected.launcher)}
            />
          </ItemGroup>

          {setFolderError && (
            <Alert variant="destructive">
              <AlertDescription>{setFolderError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-3">
            <Button
              disabled={isActionPending}
              onClick={() => setFolder.mutate(detected.path)}
              size="lg"
            >
              {setFolder.isPending ? 'Saving…' : 'Confirm'}
            </Button>
            <Button
              disabled={isActionPending}
              onClick={() => setModeOverride('picker')}
              variant="ghost"
            >
              Choose a different folder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'dual-select' && data.found.length === 2) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-lg flex-col gap-6 text-center">
          <h1 className="font-heading text-3xl font-semibold">Choose Your Game Installation</h1>
          <p className="text-sm text-muted-foreground">
            We found multiple Mabinogi installations. Which one do you use?
          </p>

          <ItemGroup className="text-left">
            {data.found.map((folder) => (
              <GameFolderItem
                key={folder.path}
                title={folderTitle(folder)}
                path={folder.path}
                icon={launcherIcon(folder.launcher)}
                actions={
                  <Button
                    size="lg"
                    disabled={isActionPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      setFolder.mutate(folder.path);
                    }}
                  >
                    Select
                  </Button>
                }
              />
            ))}
          </ItemGroup>

          {setFolderError && (
            <Alert variant="destructive">
              <AlertDescription>{setFolderError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-3">
            <Button
              disabled={isActionPending}
              onClick={() => setModeOverride('picker')}
              variant="ghost"
            >
              Choose a different folder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-lg flex-col gap-6 text-center">
        <h1 className="font-heading text-3xl font-semibold">Choose Your Game Folder</h1>
        <p className="text-sm text-muted-foreground">
          To get started, choose your Mabinogi game folder.
        </p>
        <p className="text-sm text-muted-foreground">
          This is the <code className="rounded bg-muted px-1 py-0.5 text-xs">appdata</code> folder
          inside your Mabinogi install. It should contain a{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">package</code> subfolder. Findias
          needs this before it can manage mods.
        </p>

        <ItemGroup className="text-left">
          {data.defaults.map((folder) => (
            <GameFolderItem
              key={folder.path}
              title={folderTitle(folder)}
              path={folder.path}
              icon={launcherIcon(folder.launcher)}
            />
          ))}
        </ItemGroup>

        {chooseValidationError && (
          <Alert variant="destructive">
            <AlertDescription>{chooseValidationError}</AlertDescription>
          </Alert>
        )}
        {setFolderError && (
          <Alert variant="destructive">
            <AlertDescription>{setFolderError}</AlertDescription>
          </Alert>
        )}
        {choose.isError && (
          <Alert variant="destructive">
            <AlertDescription>Something went wrong opening the folder picker.</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <Button disabled={isActionPending} onClick={() => choose.mutate()} size="lg">
            {choose.isPending ? 'Opening…' : 'Choose game folder'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupFolderStep;
