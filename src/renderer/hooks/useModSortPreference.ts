import { useState } from 'react';
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
  isSortBy,
  isSortDirection,
  type SortBy,
  type SortDirection,
} from '@shared/modSort';
import { readStoredPreference } from '@/lib/preferences';

const SORT_BY_KEY = 'findias-sort-by';
const SORT_DIRECTION_KEY = 'findias-sort-direction';

export type ModSortPreference = {
  sortBy: SortBy;
  sortDirection: SortDirection;
  setSortBy: (value: SortBy) => void;
  setSortDirection: (value: SortDirection) => void;
  /** Restore `(name, asc)` — the order the main process emits. */
  resetSort: () => void;
};

/**
 * Owns the user's mod-list sort preference, persisted to `localStorage` (a
 * pure display preference, same rationale as `ThemeProvider` — no
 * main-process/IPC round trip needed). Defaults to the order the resolver
 * already emits, so an untouched install looks unchanged.
 */
export const useModSortPreference = (): ModSortPreference => {
  const [sortBy, setSortByState] = useState<SortBy>(() =>
    readStoredPreference(localStorage, SORT_BY_KEY, isSortBy, DEFAULT_SORT_BY),
  );
  const [sortDirection, setSortDirectionState] = useState<SortDirection>(() =>
    readStoredPreference(localStorage, SORT_DIRECTION_KEY, isSortDirection, DEFAULT_SORT_DIRECTION),
  );

  const setSortBy = (value: SortBy): void => {
    localStorage.setItem(SORT_BY_KEY, value);
    setSortByState(value);
  };

  const setSortDirection = (value: SortDirection): void => {
    localStorage.setItem(SORT_DIRECTION_KEY, value);
    setSortDirectionState(value);
  };

  const resetSort = (): void => {
    setSortBy(DEFAULT_SORT_BY);
    setSortDirection(DEFAULT_SORT_DIRECTION);
  };

  return { sortBy, sortDirection, setSortBy, setSortDirection, resetSort };
};
