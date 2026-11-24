import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const assets = new URL('../dist/assets/', import.meta.url);
const available = existsSync(assets);
it.skipIf(!available)('normal build excludes demo (skipped: dist/assets absent)', () => {
  const javascript = readdirSync(assets).filter(name => name.endsWith('.js'))
    .map(name => readFileSync(new URL(name, assets), 'utf8')).join('');
  expect(javascript).not.toContain('DemoScreen');
  expect(javascript).not.toContain('mat-i3');
});
