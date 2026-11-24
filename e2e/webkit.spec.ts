import { expect, test } from '@playwright/test';
import { answerCorrectly, idbCount, importFixture, visibleItem } from './support/study';
import { pwaTestConfig as config } from './support/config';

// Juan puede importar, estudiar y guardar en Safari de iPhone (solo E2E_WEBKIT=1; ADR-018/020).
test('iPhone imports, answers and persists without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(clock => { Object.assign(window, { __ESTUDIO_NOW__: clock }); }, config.clock);
  await importFixture(page, config.fixture);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await answerCorrectly(page, await visibleItem(page));
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeVisible();
  await expect.poll(() => idbCount(page, 'attempts')).toBe(1);
  await page.reload();
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(1);
  expect(errors).toEqual([]);
});
