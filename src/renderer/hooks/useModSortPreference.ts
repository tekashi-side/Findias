import { useState } from 'react';
import { isSortBy, isSortDirection, type SortBy, type SortDirection } from '@/lib/modSort';

const SORT_BY_KEY = 'findias-sort-by';
const SORT_DIRECTION_KEY = 'findias-sort-direction';
const DEFAULT_SORT_BY: SortBy = 'name';
const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';

const readStored = <T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T => {
  const stored = localStorage.getItem(key);
  return isValid(stored) ? stored : fallback;
};

export type ModSortPreference = {
  sortBy: SortBy;
  sortDirection: SortDirection;
  setSortBy: (value: SortBy) => void;
  setSortDirection: (value: SortDirection) => void;
};

/**
 * Owns the user's mod-list sort preference, persisted to `localStorage` (a
 * pure display preference, same rationale as `ThemeProvider` — no
 * main-process/IPC round trip needed). Defaults to `(name, asc)`, i.e.
 * today's existing order.
 */
export const useModSortPreference = (): ModSortPreference => {
  const [sortBy, setSortByState] = useState<SortBy>(() =>
    readStored(SORT_BY_KEY, isSortBy, DEFAULT_SORT_BY),
  );
  const [sortDirection, setSortDirectionState] = useState<SortDirection>(() =>
    readStored(SORT_DIRECTION_KEY, isSortDirection, DEFAULT_SORT_DIRECTION),
  );

  const setSortBy = (value: SortBy): void => {
    localStorage.setItem(SORT_BY_KEY, value);
    setSortByState(value);
  };

  const setSortDirection = (value: SortDirection): void => {
    localStorage.setItem(SORT_DIRECTION_KEY, value);
    setSortDirectionState(value);
  };

  return { sortBy, sortDirection, setSortBy, setSortDirection };
};
