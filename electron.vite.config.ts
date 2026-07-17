import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { version } from './package.json';

// Upload source maps only in CI release builds (gated on the build-time auth
// token). The org/project the plugin uploads to come from the environment, so
// they never land in the repo. The release name must match the SDK's `init`
// release (`findias@<version>`) so uploaded maps resolve stack traces. Maps are
// deleted after upload so they never ship to users. Applied to every process
// below, placed last in each `plugins` array so maps are generated before upload.
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
  ? [
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: `findias@${version}` },
        sourcemaps: { filesToDeleteAfterUpload: ['out/**/*.map'] },
      }),
    ]
  : [];

export default defineConfig({
  main: {
    build: { sourcemap: 'hidden' },
    plugins: [externalizeDepsPlugin(), ...sentryPlugins],
  },
  preload: {
    build: { sourcemap: 'hidden' },
    plugins: [externalizeDepsPlugin(), ...sentryPlugins],
  },
  renderer: {
    build: { sourcemap: 'hidden' },
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [react(), tailwindcss(), ...sentryPlugins],
  },
});
