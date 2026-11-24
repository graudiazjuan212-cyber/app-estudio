export const pwaTestConfig = {
  basePath: '/app-estudio/', host: '127.0.0.1',
  waitMs: 15000, testMs: 90000, buildMs: 180000, noReloadMs: 2000,
  clock: '2026-11-24T10:00:00Z', fixture: 'mat-ejemplo-c01',
  variants: { A: 'dist-e2e-a', B: 'dist-e2e-b' },
  mime: {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json',
    '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json',
    '.svg': 'image/svg+xml',
  } as Record<string, string>,
};
