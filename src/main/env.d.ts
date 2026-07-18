// Ambient typings for `import.meta.env` in the main/preload build. electron-vite
// injects `import.meta.env.DEV`/`PROD`/`MODE` (and statically replaces them so
// dev-only branches are dead-stripped from packaged builds), but ships no types
// for them, and `tsconfig.node.json` doesn't reference `vite/client`. Keep this a
// script (no import/export) so it augments the global `ImportMeta`.

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
