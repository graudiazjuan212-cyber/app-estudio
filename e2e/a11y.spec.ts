import { expect, test } from '@playwright/test';
import { audit, visibleFocus } from './support/accessibility';
import { accessibilityBackup } from './support/accessibility-data';
import { finish, forceTheme, prepare, restore } from './support/quality';
import { qualityConfig as c } from './support/quality-config';
import { answerCorrectly, fixtureItems, importFixture, visibleItem } from './support/study';

for (const scheme of ['light', 'dark'] as const) for (const forced of [false, true]) {
  test.describe(`${scheme}, ${forced ? 'forced' : 'system'}`, () => {
    test.beforeEach(async ({ page }) => {
      await prepare(page); await forceTheme(page, scheme, forced);
    });
    test('empty and populated home; all block states', async ({ page }) => {
      test.setTimeout(c.testMs);
      await page.goto('./');
      await expect(page.getByRole('heading', { name: 'Todavía no tienes asignaturas' })).toBeVisible();
      await audit(page);
      const backup = accessibilityBackup();
      // Restoration replaces preferences too: preserve the theme under test.
      backup.data.settings.push({ key: 'theme', value: forced ? scheme : 'system' });
      await restore(page, backup);
      await forceTheme(page, scheme, forced); await page.goto('./');
      await expect(page.getByText('Racha: 5 días', { exact: true })).toBeVisible();
      await expect(page.getByText('Hace tiempo que no haces una copia de seguridad.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Continuar', exact: true })).toBeVisible();
      await audit(page);
      await page.getByRole('link', { name: 'Ver asignatura', exact: true }).click();
      for (const label of [/Graduado/, /Dominado/, /En curso/, /Pendiente/])
        await expect(page.locator('article').getByText(label).first()).toBeVisible();
      await expect(page.getByText(/Bloqueado: primero domina/)).toBeVisible();
      await audit(page);
    });
    test('settings: successful, rejected and older-version import', async ({ page }) => {
      test.setTimeout(c.testMs);
      await importFixture(page, 'mat-ejemplo-c01'); await audit(page);
      await visibleFocus(page, page.getByRole('radio', {
        name: forced ? scheme === 'light' ? 'Claro' : 'Oscuro' : 'Sistema', exact: true,
      }));
      await page.getByLabel('Elegir archivo').setInputFiles('tests/fixtures/packs/invalid/08-dos-correctas.json');
      await page.getByRole('button', { name: 'Importar', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible(); await audit(page);
      await importFixture(page, 'mat-ejemplo-c01-v2');
      await page.getByLabel('Elegir archivo').setInputFiles('tests/fixtures/packs/mat-ejemplo-c01.json');
      await page.getByRole('button', { name: 'Importar', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Versión anterior' })).toBeVisible();
      await audit(page);
    });
    for (const item of [...fixtureItems('ioe-ejemplo-c01'), ...fixtureItems('codigo-ejemplo-c01')].filter((item, index, all) =>
      all.findIndex(candidate => candidate.tipo === item.tipo) === index)) {
      for (const correct of item.tipo === 'info' ? [true] : [true, false]) {
        test(`${item.tipo}: before and after ${correct ? 'correct' : 'incorrect'} feedback`, async ({ page }) => {
          await page.goto('./#/demo');
          await page.getByRole('combobox', { name: 'Pregunta' }).selectOption({ label: `${item.tipo} · ${item.id}` });
          await audit(page);
          await answerCorrectly(page, item, correct);
          await expect(page.locator('article').getByRole('status')).toContainText(
            ['info', 'flashcard'].includes(item.tipo) ? 'Anotado' : correct ? 'Correcto' : 'Incorrecto');
          await audit(page);
        });
      }
    }
    for (const kind of ['study', 'exam']) test(`real ${kind} session and summary`, async ({ page }) => {
      test.setTimeout(c.testMs);
      await importFixture(page, 'mat-ejemplo-c01');
      await page.getByRole('radiogroup', { name: 'Duración de la sesión' }).getByRole('radio', { name: '5 min', exact: true }).check();
      await page.goto('./#/asignatura/ejmat');
      await page.getByRole('button', { name: kind === 'study' ? 'Estudiar' : 'Mini examen', exact: true }).click();
      await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
      await expect(page.locator('article[aria-label="Pregunta"] > :first-child')).toBeFocused();
      await audit(page);
      await answerCorrectly(page, await visibleItem(page), false);
      await expect(page.locator('article').getByRole('status')).toBeVisible(); await audit(page);
      await visibleFocus(page, page.getByRole('button', { name: 'Siguiente', exact: true }));
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
      await answerCorrectly(page, await visibleItem(page));
      await expect(page.locator('article').getByRole('status')).toBeVisible(); await audit(page);
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
      await finish(page); await audit(page);
    });
    test('keyboard: prompt, options, confidence, check; visible radio and button focus', async ({ page }) => {
      const backup = accessibilityBackup();
      const item = backup.data.items.find(i => i.tipo === 'test');
      const session = backup.data.sessions.find(s => s.id === 'quality-open');
      if (!item || !session) throw new Error('Falta la sesión de teclado.');
      session.itemIds = [item.id];
      await restore(page, backup); await forceTheme(page, scheme, forced);
      await page.goto('./#/sesion/quality-open');
      const card = page.getByRole('article', { name: 'Pregunta', exact: true });
      const options = card.getByRole('radiogroup').first().getByRole('radio');
      await expect(page.locator('article > :first-child')).toBeFocused();
      await page.keyboard.press('Tab'); await expect(options.first()).toBeFocused();
      await visibleFocus(page, options.first());
      await options.first().focus();
      for (let index = 0; index < await options.count(); index++) {
        await expect(options.nth(index)).toBeFocused();
        if (index === 0) await page.keyboard.press('Space');
        await page.keyboard.press('Tab');
      }
      for (const name of ['Duda', 'Bastante seguro', 'Seguro']) {
        await expect(card.getByRole('radio', { name, exact: true })).toBeFocused();
        await page.keyboard.press('Space'); await page.keyboard.press('Tab');
      }
      const check = card.getByRole('button', { name: 'Comprobar', exact: true });
      await expect(check).toBeFocused(); await visibleFocus(page, check);
    });
  });
}
