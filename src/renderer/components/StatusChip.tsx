import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ModStatus } from '@shared/modList';

type StatusChipProps = {
  status: ModStatus;
};

const CONFIG: Record<ModStatus, { label: string; className: string }> = {
  'not-installed': { label: 'Not installed', className: 'text-muted-foreground' },
  'up-to-date': { label: 'Up to date', className: 'border-emerald-500/40 text-emerald-400' },
  'update-available': {
    label: 'Update available',
    className: 'border-amber-500/40 text-amber-400',
  },
  disabled: { label: 'Disabled', className: 'border-sky-500/40 text-sky-400' },
  orphan: { label: 'Not in release', className: 'text-muted-foreground' },
};

/** Badge showing a mod variant's install/update status. */
const StatusChip: FC<StatusChipProps> = ({ status }) => {
  const { label, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={cn(className)}>
      {label}
    </Badge>
  );
};

export default StatusChip;
