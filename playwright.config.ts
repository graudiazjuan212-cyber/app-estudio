import { defineConfig, devices } from '@playwright/test';
import { appConfig, previewUrl } from './src/config';

function configuration() {
  return defineConfig({
    testDir: './e2e',
    use: { baseURL: previewUrl() },
    projects: [{ name: 'android', use: { ...devices['Pixel 7'], channel: 'chrome' } }],
    webServer: {
      command: `npm run build:e2e && npm run preview:e2e -- --port ${String(appConfig.previewPort)} --strictPort`,
      env: { VITE_ENABLE_DEMO: 'true' },
      url: previewUrl(),
      reuseExistingServer: !process.env.CI,
    },
  });
}
export default configuration();
