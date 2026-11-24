import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { answerCorrectly, importFixture, idbCount, visibleItem } from './support/study';
import type { Page } from '@playwright/test';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }, testInfo) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => { messages.push(error.message); });
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.addInitScript(() => {
    // A reload keeps the fake clock set with setClock(); the first load starts on day 1.
    Object.assign(window, { __ESTUDIO_NOW__: sessionStorage.getItem('estudio-test-now') ?? '2026-11-24T10:00:00Z' });
  });
  await importFixture(page, testInfo.title === 'a changed question is reloaded before an answer can be saved'
    ? 'fp-v1' : 'mat-ejemplo-c01');
  await page.getByRole('radiogroup', { name: 'Duración de la sesión por defecto' }).getByRole('radio', { name: '5 min', exact: true }).check();
  await page.goto('./');
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });
async function start(page: Page) {
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
}
async function answer(page: Page, correct = true, fixture = 'mat-ejemplo-c01') {
  const item = await visibleItem(page, fixture);
  await answerCorrectly(page, item, correct);
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  return item;
}
async function complete(page: Page) {
  let total = 0, info = 0;
  while (!page.url().includes('#/resumen/')) {
    const item = await answer(page);
    if (item.tipo === 'info') info++; else total++;
    await expect(page.getByRole('article', { name: 'Pregunta', exact: true }).or(page.getByRole('heading', { name: 'Resumen de la sesión' }))).toBeVisible();
  }
  return { total, info };
}
async function setClock(page: Page, iso: string): Promise<void> {
  await page.evaluate(value => {
    sessionStorage.setItem('estudio-test-now', value);
    Object.assign(window, { __ESTUDIO_NOW__: value });
  }, iso);
}
test('complete flow persists every answer and updates home', async ({ page }) => {
  await start(page);
  const { total, info } = await complete(page);
  await expect(page.getByText(`Aciertos: ${String(total)} de ${String(total)}`, { exact: true })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(total + info);
  const count = await idbCount(page, 'attempts'); await page.reload();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión' })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(count);
  await page.getByRole('button', { name: 'Otra sesión' }).click();
  await expect(page.getByText('Hoy no queda nada pendiente en esta asignatura.')).toBeVisible();
  await page.getByRole('link', { name: 'Volver al inicio' }).click();
  await expect(page.getByText('Racha: 1 día', { exact: true })).toBeVisible();
  await expect(page.getByText(/Último día:.*24.*noviembre.*2026/)).toBeVisible();
});
test('reload and Continue resume at the third question', async ({ page }) => {
  await start(page);
  await expect(page.locator('article > :first-child')).toBeFocused();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await answer(page); await answer(page); await page.reload();
  await expect(page.getByText(/^Pregunta 3 de/)).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(2);
  await page.getByRole('link', { name: 'Salir', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar' }).click();
  await expect(page.getByText(/^Pregunta 3 de/)).toBeVisible(); await complete(page);
});
test('double click saves exactly one attempt', async ({ page }) => {
  await page.goto('./#/asignatura/ejmat');
  await page.getByRole('button', { name: 'Mini examen', exact: true }).click();
  let item = await visibleItem(page);
  while (['info', 'flashcard'].includes(item.tipo)) { await answer(page); item = await visibleItem(page); }
  const before = await idbCount(page, 'attempts');
  await answerCorrectly(page, item, true, 'dblclick');
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(before + 1);
});
test('failed add has no feedback and retry saves once', async ({ page }) => {
  await page.addInitScript(() => {
    type AddFn = (this: IDBObjectStore, value: unknown, key?: IDBValidKey) => IDBRequest<IDBValidKey>;
    const original = Reflect.get(IDBObjectStore.prototype, 'add') as AddFn;
    Reflect.set(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const flags = window as Window & { __failNextAdd?: boolean };
      if (this.name === 'attempts' && flags.__failNextAdd) { flags.__failNextAdd = false; throw new Error('Simulated write failure'); }
      return Reflect.apply(original, this, [value, key]);
    });
  });
  await page.reload(); await start(page);
  await page.evaluate(() => { (window as Window & { __failNextAdd?: boolean }).__failNextAdd = true; });
  await answerCorrectly(page, await visibleItem(page));
  await expect(page.getByRole('alert')).toContainText('No se ha podido guardar');
  await expect(page.getByRole('button', { name: 'Siguiente' })).toHaveCount(0);
  expect(await idbCount(page, 'attempts')).toBe(0);
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(1);
});
for (const correct of [4, 3]) test(`exam with ${String(correct)} correct answers`, async ({ page }) => {
  await page.goto('./#/asignatura/ejmat');
  await page.getByRole('button', { name: 'Mini examen', exact: true }).click();
  for (let i = 0; i < 5; i++) await answer(page, i < correct);
  await expect(page.getByText(correct === 4 ? 'Examen superado ✓' : 'Examen no superado ✗', { exact: true })).toBeVisible();
  await expect(page.getByText(`${String(correct)} de 5 (hace falta el 80 %)`, { exact: true })).toBeVisible();
});
test('two days master the first block and later reviews are due', async ({ page }) => {
  await page.goto('./#/ajustes');
  await page.getByRole('radiogroup', { name: 'Duración de la sesión por defecto' }).getByRole('radio', { name: '15 min', exact: true }).check();
  await page.goto('./'); await start(page); await complete(page);
  await setClock(page, '2026-11-25T10:00:00Z');
  await page.goto('./'); await start(page); await complete(page);
  await page.goto('./#/asignatura/ejmat');
  const first = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Componentes y norma' }) });
  await expect(first.getByText(/Dominado/)).toBeVisible();
  const second = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Operaciones', exact: true }) });
  await expect(second.getByText(/Bloqueado/)).toHaveCount(0);
  await setClock(page, '2027-03-01T10:00:00Z');
  await page.goto('./'); await expect(page.getByText(/^[1-9]\d* repasos hoy$/)).toBeVisible();
});
test('archived item is skipped when resuming', async ({ page }) => {
  await start(page); const session = page.url();
  await importFixture(page, 'mat-ejemplo-c01-v2');
  await page.goto(session);
  await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  const archived: string[] = ['mat-i5'];
  while (!page.url().includes('#/resumen/')) {
    expect(archived).not.toContain((await visibleItem(page, 'mat-ejemplo-c01-v2')).id);
    await answer(page, true, 'mat-ejemplo-c01-v2');
    await expect(page.getByRole('article', { name: 'Pregunta', exact: true }).or(page.getByRole('heading', { name: 'Resumen de la sesión' }))).toBeVisible();
  }
});
test('exit preserves answers and early finish confirms; missing ids are explained', async ({ page }) => {
  await start(page); await expect(page.getByRole('button', { name: 'Terminar ahora' })).toBeDisabled();
  await answer(page); await page.getByRole('link', { name: 'Salir', exact: true }).click();
  expect(await idbCount(page, 'attempts')).toBe(1);
  await page.getByRole('link', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Terminar ahora' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('link', { name: 'Salir', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Terminar ahora' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión' })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(1);
  for (const route of ['sesion', 'resumen']) {
    await page.goto(`./#/${route}/nope`);
    await expect(page.getByText('No encuentro esta sesión.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
  }
});
test('production assets exclude the injected clock', () => {
  const files = readdirSync('dist/assets').filter(name => name.endsWith('.js'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) expect(readFileSync(`dist/assets/${file}`, 'utf8')).not.toContain('__ESTUDIO_NOW__');
});

test('two windows answer the same session question only once', async ({ page, context }) => {
  await start(page);
  const item = await visibleItem(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  await answerCorrectly(page, item);
  await answerCorrectly(other, item);
  await expect(other.getByRole('status').filter({ hasText: 'ya se respondió en otra ventana' })).toBeVisible();
  expect(await idbCount(other, 'attempts')).toBe(1);
  expect((await visibleItem(other)).id).not.toBe(item.id);
  await expect(other.getByRole('button', { name: 'Siguiente', exact: true })).toHaveCount(0);
});

test('a changed question is reloaded before an answer can be saved', async ({ page, context }) => {
  await start(page);
  const old = await visibleItem(page, 'fp-v1');
  expect(old.id).toBe('mat-i3');
  const other = await context.newPage();
  await other.goto(page.url());
  await importFixture(other, 'fp-v2');
  await answerCorrectly(page, old);
  await expect(page.getByRole('status').filter({ hasText: 'ha cambiado en otra ventana' })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(0);
  await answerCorrectly(page, await visibleItem(page, 'fp-v2'));
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeVisible();
  expect(await idbCount(page, 'attempts')).toBe(1);
});
