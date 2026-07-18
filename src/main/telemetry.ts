import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import * as Sentry from '@sentry/electron/main';
import { SENTRY_DSN, sentryRelease } from '../shared/sentry';
import { loadSettings, loadSettingsSync, saveSettings } from './settingsStore';

/**
 * In-memory mirror of the user's opt-out preference. `beforeSend` reads it, so a
 * runtime toggle takes effect immediately without a restart. Renderer events are
 * routed through the main process, so gating here covers them too. Seeded from
 * the persisted setting synchronously in {@link initTelemetry}.
 */
let isErrorReportingEnabled = true;

/** Structured context attached to a manually captured error. */
export interface ReportContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
}

/** Ambient context describing the current mod/catalog state, attached to events. */
export interface ModContext {
  currentGameVersion?: string;
  supportedGameVersion?: string;
  isOutdated?: boolean;
  installedCount: number;
  catalogAvailable: boolean;
  shouldIncludePrereleases: boolean;
}

/**
 * Whether Sentry should initialize at all: packaged builds always, or an
 * explicit dev opt-in via `FINDIAS_SENTRY_DEV=1` (see the `dev:log` npm script).
 */
const shouldInitialize = (): boolean => app.isPackaged || process.env.FINDIAS_SENTRY_DEV === '1';

/** Persist a freshly-generated install id without clobbering a concurrently-set one. */
const persistInstallId = async (installId: string): Promise<void> => {
  const settings = await loadSettings();
  if (!settings.installId) await saveSettings({ ...settings, installId });
};

/**
 * Initialize Sentry for the main process (and, via its transport, the renderer).
 * Must run AFTER `app.setPath('userData', ...)` because Sentry caches scope and
 * offline events under `userData`, and because it reads persisted settings here.
 *
 * Settings are read synchronously so the opt-out and install id are known before
 * `Sentry.init`: sessions (release health) can only be gated at init — there is
 * no runtime `beforeSendSession` hook — so an opted-out user drops the
 * `MainProcessSession` integration and emits no session data.
 */
export const initTelemetry = (): void => {
  if (!shouldInitialize()) return;
  const settings = loadSettingsSync();
  isErrorReportingEnabled = settings.isErrorReportingEnabled;
  const installId = settings.installId ?? randomUUID();
  if (!settings.installId) void persistInstallId(installId);

  Sentry.init({
    dsn: SENTRY_DSN,
    release: sentryRelease(app.getVersion()),
    environment: app.isPackaged ? 'production' : 'development',
    // Anonymous, random id: lets release health report per-user adoption and
    // crash-free rates. No personal data.
    initialScope: { user: { id: installId } },
    // Sessions can only be gated at init (no runtime hook), so drop the session
    // integration entirely when the user has opted out.
    integrations: isErrorReportingEnabled
      ? undefined
      : (defaults) => defaults.filter((integration) => integration.name !== 'MainProcessSession'),
    beforeSend: (event) => (isErrorReportingEnabled ? event : null),
  });
};

/** Persist and immediately apply the opt-out preference (invoked from the settings IPC handler). */
export const setErrorReportingEnabled = async (isEnabled: boolean): Promise<void> => {
  isErrorReportingEnabled = isEnabled;
  const settings = await loadSettings();
  await saveSettings({ ...settings, isErrorReportingEnabled: isEnabled });
};

/**
 * Manually report a caught error (catch blocks, Zod failures, etc.) with optional
 * tags/extra context. A no-op when Sentry isn't initialized or reporting is off.
 */
export const reportError = (error: unknown, context?: ReportContext): void => {
  Sentry.captureException(error, context);
};

/** Record a breadcrumb (a step in the trail leading up to an error). */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Attach ambient mod/catalog state to future events. The whole shape goes into a
 * `findias` context block (rich detail shown when you open an event); the fields
 * worth filtering/aggregating by across events are also promoted to indexed tags.
 */
export const setModContext = (context: ModContext): void => {
  Sentry.setTag('catalog_available', context.catalogAvailable);
  Sentry.setTag('prereleases', context.shouldIncludePrereleases);
  if (context.currentGameVersion) Sentry.setTag('current_game_version', context.currentGameVersion);
  if (context.supportedGameVersion) {
    Sentry.setTag('supported_game_version', context.supportedGameVersion);
  }
  if (context.isOutdated !== undefined) Sentry.setTag('is_outdated', context.isOutdated);
  Sentry.setContext('findias', { ...context });
};
