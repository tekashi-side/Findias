import { useMemo } from 'react';
import type { BulkActionIds, ModGroupRow } from '@shared/modList';
import { deriveBulkActionIds } from '@shared/modList';

/**
 * Memoized view of the modId lists that power the bulk actions (Update All /
 * Enable All / Disable All / Disable Volatile). Thin wrapper over the pure
 * {@link deriveBulkActionIds} so the derivation stays unit-testable while the
 * component only re-computes when `groups` changes.
 */
export const useBulkActionIds = (groups: readonly ModGroupRow[]): BulkActionIds =>
  useMemo(() => deriveBulkActionIds(groups), [groups]);
