/**
 * Shared Sentry configuration. The DSN is write-only and safe to embed — it
 * exposes only the numeric org/project IDs and the ingest region, never the org
 * slug — so it lives here as a committed constant rather than a build-time secret.
 *
 * The org/project slugs needed for source-map upload are intentionally NOT here:
 * `@sentry/vite-plugin` reads them from the environment at build time (see
 * `electron.vite.config.ts`), keeping them out of the repo.
 */

export const SENTRY_DSN =
  'https://a4b53e2483e6cb7503781ec9c71b24f8@o4511748463525888.ingest.us.sentry.io/4511748472242176';

/**
 * Sentry release name for a given app version. Must match the release the Vite
 * plugin uploads source maps under, so stack traces resolve correctly.
 */
export const sentryRelease = (version: string): string => `findias@${version}`;
