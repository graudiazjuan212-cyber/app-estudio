import { mkdir } from 'node:fs/promises';
import { devices, expect, test } from '@playwright/test';
import { answerCorrectly, fixtureItems, importFixture } from './support/study';
import { accessibilityBackup } from './support/accessibility-data';
import { finish, forceTheme, prepare, restore } from './support/quality';
import { qualityConfig as c } from './support/quality-config';

test.use({ ...devices['Pixel 7'] });
for (const scheme of ['light', 'dark'] as const) test(`visual review ${scheme}`, async ({ page }) => {
  test.skip(process.env.E2E_SCREENSHOTS !== '1', 'Activa E2E_SCREENSHOTS=1 para guardar las capturas.');
  test.setTimeout(c.testMs);
  await mkdir(c.screenshotDirectory, { recursive: true });
  await prepare(page); await forceTheme(page, scheme, true);
  const suffix = scheme === 'light' ? 'claro' : 'oscuro';
  const capture = async (name: string) => {
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({ path: `${c.screenshotDirectory}/${name}-${suffix}.png`, fullPage: true });
  };
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Todavía no tienes asignaturas' })).toBeVisible();
  await capture('01-inicio-vacio');
  await restore(page, accessibilityBackup());
  await forceTheme(page, scheme, true); await page.goto('./');
  await expect(page.getByRole('link', { name: 'Continuar', exact: true })).toBeVisible();
  await capture('02-inicio-datos');
  await page.getByRole('link', { name: 'Ver asignatura', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bloque 5', exact: true })).toBeVisible();
  await capture('03-asignatura');
  await page.goto('./#/ajustes');
  await expect(page.getByRole('heading', { name: 'Importar paquete' })).toBeVisible();
  await expect(page.getByRole('radio', { name: scheme === 'light' ? 'Claro' : 'Oscuro', exact: true })).toBeChecked();
  await capture('04-ajustes');
  const types = ['test', 'ordenar', 'emparejar', 'huecos'];
  for (const [index, type] of types.entries()) {
    await page.goto('./#/demo');
    const item = fixtureItems().find(item => item.tipo === type);
    if (!item) throw new Error(`Falta el tipo ${type}.`);
    await page.getByRole('combobox', { name: 'Pregunta' }).selectOption({ label: `${item.tipo} · ${item.id}` });
    await capture(`${String(index + 5).padStart(2, '0')}-sesion-${type}`);
  }
  for (const correct of [true, false]) {
    await page.goto('./#/demo');
    const item = fixtureItems().find(item => item.id === 'mat-i3');
    if (!item) throw new Error('Falta la pregunta de test.');
    await page.getByRole('combobox', { name: 'Pregunta' }).selectOption({ label: `${item.tipo} · ${item.id}` });
    await answerCorrectly(page, item, correct);
    await expect(page.locator('article').getByRole('status')).toBeVisible();
    await capture(correct ? '09-feedback-correcto' : '10-feedback-incorrecto');
  }
  await importFixture(page, 'mat-ejemplo-c01');
  await page.goto('./#/asignatura/ejmat');
  await page.getByRole('button', { name: 'Mini examen', exact: true }).click();
  await finish(page); await capture('11-resumen');
});
