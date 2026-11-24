/// <reference types="node" />
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
const dist = new URL('../../dist/', import.meta.url);
const buildTest = existsSync(dist) ? it : it.skip;
buildTest('checks production precache (skipped when dist does not exist)', () => {
  const sw = readFileSync(new URL('sw.js', dist), 'utf8');
  expect(sw).toMatch(/KaTeX_Main-Regular-[^"\s,]+\.woff2/);
  expect(sw).toContain('index.html');
});
buildTest('checks production manifest and icons (skipped when dist does not exist)', () => {
  const manifest: unknown = JSON.parse(readFileSync(new URL('manifest.webmanifest', dist), 'utf8'));
  expect(manifest).toMatchObject({ orientation: 'any', id: '/app-estudio/', scope: '/app-estudio/', start_url: '/app-estudio/',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ] });
  for (const name of ['icon-192.png', 'icon-512.png', 'maskable-512.png']) expect(existsSync(new URL(`icons/${name}`, dist))).toBe(true);
});

buildTest('C2: generated worker accepts explicit activation and dist excludes virtual registration', () => {
  expect(readFileSync(new URL('sw.js', dist), 'utf8')).toContain('SKIP_WAITING');
  const inspect = (directory: URL): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      expect(entry.name).not.toMatch(/virtual[:_]pwa-register/);
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) inspect(path);
      else if (/\.(js|html|json)$/.test(entry.name)) {
        expect(readFileSync(path, 'utf8')).not.toMatch(/virtual[:_]pwa-register/);
      }
    }
  };
  inspect(dist);
});
