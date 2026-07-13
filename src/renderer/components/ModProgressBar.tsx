import type { FC } from 'react';
import type { DownloadProgress } from '@shared/api';
import { Progress } from '@/components/ui/progress';

type ModProgressBarProps = {
  progress?: DownloadProgress;
};

/**
 * The in-flight download indicator for a mod action: a determinate
 * {@link Progress} bar when the total size is known, otherwise an indeterminate
 * pulsing bar. Callers gate rendering on the row being busy.
 */
const ModProgressBar: FC<ModProgressBarProps> = ({ progress }) => {
  const percent =
    progress && progress.totalBytes
      ? Math.min(100, Math.round((progress.receivedBytes / progress.totalBytes) * 100))
      : null;

  if (percent === null) {
    return (
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full animate-pulse rounded-full bg-primary/60" />
      </div>
    );
  }

  return <Progress value={percent} />;
};

export default ModProgressBar;
