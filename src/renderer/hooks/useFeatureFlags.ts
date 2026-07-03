import type { FeatureFlag } from '@shared/api';

/**
 * Read a feature flag. Flags are resolved once at startup and exposed as a
 * constant on `window.findias.featureFlags` (see the preload). This is a hook so
 * that call sites stay unchanged if the backing source ever becomes async (e.g.
 * a React Query-backed remote flag service).
 */
export const useFeatureFlag = (flag: FeatureFlag): boolean => window.findias.featureFlags[flag];
