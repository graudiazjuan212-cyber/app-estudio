import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { backupSchema } from '../src/data/backupSchema';
import { answerCorrectly, idbCount, importFixture, visibleItem } from './support/study';

async function shareFails(page: Page) {
  await page.addInitScript(() => {
    Object.assign(window, { __ESTUDIO_NOW__: '2026-11-24T10:00:00Z' });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) });
  });
}
async function studied(page: Page) {
  await importFixture(page, 'mat-ejemplo-c01');
  await page.goto('./#/asignatura/ejmat');
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  // Save a real answer (informational cards can precede the first question).
  while (await idbCount(page, 'attempts') === 0) {
    await answerCorrectly(page, await visibleItem(page));
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  }
}
async function download(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44);
  const downloading = page.waitForEvent('download');
  await button.click();
  const result = await downloading;
  expect(result.suggestedFilename()).toMatch(/\.json$/);
  return result;
}
for (const kind of ['backup', 'progress'] as const) {
  test(`${kind} falls back to a JSON download when Android share is denied`, async ({ page }) => {
    await shareFails(page); await studied(page);
    await page.goto(kind === 'backup' ? './#/ajustes' : './#/asignatura/ejmat');
    const result = await download(page, kind === 'backup' ? 'Exportar copia' : 'Exportar progreso para Claude');
    await expect(page.getByRole('status').filter({ hasText: 'hemos descargado el archivo' })).toContainText(result.suggestedFilename());
    await page.getByText('Detalle técnico', { exact: true }).click();
    await expect(page.locator('details pre')).toContainText('NotAllowedError: Permission denied');
    await expect(page.locator('details pre')).toContainText('application/json');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('No se ha podido completar la operación.', { exact: false })).toHaveCount(0);
  });
}
test('restores exactly the directly downloaded backup into a fresh database', async ({ page, browser }) => {
  await studied(page); await page.goto('./#/ajustes');
  await page.evaluate(() => {
    Object.assign(window, { __shareCalls: 0 });
    Object.defineProperty(navigator, 'share', { configurable: true, value: () => {
      Object.assign(window, { __shareCalls: 1 }); return Promise.reject(new Error('must not share'));
    } });
  });
  const result = await download(page, 'Descargar copia');
  expect(result.suggestedFilename()).toMatch(/^backup_estudio_.*\.json$/);
  const path = test.info().outputPath(result.suggestedFilename()); await result.saveAs(path);
  const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
  const backup = backupSchema.parse(raw);
  expect(backup.data.attempts.length).toBeGreaterThan(0); expect(backup.data.sessions.length).toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: 'Copia creada:' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__shareCalls') as number)).toBe(0);
  const clean = await browser.newContext({ baseURL: new URL('./', page.url()).href });
  try {
    const other = await clean.newPage(); await other.goto('./#/ajustes');
    await expect(other.getByRole('heading', { name: 'Importar paquete' })).toBeVisible();
    for (const table of ['attempts', 'items', 'sessions']) expect(await idbCount(other, table)).toBe(0);
    await importFixture(other, 'ioe-ejemplo-c01');
    await other.getByLabel('Restaurar copia', { exact: true }).setInputFiles(path);
    await other.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(other.getByRole('status').filter({ hasText: 'Copia restaurada:' })).toContainText(`${String(backup.data.attempts.length)} intentos, ${String(backup.data.items.length)} preguntas`);
    for (const table of ['attempts', 'items', 'sessions'] as const) expect(await idbCount(other, table)).toBe(backup.data[table].length);
  } finally { await clean.close(); }
});
test('direct progress download has the unchanged schema and never shares', async ({ page }) => {
  await shareFails(page); await studied(page); await page.goto('./#/asignatura/ejmat');
  const result = await download(page, 'Descargar progreso');
  const raw: unknown = JSON.parse(await readFile(await result.path(), 'utf8'));
  expect(raw).toMatchObject({ schema: 'estudio-progreso/1', asignatura: 'ejmat' });
  await expect(page.locator('details')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Progreso exportado:' })).toBeVisible();
});
test('rejects ordinary text as a backup without changing stored counts', async ({ page }) => {
  await studied(page); await page.goto('./#/ajustes');
  const tables = ['attempts', 'items', 'sessions', 'snapshots'];
  const before = await Promise.all(tables.map(table => idbCount(page, table)));
  await expect(page.getByLabel('Restaurar copia', { exact: true })).toHaveAttribute('accept', '.json,application/json,text/plain,application/octet-stream');
  await expect(page.getByLabel('Elegir archivo')).toHaveAttribute('accept', '.json,application/json,text/plain,application/octet-stream');
  await page.getByLabel('Restaurar copia', { exact: true }).setInputFiles('tests/fixtures/packs/not-json.txt');
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se ha cambiado nada');
  expect(await Promise.all(tables.map(table => idbCount(page, table)))).toEqual(before);
});
