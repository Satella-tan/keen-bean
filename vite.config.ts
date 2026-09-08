import { defineConfig } from 'vite';

export default defineConfig({
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'esnext',
  },
});
