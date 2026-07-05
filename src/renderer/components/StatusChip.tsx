import type { FC } from 'react';
import type { ModStatus } from '@shared/modList';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusChipVisibility = 'all' | 'list';

type StatusChipProps = {
  status: ModStatus;
  /** `all` (default): every status. `list`: only show statuses not conveyed by row actions (orphan). */
  visibility?: StatusChipVisibility;
};

const LIST_HIDDEN_STATUSES: ReadonlySet<ModStatus> = new Set([
  'not-installed',
  'update-available',
  'disabled',
  'up-to-date',
]);

const CONFIG: Record<ModStatus, { label: string; className: string }> = {
  'not-installed': { label: 'Not installed', className: '' },
  'up-to-date': {
    label: 'Up to date',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  'update-available': {
    label: 'Update available',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  disabled: {
    label: 'Disabled',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  orphan: { label: 'Not in release', className: '' },
};

/** A small badge that renders a mod's {@link ModStatus} with status-specific color. */
const StatusChip: FC<StatusChipProps> = ({ status, visibility = 'all' }) => {
  if (visibility === 'list' && LIST_HIDDEN_STATUSES.has(status)) return null;

  const { label, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={cn(className)}>
      {label}
    </Badge>
  );
};

export default StatusChip;
