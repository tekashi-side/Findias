import type { FC } from 'react';
import { type ModState, toDisplayStatus } from '@shared/modList';
import { Badge } from '@/components/ui/badge';

type StatusChipProps = {
  state: ModState;
};

/** A small badge that surfaces orphan status ("Not in release"); other states are conveyed by row actions or version summary. */
const StatusChip: FC<StatusChipProps> = ({ state }) => {
  if (toDisplayStatus(state) !== 'orphan') return null;

  return <Badge variant="outline">Not in release</Badge>;
};

export default StatusChip;
