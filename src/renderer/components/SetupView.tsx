import type { FC } from 'react';
import type { SetupState } from '@shared/api';
import SetupFolderStep from './SetupFolderStep';
import SetupPermissionStep from './SetupPermissionStep';
import SetupArchiveStep from './SetupArchiveStep';

/**
 * Setup flow container: step 1 picks a valid game folder; step 2 fixes write
 * permissions when the folder is protected (e.g. under Program Files); step 3
 * offers to archive any pre-existing mods found in it. Which step renders is
 * driven by the setup state resolved in the main process. The permission step
 * comes before archiving because archiving itself writes to the folder.
 */
const SetupView: FC<{ setup: SetupState }> = ({ setup }) => {
  if (!setup.isValid) return <SetupFolderStep />;
  if (!setup.isPackageWritable && setup.gameRootPath) {
    return <SetupPermissionStep gameRootPath={setup.gameRootPath} />;
  }
  return <SetupArchiveStep />;
};

export default SetupView;
