import { useState, type FC } from 'react';
import type { SetupState } from '@shared/api';
import SetupWelcomeStep from './SetupWelcomeStep';
import SetupFolderStep from './SetupFolderStep';
import SetupPermissionStep from './SetupPermissionStep';
import SetupArchiveStep from './SetupArchiveStep';

/**
 * Setup flow container: step 0 welcomes first-run users; step 1 picks a valid game
 * folder; step 2 fixes write permissions when the folder is protected (e.g. under
 * Program Files); step 3 offers to archive any pre-existing mods found in it. Which
 * step renders is driven by the setup state resolved in the main process. The
 * permission step comes before archiving because archiving itself writes to the folder.
 */
const SetupView: FC<{ setup: SetupState }> = ({ setup }) => {
  const [hasDismissedWelcome, setHasDismissedWelcome] = useState(false);
  const isFirstRun = setup.gameRootPath === null;

  if (!setup.isValid) {
    if (isFirstRun && !hasDismissedWelcome) {
      return <SetupWelcomeStep onContinue={() => setHasDismissedWelcome(true)} />;
    }
    return <SetupFolderStep />;
  }
  if (!setup.isPackageWritable && setup.gameRootPath) {
    return <SetupPermissionStep gameRootPath={setup.gameRootPath} />;
  }
  return <SetupArchiveStep />;
};

export default SetupView;
