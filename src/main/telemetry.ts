import { app } from 'electron';
import * as Sentry from '@sentry/electron/main';
import { SENTRY_DSN, sentryRelease } from '../shared/sentry';
import { loadSettings, saveSettings } from './settingsStore';

/**
 * In-memory mirror of the user's opt-out preference. `beforeSend` reads it, so a
 * runtime toggle takes effect immediately without a restart. Renderer events are
 * routed through the main process, so gating here covers them too. Defaults to
 * `true` so the brief window before settings load isn't dropped for opted-in
 * users; it is corrected by {@link syncErrorReportingFromSettings} at startup.
 */
let isErrorReportingEnabled = true;

/** Structured context attached to a manually captured error. */
export interface ReportContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
}

/**
 * Whether Sentry should initialize at all: packaged builds always, or an
 * explicit dev opt-in via `FINDIAS_SENTRY_DEV=1` (see the `dev:log` npm script).
 */
const shouldInitialize = (): boolean => app.isPackaged || process.env.FINDIAS_SENTRY_DEV === '1';

/**
 * Initialize Sentry for the main process (and, via its transport, the renderer).
 * Must run AFTER `app.setPath('userData', ...)` because Sentry caches scope and
 * offline events under `userData`.
 */
export const initTelemetry = (): void => {
  if (!shouldInitialize()) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    release: sentryRelease(app.getVersion()),
    environment: app.isPackaged ? 'production' : 'development',
    beforeSend: (event) => (isErrorReportingEnabled ? event : null),
  });
};

/** Load the persisted opt-out preference into the in-memory flag (call once at startup). */
export const syncErrorReportingFromSettings = async (): Promise<void> => {
  const settings = await loadSettings();
  isErrorReportingEnabled = settings.isErrorReportingEnabled;
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
