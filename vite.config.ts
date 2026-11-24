import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { appConfig } from './src/config';

export default defineConfig(({ command, isPreview }) => {
  const base = command === 'build' || isPreview ? appConfig.productionBase : appConfig.developmentBase;
  return {
    base,
    plugins: [react(), VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: appConfig.title, short_name: appConfig.title, lang: 'es', display: 'standalone',
        start_url: base, scope: base, theme_color: appConfig.themeColor,
        background_color: appConfig.backgroundColor,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
    })],
    test: { environment: 'node', include: ['src/**/*.test.ts'], exclude: ['e2e/**'] },
  };
});
