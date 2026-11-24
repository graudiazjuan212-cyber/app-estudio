import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pwaTestConfig } from './config.ts';

function newestFile(dir: string): number {
  return Math.max(0, ...readdirSync(dir, { withFileTypes: true }).map(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? newestFile(path) : statSync(path).mtimeMs;
  }));
}

export function buildVariants(): Record<'A' | 'B', string> {
  const roots = { A: resolve(pwaTestConfig.variants.A), B: resolve(pwaTestConfig.variants.B) };
  const sourceTime = newestFile(resolve('src'));
  for (const version of ['A', 'B'] as const) {
    const dir = roots[version];
    if (process.env.E2E_REBUILD !== '1' && existsSync(join(dir, 'index.html'))
      && existsSync(join(dir, 'sw.js')) && statSync(dir).mtimeMs > sourceTime) continue;
    const windows = process.platform === 'win32';
    const result = spawnSync(windows ? 'npm.cmd' : 'npm',
      ['run', 'build:e2e', '--', '--outDir', pwaTestConfig.variants[version], '--emptyOutDir'], {
        // cmd files require a shell on Windows; all arguments above are fixed repository constants.
        shell: windows, stdio: 'inherit', timeout: pwaTestConfig.buildMs,
        env: { ...process.env, VITE_APP_VERSION: version, VITE_ENABLE_DEMO: 'true' },
      });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Build ${version} failed (${String(result.status)}).`);
  }
  return roots;
}
