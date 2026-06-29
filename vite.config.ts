import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// This file exists solely so the shadcn/ui CLI can detect a Vite + Tailwind
// project. The app itself is built by electron-vite via electron.vite.config.ts;
// tests run via vitest.config.ts. Neither uses this file.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/shared'),
    },
  },
  plugins: [react(), tailwindcss()],
});
