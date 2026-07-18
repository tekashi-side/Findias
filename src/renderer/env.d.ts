/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to '1' by `npm run dev:log`; gates the dev-only Sentry self-test panel. */
  readonly VITE_FINDIAS_SENTRY_DEV?: string;
}

declare global {
  interface Window {
    /** Dev-only helper to preview the app-update toast from devtools. */
    __previewAppUpdateToast?: (version?: string) => void;
  }
}

export {};
