/** The slice of `Storage` a preference read needs. Taking it as a parameter
 *  (rather than reaching for `localStorage`) keeps this testable under the
 *  project's `node` Vitest environment, where there is no DOM. */
type ReadableStorage = Pick<Storage, 'getItem'>;

/**
 * Read a persisted preference, falling back to the default whenever the stored
 * value is missing or no longer one this build understands (a renamed option, a
 * downgrade, a hand-edited value).
 */
export const readStoredPreference = <T>(
  storage: ReadableStorage,
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T => {
  const stored = storage.getItem(key);
  return isValid(stored) ? stored : fallback;
};
