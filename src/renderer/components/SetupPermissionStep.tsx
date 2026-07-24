import type { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderLock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type SetupPermissionStepProps = {
  gameRootPath: string;
};

/**
 * Setup step shown when the chosen game folder is valid but its `package` folder
 * is write-protected (e.g. a game installed under `C:\Program Files`). Offers a
 * one-time fix that grants the current user write access via a single elevated
 * `icacls` call (one UAC prompt), so all normal mod operations then work without
 * running Findias as administrator. A declined prompt or failed grant leaves the
 * folder unwritable, so the step stays put and offers a retry.
 */
const SetupPermissionStep: FC<SetupPermissionStepProps> = ({ gameRootPath }) => {
  const queryClient = useQueryClient();

  const fix = useMutation({
    mutationFn: () => window.findias.fixPackagePermissions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['setupState'] });
    },
  });

  // The mutation resolves with fresh setup state; a still-unwritable result means
  // the user declined the UAC prompt or the grant didn't take.
  const didFixFail = fix.data ? !fix.data.isPackageWritable : false;

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <FolderLock className="size-6 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-semibold">Permission needed</h1>
          <p className="text-sm text-muted-foreground">
            Your game is installed in a protected location, so Findias can&apos;t manage mods in its{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">package</code> folder yet.
          </p>
          <span className="text-xs break-all text-muted-foreground">{gameRootPath}</span>
        </div>

        <Alert>
          <ShieldCheck />
          <AlertTitle>One-time fix</AlertTitle>
          <AlertDescription>
            Findias will ask for administrator permission once to grant your account write access to
            this folder. After that, installing and updating mods works normally — Findias never
            runs as administrator itself.
          </AlertDescription>
        </Alert>

        {didFixFail && (
          <Alert className="border-amber-500/30 text-amber-700 dark:text-amber-400">
            <TriangleAlert />
            <AlertTitle>Still can&apos;t write to the folder</AlertTitle>
            <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
              The permission wasn&apos;t granted. If you dismissed the prompt, try again and choose
              Yes. Alternatively, reinstall the game outside of a protected folder like Program
              Files.
            </AlertDescription>
          </Alert>
        )}

        {fix.isError && (
          <Alert variant="destructive">
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <Button onClick={() => fix.mutate()} disabled={fix.isPending}>
            <ShieldCheck />
            {fix.isPending ? 'Fixing…' : 'Fix permissions'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupPermissionStep;
