import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { screenConfig } from '../src/config';
import { answerCorrectly, fixtureItems, importFixture, visibleItem } from './support/study';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Object.assign(window, { __ESTUDIO_NOW__: '2026-11-24T10:00:00.000Z' }); });
});

for (const tipo of ['test', 'multi', 'vf', 'ordenar', 'emparejar', 'huecos', 'error']) {
  test(`${tipo}: incomplete checks explain both omissions and never submit`, async ({ page }) => {
    await page.goto('./#/demo');
    const item = fixtureItems().find(i => i.tipo === tipo);
    if (!item) throw new Error('Missing fixed question');
    await page.getByRole('combobox', { name: 'Pregunta' }).selectOption({ label: `${tipo} · ${item.id}` });
    const check = page.getByRole('button', { name: 'Comprobar', exact: true });
    await expect(check).toBeEnabled();
    await check.click();
    await expect(page.getByRole('alert')).toHaveText('Falta tu respuesta: elige o completa la respuesta antes de comprobar. Falta indicar tu seguridad: Duda, Bastante seguro o Seguro.');
    const alertId = await page.getByRole('alert').getAttribute('id');
    expect(await check.getAttribute('aria-describedby')).toBe(alertId);
    await expect(page.getByTestId('submissions')).toHaveText('0');
    await page.getByRole('radio', { name: 'Seguro', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Falta tu respuesta: elige o completa la respuesta antes de comprobar.');
    await check.click();
    await expect(page.getByTestId('submissions')).toHaveText('0');
    await page.getByRole('button', { name: 'Reiniciar pregunta' }).click();
    await check.click();
    await answerCorrectly(page, item, true, 'answer-only');
    await expect(page.getByRole('alert')).toHaveText('Falta indicar tu seguridad: Duda, Bastante seguro o Seguro.');
    await check.click();
    await expect(page.getByTestId('submissions')).toHaveText('0');
    await page.getByRole('radio', { name: 'Seguro', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await check.click();
    await expect(page.getByTestId('submissions')).toHaveText('1');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible();
  });
}

test('direct flashcard failure reveals the reverse and persists otra', async ({ page }) => {
  await importFixture(page, 'mat-ejemplo-c01');
  await page.goto('./');
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'No lo sé', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('button', { name: 'Mostrar respuesta' })).toBeVisible();
  await expect(page.getByText('Un par ordenado de componentes reales.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'No lo sé', exact: true }).click();
  await expect(page.getByText('✗ Incorrecto', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mostrar respuesta' })).toHaveCount(0);
  const reverse = await page.getByRole('article', { name: 'Pregunta', exact: true }).textContent();
  expect(reverse).toContain('Un par ordenado de componentes reales.');
  const saved: unknown = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('estudio');
    request.onerror = () => { reject(new Error('Cannot open database')); };
    request.onsuccess = () => {
      const db = request.result;
      const rows = db.transaction('attempts').objectStore('attempts').getAll();
      rows.onsuccess = () => { db.close(); resolve(rows.result as unknown); };
      rows.onerror = () => { db.close(); reject(new Error('Cannot read attempts')); };
    };
  }));
  expect(saved).toEqual(expect.arrayContaining([expect.objectContaining({ itemId: 'mat-i2', rating: 'otra', correct: false, dontKnow: false })]));
});

test('subject and session share progress after two correct answers', async ({ page }) => {
  await importFixture(page, 'mat-ejemplo-c01');
  await page.goto('./#/asignatura/ejmat');
  await expect(page.getByRole('status').filter({ hasText: 'Hoy: 0 de 4 preguntas · te faltan 4 aciertos' })).toBeVisible();
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  let evaluable = 0;
  while (evaluable < 2) {
    const item = await visibleItem(page);
    await answerCorrectly(page, item);
    if (item.tipo !== 'info') evaluable++;
    if (evaluable < 2) await page.getByRole('button', { name: 'Siguiente' }).click();
  }
  const line = 'Hoy: 2 de 4 preguntas · te faltan 2 aciertos para validar el día (0 de 2 días válidos)';
  await expect(page.getByRole('status').filter({ hasText: line })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('status').filter({ hasText: line })).toBeVisible();
  await page.goto('./#/asignatura/ejmat');
  await expect(page.getByRole('status').filter({ hasText: line })).toBeVisible();
});

async function touchTargets(page: Page) {
  // Native 24px radio/checkbox visuals are intentionally excepted: their full-row labels are the targets.
  const targets = page.locator('button, a[href], select, summary, [role="radio"], input:not([type="hidden"]), label:has(input[type="radio"]), label:has(input[type="checkbox"])');
  for (const target of await targets.all()) {
    if (!await target.isVisible()) continue;
    if (await target.evaluate(el => el.matches('input[type="radio"], input[type="checkbox"]'))) {
      await expect(target.locator('xpath=ancestor::label')).toBeVisible();
      const box = await target.boundingBox();
      expect(box?.width).toBe(24); expect(box?.height).toBe(24);
      continue;
    }
    if (await target.evaluate(el => el.matches('a') && el.closest('p') !== null)) continue;
    const box = await target.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(screenConfig.touchMinPx);
    expect(box?.height).toBeGreaterThanOrEqual(screenConfig.touchMinPx);
  }
}

test('Pixel 7 touch targets cover home, subject, settings, every question, feedback and summary', async ({ page }) => {
  await importFixture(page, 'mat-ejemplo-c01');
  for (const route of ['./', './#/asignatura/ejmat', './#/ajustes']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route.includes('ajustes')) await expect(page.getByRole('radio', { name: 'Sistema' })).toBeVisible();
    await touchTargets(page);
  }
  await page.goto('./#/demo');
  for (const tipo of ['info', 'flashcard', 'test', 'multi', 'vf', 'ordenar', 'emparejar', 'huecos', 'error']) {
    const item = fixtureItems().find(i => i.tipo === tipo);
    if (!item) throw new Error('Missing fixed question');
    await page.getByRole('combobox', { name: 'Pregunta' }).selectOption({ label: `${tipo} · ${item.id}` });
    await touchTargets(page);
    await answerCorrectly(page, item);
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible();
    await touchTargets(page);
  }
  await page.goto('./');
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.getByRole('button', { name: 'Terminar ahora' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión' })).toBeVisible();
  await touchTargets(page);
});

test('landscape home, settings and question have no horizontal overflow and actions remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 915, height: 412 });
  await importFixture(page, 'mat-ejemplo-c01');
  for (const [route, action] of [['./', 'Estudiar'], ['./#/ajustes', 'Importar'], ['./#/demo', 'Entendido']]) {
    if (!route || !action) throw new Error('Missing route');
    await page.goto(route);
    const button = page.getByRole('button', { name: action, exact: true });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
