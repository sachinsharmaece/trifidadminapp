import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Only used by the dev server: where /api requests are forwarded to.
  const env = loadEnv(mode, '.', 'VITE_');
  const apiProxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],

    // Vite 8 reads the `@/*` alias straight from tsconfig.json, so there is no second copy to keep in sync.
    resolve: {
      tsconfigPaths: true,
    },

    server: {
      proxy: {
        // Same-origin in dev: the browser calls /api/v1/... and Vite forwards it, so cookies just work.
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
