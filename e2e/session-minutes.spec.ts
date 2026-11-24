import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { importFixture } from './support/study';

async function storedMinutes(page: Page): Promise<number[]> {
  return page.evaluate(() => new Promise<number[]>((resolve, reject) => {
    const request = indexedDB.open('estudio');
    request.onerror = () => { reject(new Error('Cannot open database')); };
    request.onsuccess = () => {
      const db = request.result;
      const rows = db.transaction('sessions').objectStore('sessions').getAll();
      rows.onsuccess = () => {
        db.close(); resolve((rows.result as { minutes: number }[]).map(row => row.minutes));
      };
      rows.onerror = () => { db.close(); reject(new Error('Cannot read sessions')); };
    };
  }));
}
async function savedDefault(page: Page): Promise<number | null> {
  return page.evaluate(() => new Promise<number | null>((resolve, reject) => {
    const request = indexedDB.open('estudio');
    request.onerror = () => { reject(new Error('Cannot open database')); };
    request.onsuccess = () => {
      const db = request.result;
      const row = db.transaction('settings').objectStore('settings').get('sessionMinutes');
      row.onsuccess = () => {
        db.close(); resolve((row.result as { value: number } | undefined)?.value ?? null);
      };
      row.onerror = () => { db.close(); reject(new Error('Cannot read settings')); };
    };
  }));
}
test.beforeEach(async ({ page }) => {
  await importFixture(page, 'mat-ejemplo-c01');
  await page.goto('./');
});
for (const minutes of [10, 1]) test(`home starts ${String(minutes)} minutes without changing settings`, async ({ page }) => {
  const selector = page.getByRole('combobox', { name: 'Duración de la sesión de Matemáticas (ejemplo)', exact: true });
  await expect(selector).toHaveValue('10');
  await expect(selector.getByRole('option')).toHaveText(['1 min', '5 min', '10 min', '15 min', '30 min']);
  expect(await selector.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await selector.selectOption(String(minutes));
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  expect(await storedMinutes(page)).toEqual([minutes]);
  await page.goto('./#/ajustes');
  await expect(page.getByRole('radiogroup', { name: 'Duración de la sesión por defecto', exact: true })
    .getByRole('radio', { name: '10 min', exact: true })).toBeChecked();
});
test('saved thirty minute default initializes selector and a five minute override stays local', async ({ page }) => {
  await page.goto('./#/ajustes');
  const group = page.getByRole('radiogroup', { name: 'Duración de la sesión por defecto', exact: true });
  await expect(group.getByRole('radio')).toHaveCount(5);
  await expect(page.getByRole('radiogroup', { name: 'Objetivo diario', exact: true }).getByRole('radio')).toHaveCount(3);
  await group.getByRole('radio', { name: '30 min', exact: true }).check();
  // The radio is optimistic: wait until the value is really stored before leaving the page.
  await expect.poll(() => savedDefault(page)).toBe(30);
  await page.goto('./');
  const selector = page.getByRole('combobox');
  await expect(selector).toHaveValue('30');
  await selector.selectOption('5');
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  expect(await storedMinutes(page)).toEqual([5]);
  await page.goto('./#/ajustes');
  await expect(group.getByRole('radio', { name: '30 min', exact: true })).toBeChecked();
  await page.goto('./#/asignatura/ejmat');
  await expect(page.getByRole('combobox')).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Duración de la sesión', exact: true })).toHaveValue('30');
});
test('chapter review uses the saved duration without another selector', async ({ page }) => {
  await page.goto('./#/ajustes');
  const group = page.getByRole('radiogroup', { name: 'Duración de la sesión por defecto', exact: true });
  await group.getByRole('radio', { name: '30 min', exact: true }).check();
  // The radio is optimistic: wait until the value is really stored before leaving the page.
  await expect.poll(() => savedDefault(page)).toBe(30);
  await page.goto('./#/asignatura/ejmat');
  await expect(page.getByRole('combobox')).toHaveCount(1);
  await page.getByRole('button', { name: 'Repasar capítulo', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  expect(await storedMinutes(page)).toEqual([30]);
});
