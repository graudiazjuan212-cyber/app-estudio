import { defineConfig, devices } from '@playwright/test';
import { appConfig, previewUrl } from './src/config';

function configuration() {
  const selected = process.argv.flatMap((arg, index, args) =>
    arg.startsWith('--project=') ? [arg.slice('--project='.length)]
      : arg === '--project' ? [args[index + 1] ?? ''] : []);
  const onlyPwa = selected.length > 0 && selected.every(name => name === 'pwa');
  return defineConfig({
    testDir: './e2e',
    testMatch: /\.spec\.ts/,
    use: { baseURL: previewUrl() },
    projects: [
      { name: 'android', testIgnore: [/pwa\.spec\.ts/, /webkit\.spec\.ts/],
        use: { ...devices['Pixel 7'], channel: 'chrome' } },
      { name: 'pwa', testMatch: /pwa\.spec\.ts/, workers: 1, retries: 0,
        use: { ...devices['Pixel 7'], channel: 'chrome' } },
      ...(process.env.E2E_WEBKIT === '1' ? [{ name: 'iphone', testMatch: /webkit\.spec\.ts/,
        use: { ...devices['iPhone 13'], browserName: 'webkit' as const } }] : []),
    ],
    // Playwright webServer is global. PWA never uses it; standalone --project=pwa omits it entirely.
    ...(onlyPwa ? {} : { webServer: {
      command: `npm run build:e2e && npm run preview:e2e -- --port ${String(appConfig.previewPort)} --strictPort`,
      env: { VITE_ENABLE_DEMO: 'true' },
      url: previewUrl(),
      reuseExistingServer: !process.env.CI,
    } }),
  });
}
export default configuration();
