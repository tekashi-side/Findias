import * as Sentry from '@sentry/electron/renderer';

/** Structured context attached to a manually captured error. */
export interface ReportContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
}

/**
 * Initialize the renderer SDK. All renderer events are forwarded through the main
 * process, so `dsn`/`release`/`environment` are configured there — this `init`
 * takes no options.
 */
export const initTelemetry = (): void => {
  Sentry.init();
};

/**
 * Manually report a caught error with optional tags/extra context. A no-op when
 * Sentry isn't initialized or reporting is off (gated in the main process).
 */
export const reportError = (error: unknown, context?: ReportContext): void => {
  Sentry.captureException(error, context);
};
