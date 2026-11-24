import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Backup } from '../../src/data/backupSchema';
import { qualityConfig as c } from './quality-config';
import { answerCorrectly, visibleItem } from './study';

export async function prepare(page: Page) {
  page.on('pageerror', error => { throw error; });
  page.on('console', message => { if (message.type() === 'error') throw new Error(message.text()); });
  await page.addInitScript(now => {
    Object.assign(window, { __ESTUDIO_NOW__: now });
    sessionStorage.setItem('estudio-test-now', now);
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  }, c.now);
}
export async function restore(page: Page, backup: Backup) {
  await page.goto('./#/ajustes');
  await page.getByLabel('Restaurar copia', { exact: true }).setInputFiles({
    name: 'quality-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copia restaurada' })).toBeVisible({ timeout: c.testMs });
}
export async function finish(page: Page) {
  while (!page.url().includes('#/resumen/')) {
    await answerCorrectly(page, await visibleItem(page));
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Pregunta', exact: true })
      .or(page.getByRole('heading', { name: 'Resumen de la sesión' }))).toBeVisible();
  }
  await expect(page.getByText(/^Aciertos:|^No has respondido preguntas evaluables\./)).toBeVisible();
}
export async function forceTheme(page: Page, scheme: 'light' | 'dark', forced: boolean) {
  // Use the opposite OS theme when forced, so both preference paths are actually tested.
  await page.emulateMedia({ colorScheme: forced ? scheme === 'light' ? 'dark' : 'light' : scheme });
  await page.goto('./#/ajustes');
  await page.getByRole('radio', { name: forced ? scheme === 'light' ? 'Claro' : 'Oscuro' : 'Sistema', exact: true }).check();
  await expect(page.getByRole('radiogroup', { name: 'Tema', exact: true })).toBeEnabled();
  if (forced) await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
  else await expect(page.locator('html')).not.toHaveAttribute('data-theme');
}
