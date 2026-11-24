import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildVariants } from './build-variants';
import { pwaTestConfig as config } from './config';
import { startStaticServer } from './static-server';
import type { StaticServer } from './static-server';
import { answerCorrectly, idbCount, visibleItem } from './study';

export const test = base.extend<{ server: StaticServer }, { variants: Record<'A' | 'B', string> }>({
  variants: [async ({ browserName }, provide) => {
    if (browserName !== 'chromium') throw new Error('PWA tests require Chromium');
    await provide(buildVariants());
  }, { scope: 'worker', timeout: config.buildMs * 2 }],
  server: async ({ variants }, provide) => {
    const server = await startStaticServer(variants.A);
    try { await provide(server); } finally { await server.close(); }
  },
  baseURL: async ({ server }, provide) => { await provide(server.url); },
  context: async ({ context }, provide) => {
    await context.addInitScript(clock => { Object.assign(window, { __ESTUDIO_NOW__: clock }); }, config.clock);
    const errors: string[] = [];
    context.on('page', page => {
      page.on('pageerror', error => { errors.push(error.message); });
      page.on('console', message => {
        if (message.type() !== 'error') return;
        // Ignore only network errors on explicitly external, optional resources. App errors always fail.
        const url = message.location().url;
        if (message.text().includes('net::ERR_') && /^https?:/.test(url)
          && new URL(url).hostname !== config.host) return;
        errors.push(`${url}: ${message.text()}`);
      });
    });
    await provide(context);
    expect(errors).toEqual([]);
  },
});

export function updateNotice(page: Page) {
  return page.getByRole('status').filter({ hasText: 'Hay una versión nueva de la app.' });
}
export async function ready(page: Page) {
  // 1) The worker is active and the precache is complete.
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) return false;
    const names = await caches.keys();
    for (const name of names.filter(key => key.includes('precache'))) {
      const keys = (await (await caches.open(name)).keys()).map(key => new URL(key.url).pathname);
      if (keys.some(key => key.endsWith('/index.html'))
        && keys.some(key => /KaTeX_Main-Regular-[^/]+\.woff2$/.test(key))) return true;
    }
    return false;
  }), { timeout: config.waitMs }).toBe(true);
  // 2) Without clients.claim() (the update is Juan's decision) a page is controlled from its next load, as in the phone.
  if (!await page.evaluate(() => navigator.serviceWorker.controller !== null)) await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: config.waitMs }).toBe(true);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
}
export async function offerUpdate(page: Page, server: StaticServer, root: string) {
  await server.switchRoot(root);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('Missing service worker');
    await registration.update();
  });
  await expect(updateNotice(page)).toBeVisible({ timeout: config.waitMs });
}
export async function start(page: Page) {
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
}
export async function answer(page: Page) {
  const before = await idbCount(page, 'attempts');
  await answerCorrectly(page, await visibleItem(page));
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeVisible();
  await expect.poll(() => idbCount(page, 'attempts')).toBe(before + 1);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
}
export async function version(page: Page, value: 'A' | 'B') {
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
  await expect(page.getByText(`Versión de la app: ${value}`, { exact: true })).toBeVisible();
}
