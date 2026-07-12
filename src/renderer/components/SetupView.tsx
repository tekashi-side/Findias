import type { FC } from 'react';
import type { SetupState } from '@shared/api';
import SetupFolderStep from './SetupFolderStep';
import SetupArchiveStep from './SetupArchiveStep';

/**
 * Setup flow container: step 1 picks a valid game folder; step 2 offers to
 * archive any pre-existing mods found in it. Which step renders is driven by the
 * setup state resolved in the main process.
 */
const SetupView: FC<{ setup: SetupState }> = ({ setup }) => {
  if (!setup.isValid) return <SetupFolderStep />;
  return <SetupArchiveStep />;
};

export default SetupView;
