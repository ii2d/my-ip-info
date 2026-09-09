import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import packageJson from './package.json';

function getAppVersion(): string {
  try {
    const gitDesc = execSync('git describe --tags --always', { encoding: 'utf-8' }).trim();
    return gitDesc.startsWith('v') ? gitDesc : `v${gitDesc}`;
  } catch {
    return `v${packageJson.version}`;
  }
}

const appVersion = getAppVersion();
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'my-ip-info',
        short_name: 'my-ip-info',
        description: 'Multi-source IP intelligence and network connectivity diagnostic suite',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'any',
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Strict anti-stale rule: never intercept API or dynamic IP endpoints
        navigateFallbackDenylist: [/^\/api/, /^\/ip/, /^\/geo/, /^\/yaml/, /^\/json/, /^\/health/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8787',
      '/ip': 'http://localhost:8787',
      '/geo': 'http://localhost:8787',
      '/json': 'http://localhost:8787',
      '/yaml': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
});
