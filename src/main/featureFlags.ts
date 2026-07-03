import { app } from 'electron';
import type { FeatureFlag, FeatureFlags } from '../shared/api';

/**
 * Feature flags let us gate capabilities behind a runtime condition. Each flag
 * maps to a resolver that decides whether it is active. Kept in the main process
 * so the decision is authoritative and can never be flipped from the renderer.
 *
 * `prereleases` is dev-only: including prerelease Uiscias builds in the catalog
 * is only offered when the app is unpackaged. In a packaged build the flag is
 * off, which hides the UI toggle and force-disables the effective value
 * regardless of what `findias-settings.json` contains.
 */
const FLAG_RESOLVERS: Record<FeatureFlag, () => boolean> = {
  prereleases: () => !app.isPackaged,
};

/** Whether a given feature flag is currently active. */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => FLAG_RESOLVERS[flag]();

/** Snapshot of every feature flag's active state, for sending to the renderer. */
export const getFeatureFlags = (): FeatureFlags => ({
  prereleases: isFeatureEnabled('prereleases'),
});
