import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { version: packageVersion } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig({
  plugins: [react()],
  define: {
    // Same APP_VERSION stamp the server gets (see Dockerfile); package.json's
    // version when building locally.
    __UI_VERSION__: JSON.stringify(process.env.APP_VERSION || packageVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
