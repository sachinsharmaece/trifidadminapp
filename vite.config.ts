/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // The long form tests (Team, product create, buyer forms) fill dozens of
    // fields; on a loaded dev laptop they ran past the 5 s default.
    testTimeout: 15000,
  },
});
