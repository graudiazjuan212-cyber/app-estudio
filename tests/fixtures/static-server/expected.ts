export const mimeCases = [
  ['index.html', 'text/html; charset=utf-8'],
  ['asset.js', 'text/javascript; charset=utf-8'],
  ['asset.css', 'text/css; charset=utf-8'],
  ['asset.webmanifest', 'application/manifest+json'],
  ['asset.woff2', 'font/woff2'], ['asset.png', 'image/png'],
  ['asset.json', 'application/json'], ['asset.svg', 'image/svg+xml'],
] as const;
export const invalidPaths = [
  '/app-estudio/../index.html', '/app-estudio/%2e%2e/index.html',
  '/app-estudio/a/%2E%2E/index.html', '/app-estudio/%2e%2e%2findex.html',
  '/app-estudio/%5c..%5cindex.html', '/app-estudio/%00', '/app-estudio/%zz',
];
