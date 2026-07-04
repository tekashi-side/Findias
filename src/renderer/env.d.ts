/// <reference types="vite/client" />

declare global {
  interface Window {
    /** Dev-only helper to preview the app-update toast from devtools. */
    __previewAppUpdateToast?: (version?: string) => void;
  }
}

export {};
