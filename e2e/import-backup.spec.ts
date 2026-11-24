import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const pack = 'tests/fixtures/packs/';
const consoleErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('pageerror', error => { errors.push(error.message); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./');
});
test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page)).toEqual([]);
  // M4-2 criterion: CSS pixel bounding boxes on Pixel 7, for visible action buttons.
  for (const button of await page.getByRole('button').all()) {
    if (!await button.isVisible()) continue;
    const box = await button.boundingBox();
    if (!box) continue; // the button was removed by a navigation while checking
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    await expect(button).toHaveAccessibleName(/\S/);
  }
});
async function settings(page: Page) { await page.goto('./#/ajustes'); await expect(page.getByRole('heading', { name: 'Importar paquete' })).toBeVisible(); }
async function upload(page: Page, name = 'mat-ejemplo-c01.json') {
  await page.getByLabel('Elegir archivo').setInputFiles(pack + name);
  await expect(page.getByRole('button', { name: 'Importar', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
}
async function imported(page: Page) { await expect(page.getByText(/^Importado:/)).toBeVisible(); }
test('empty home', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Todavía no tienes asignaturas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a Ajustes' })).toBeVisible();
});
test('file import persists and subject is available', async ({ page }) => {
  await settings(page); await upload(page); await imported(page);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Matemáticas (ejemplo)' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progreso de Matemáticas (ejemplo)' })).toHaveAttribute('aria-valuenow', '0');
  const button = page.getByRole('button', { name: 'Estudiar', exact: true });
  const box = await button.boundingBox(); expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44);
  await page.reload(); await expect(button).toBeVisible();
  await page.getByRole('link', { name: 'Ver asignatura' }).click();
  await expect(page.getByRole('progressbar', { name: 'Progreso global' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('button', { name: 'Repasar capítulo' })).toBeVisible();
  await page.goto('./#/asignatura/inexistente');
  await expect(page.getByText('No encuentro esta asignatura.')).toBeVisible();
});
test('paste import', async ({ page }) => {
  await settings(page);
  await page.getByLabel('O pega el JSON aquí').fill(await readFile(pack + 'mat-ejemplo-c01.json', 'utf8'));
  await page.getByRole('button', { name: 'Importar', exact: true }).click(); await imported(page);
});
test('invalid, empty, oversized and non JSON files', async ({ page }) => {
  await settings(page); await upload(page, 'invalid/08-dos-correctas.json');
  await expect(page.getByRole('alert')).toContainText('exactamente 1 opción correcta');
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await expect(page.getByText('Todavía no tienes asignaturas')).toBeVisible();
  await settings(page);
  await page.getByLabel('Elegir archivo').setInputFiles(pack + 'empty.json');
  await expect(page.getByRole('alert')).toContainText('vacío');
  await upload(page, 'not-json.txt'); await expect(page.getByRole('alert')).toContainText('No se ha importado nada');
  await page.getByLabel('Elegir archivo').setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.alloc(5242881) });
  await expect(page.getByRole('alert')).toContainText('5 MB');
});
test('versions and accessible confirmation', async ({ page }) => {
  await settings(page); await upload(page); await imported(page);
  await upload(page); await expect(page.getByText('Este paquete ya estaba importado.')).toBeVisible();
  await upload(page, 'mat-ejemplo-c01-v2.json'); await imported(page);
  await expect(page.getByText(/\d+ archivada/)).toBeVisible();
  await upload(page); const dialog = page.getByRole('dialog', { name: 'Versión anterior' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Importar igualmente' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Importar', exact: true })).toBeFocused();
  await upload(page); await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await upload(page); await dialog.getByRole('button', { name: 'Importar igualmente' }).click(); await imported(page);
});
test('preferences persist', async ({ page }) => {
  await settings(page);
  await page.getByRole('radiogroup', { name: 'Duración de la sesión' }).getByRole('radio', { name: '5 min', exact: true }).check();
  await page.getByRole('radiogroup', { name: 'Objetivo diario' }).getByRole('radio', { name: '15 min', exact: true }).check();
  await page.getByRole('radio', { name: 'Oscuro' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload(); await expect(page.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
  await expect(page.getByRole('radiogroup', { name: 'Duración de la sesión' }).getByRole('radio', { name: '5 min', exact: true })).toBeChecked();
  await expect(page.getByRole('radiogroup', { name: 'Objetivo diario' }).getByRole('radio', { name: '15 min', exact: true })).toBeChecked();
});
test('export restore undo and corrupt backup', async ({ page }) => {
  await settings(page); await upload(page); await imported(page);
  // Desktop Chrome offers the system share sheet; this test covers the download path used without it.
  await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }); });
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  const download = await downloaded; const path = await download.path();
  const json: unknown = JSON.parse(await readFile(path, 'utf8'));
  expect(json).toMatchObject({ schema: 'estudio-backup/1', data: { attempts: [] } });
  await expect(page.getByRole('status').filter({ hasText: 'Copia creada:' })).toBeVisible();
  await upload(page, 'ioe-ejemplo-c01.json'); await imported(page);
  await page.getByLabel('Restaurar copia', { exact: true }).setInputFiles(path);
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copia restaurada' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ver asignatura' })).toHaveCount(1);
  await settings(page); await page.getByRole('button', { name: 'Deshacer última restauración' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copia restaurada' })).toBeVisible();
  await page.getByLabel('Restaurar copia', { exact: true }).setInputFiles(pack + 'not-json.txt');
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se ha cambiado nada');
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ver asignatura' })).toHaveCount(2);
});
test('another window upgrades database', async ({ page, context }) => {
  await expect(page.getByRole('link', { name: 'Ajustes', exact: true })).toBeVisible();
  const other = await context.newPage(); await other.goto('./');
  await other.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('estudio', 999);
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => { reject(new Error('No se pudo abrir la base de datos')); };
  }));
  await expect(page.getByRole('status')).toHaveText('La app se ha actualizado en otra ventana. Recarga.');
  await page.reload(); await expect(page.getByRole('status')).toHaveText('Hay una versión nueva de la app. Recarga para actualizar.');
  await expect(page.getByRole('button', { name: 'Importar', exact: true })).toHaveCount(0);
});
test('study starts once and can be continued from home', async ({ page }) => {
  await settings(page); await upload(page); await imported(page);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  await expect(page).toHaveURL(/#\/sesion\/[a-z0-9-]+$/);
  const sessionUrl = page.url();
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Tienes una sesión sin terminar' })).toBeVisible();
  await page.getByRole('link', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(sessionUrl);
});
test('share cancellation is harmless and storage denial is explained', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.reject(new DOMException('Cancelado', 'AbortError')) });
    Object.defineProperty(navigator.storage, 'persist', { configurable: true, value: () => Promise.resolve(false) });
    Object.defineProperty(navigator.storage, 'persisted', { configurable: true, value: () => Promise.resolve(false) });
  });
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  await expect(page.getByRole('button', { name: 'Exportar copia' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText(/^Copia creada:/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Proteger almacenamiento' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No protegido' })).toBeVisible();
});
