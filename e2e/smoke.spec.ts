import { expect, test } from '@playwright/test';

test('home, settings, reload and production manifest', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => { errors.push(error.message); });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Estudio', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
  await expect(page).toHaveURL(/#\/ajustes$/);
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver' }).click();
  await expect(page.getByRole('heading', { name: 'Estudio', exact: true })).toBeVisible();
  await page.goto('./#/unknown');
  await expect(page.getByRole('heading', { name: 'Estudio', exact: true })).toBeVisible();
  const manifestPath = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestPath).toBe('/app-estudio/manifest.webmanifest');
  const response = await page.request.get(manifestPath ?? '');
  expect(response.ok()).toBe(true);
  const manifest: unknown = await response.json();
  expect(manifest).toMatchObject({ short_name: 'Estudio', start_url: '/app-estudio/', scope: '/app-estudio/', display: 'standalone', lang: 'es' });
  expect(errors).toEqual([]);
});
