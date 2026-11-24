import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { progressSchema } from '../src/domain/progress/schema';
import { answerCorrectly, importFixture, visibleItem } from './support/study';

test.use({ timezoneId: 'Europe/Madrid' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => { messages.push(error.message); });
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.addInitScript(() => {
    Object.assign(window, { __ESTUDIO_NOW__: '2026-12-02T20:10:00Z' });
    if (!Reflect.has(window, '__progressShareTest')) {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    }
  });
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });
async function storedData(page: Page) {
  return page.evaluate(() => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('estudio');
    request.onerror = () => { reject(new Error('Cannot inspect database')); };
    request.onsuccess = () => {
      const db = request.result;
      const names = Array.from(db.objectStoreNames);
      const transaction = db.transaction(names, 'readonly');
      const rows: Record<string, unknown> = {};
      for (const name of names) {
        const read = transaction.objectStore(name).getAll();
        read.onsuccess = () => { rows[name] = read.result; };
      }
      transaction.oncomplete = () => { db.close(); resolve(JSON.stringify(rows)); };
      transaction.onerror = () => { db.close(); reject(new Error('Cannot inspect rows')); };
    };
  }));
}
async function downloadProgress(page: Page) {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar progreso para Claude', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^progreso_ejmat_\d{4}-\d{2}-\d{2}\.json$/);
  const text = await readFile(await download.path(), 'utf8');
  const json: unknown = JSON.parse(text);
  const progress = progressSchema.parse(json);
  await expect(page.getByRole('status').filter({ hasText: `Progreso exportado: ${download.suggestedFilename()}.` })).toBeVisible();
  return { progress, text };
}
test('exports only the studied subject with a completed short session', async ({ page }) => {
  await importFixture(page, 'mat-ejemplo-c01');
  await importFixture(page, 'ioe-ejemplo-c01');
  await page.getByRole('radiogroup', { name: 'Duración de la sesión por defecto' }).getByRole('radio', { name: '5 min', exact: true }).check();
  await page.goto('./#/asignatura/ejmat');
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  while (!page.url().includes('#/resumen/')) {
    await answerCorrectly(page, await visibleItem(page));
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Pregunta', exact: true }).or(page.getByRole('heading', { name: 'Resumen de la sesión' }))).toBeVisible();
  }
  await page.goto('./#/asignatura/ejmat');
  await expect(page.getByRole('button', { name: 'Exportar progreso para Claude' })).toBeVisible();
  const before = await storedData(page);
  const { progress, text } = await downloadProgress(page);
  expect(await storedData(page)).toBe(before);
  expect(progress.asignatura).toBe('ejmat');
  expect(progress.sesiones).toHaveLength(1);
  expect(progress.capitulos[0]?.bloques).toHaveLength(3);
  expect(text).not.toContain('ejioe'); expect(text).not.toContain('ioe-');
  await page.goto('./');
  await expect(page.getByText('Hace tiempo que no haces una copia de seguridad.')).toBeVisible();
});
test('settings exports a subject without attempts in Madrid winter time', async ({ page }) => {
  await page.goto('./#/ajustes');
  await expect(page.getByText('Importa una asignatura para exportar su progreso.', { exact: false })).toBeVisible();
  await importFixture(page, 'mat-ejemplo-c01');
  const { progress } = await downloadProgress(page);
  expect(progress.sesiones).toEqual([]);
  expect(progress.exportado).toBe('2026-12-02T21:10:00+01:00');
  await expect(page.getByText(/Esto no sustituye a la copia de seguridad/)).toBeVisible();
});
for (const outcome of ['shared', 'cancelled', 'error'] as const) {
  test(`share ${outcome} holds the button disabled and never downloads`, async ({ page }) => {
    await importFixture(page, 'mat-ejemplo-c01');
    let downloads = 0;
    page.on('download', () => { downloads++; });
    await page.addInitScript(() => {
      Object.assign(window, { __progressShareTest: true });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: (data: ShareData) => new Promise<void>((resolve, reject) => {
        Object.assign(window, { __shared: data, __finishShare: (result: string) => {
          if (result === 'shared') resolve();
          else reject(new DOMException('No compartido', result === 'cancelled' ? 'AbortError' : 'NotAllowedError'));
        } });
      }) });
    });
    // The init script only runs on a new document, and the hash navigation below keeps the current one.
    await page.reload();
    await page.goto('./#/asignatura/ejmat');
    const button = page.getByRole('button', { name: 'Exportar progreso para Claude', exact: true });
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44);
    await button.click(); await expect(button).toBeDisabled();
    await expect.poll(() => page.evaluate(() => Reflect.has(window, '__shared'))).toBe(true);
    const shared = await page.evaluate(() => Reflect.get(window, '__shared') as ShareData);
    expect(shared.title).toMatch(/^progreso_ejmat_\d{4}-\d{2}-\d{2}\.json$/);
    await page.evaluate(result => {
      const finish = Reflect.get(window, '__finishShare') as (result: string) => void;
      finish(result);
    }, outcome);
    await expect(button).toBeEnabled();
    if (outcome === 'error') await expect(page.getByRole('alert')).toContainText('Tus datos se conservan');
    else {
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByRole('status').filter({ hasText: outcome === 'shared' ? 'Progreso exportado:' : 'Exportación cancelada.' })).toBeVisible();
    }
    expect(downloads).toBe(0);
  });
}
for (const invalid of ['missing-subject', 'invalid-clock'] as const) {
  test(`explains ${invalid} without downloading or claiming success`, async ({ page }) => {
    await importFixture(page, 'mat-ejemplo-c01');
    await page.goto('./#/asignatura/ejmat');
    const button = page.getByRole('button', { name: 'Exportar progreso para Claude', exact: true });
    await expect(button).toBeVisible();
    let downloads = 0;
    page.on('download', () => { downloads++; });
    if (invalid === 'invalid-clock') {
      await page.evaluate(() => { Object.assign(window, { __ESTUDIO_NOW__: 'invalid' }); });
    } else {
      await page.evaluate(() => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('estudio');
        request.onerror = () => { reject(new Error('Cannot open database')); };
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('subjects', 'readwrite');
          transaction.objectStore('subjects').delete('ejmat');
          transaction.oncomplete = () => { db.close(); resolve(); };
          transaction.onerror = () => { db.close(); reject(new Error('Cannot prepare missing subject')); };
        };
      }));
    }
    await button.click();
    await expect(page.getByRole('alert')).toContainText(invalid === 'missing-subject' ? 'No encuentro esta asignatura.' : 'No se ha podido exportar el progreso.');
    await expect(button).toBeEnabled();
    await expect(page.getByRole('status').filter({ hasText: 'Progreso exportado:' })).toHaveCount(0);
    expect(downloads).toBe(0);
  });
}
