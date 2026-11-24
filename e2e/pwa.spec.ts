// Depuración: E2E_REBUILD=1 fuerza A/B; playwright test --project=pwa --headed;
// PWDEBUG=1 permite inspeccionar SW/cachés. PowerShell: $env:E2E_REBUILD='1'.
import { expect } from '@playwright/test';
import { test, answer, offerUpdate, ready, start, updateNotice, version } from './support/pwa';
import { pwaTestConfig as config } from './support/config';
import { idbCount, importFixture } from './support/study';

test.setTimeout(config.testMs);

// Juan puede cerrar la app y seguir estudiando sin cobertura, incluidas las fórmulas y sus respuestas.
test('cold offline launch preserves three attempts and renders cached math', async ({ page, context, server }) => {
  await page.goto('./'); await ready(page);
  await importFixture(page, config.fixture);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await start(page); await answer(page); await answer(page);
  expect(await idbCount(page, 'attempts')).toBe(2);
  for (const open of context.pages()) await open.close();
  await context.setOffline(true); await server.close();
  const offline = await context.newPage(); await offline.goto(server.url);
  await expect(offline.getByText('Sin conexión: puedes seguir estudiando; todo se guarda en tu móvil.', { exact: true })).toBeVisible();
  await expect(offline.getByRole('heading', { name: 'Matemáticas (ejemplo)', exact: true })).toBeVisible();
  // Estudiar starts a new session; previous answers remain saved and unseen math comes first.
  await start(offline);
  await expect(offline.getByRole('article', { name: 'Pregunta', exact: true }).locator('.katex').first()).toBeVisible();
  await expect.poll(() => offline.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('1em KaTeX_Main');
  })).toBe(true);
  await answer(offline);
  expect(await idbCount(offline, 'attempts')).toBe(3);
  await offline.close();
  const reopened = await context.newPage(); await reopened.goto(server.url);
  await expect(reopened.getByRole('link', { name: 'Continuar', exact: true })).toBeVisible();
  expect(await idbCount(reopened, 'attempts')).toBe(3);
});

// Juan decide cuándo actualizar; la sesión y sus datos sobreviven y B también arranca sin red.
test('real A to B update waits for consent and preserves the open session offline', async ({ page, context, server, variants }) => {
  await page.goto('./'); await ready(page); await importFixture(page, config.fixture);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await version(page, 'A');
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await page.evaluate(() => { Object.assign(window, { __updateMarker: 'still A' }); });
  await expect(updateNotice(page)).toHaveCount(0);
  await offerUpdate(page, server, variants.B);
  await page.waitForTimeout(config.noReloadMs); // The one intentional time delay: no automatic reload for 2 s.
  expect(await page.evaluate(() => Reflect.get(window, '__updateMarker') as unknown)).toBe('still A');
  await start(page); await expect(updateNotice(page)).toHaveCount(0); await answer(page);
  await page.getByRole('link', { name: 'Salir', exact: true }).click();
  await expect(updateNotice(page)).toBeVisible();
  await Promise.all([
    page.waitForEvent('load'), updateNotice(page).getByRole('button', { name: 'Actualizar', exact: true }).click(),
  ]);
  await ready(page); await expect(updateNotice(page)).toHaveCount(0);
  await version(page, 'B'); expect(await idbCount(page, 'attempts')).toBe(1);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Continuar', exact: true })).toBeVisible();
  for (const open of context.pages()) await open.close();
  await context.setOffline(true); await server.close();
  const offline = await context.newPage(); await offline.goto(server.url);
  await version(offline, 'B');
  await offline.getByRole('link', { name: 'Volver', exact: true }).click();
  await offline.getByRole('link', { name: 'Continuar', exact: true }).click();
  await answer(offline); expect(await idbCount(offline, 'attempts')).toBe(2);
});

// Juan puede aplazar la actualización; al abrir de nuevo se le vuelve a ofrecer.
test('Later dismisses only until reload and keeps the worker waiting', async ({ page, server, variants }) => {
  await page.goto('./'); await ready(page); await offerUpdate(page, server, variants.B);
  await updateNotice(page).getByRole('button', { name: 'Más tarde', exact: true }).click();
  await expect(updateNotice(page)).toHaveCount(0);
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
  await page.reload(); await expect(updateNotice(page)).toBeVisible({ timeout: config.waitMs });
  await version(page, 'A');
});

// Actualizar en otra pestaña no invalida la sesión ni bloquea la base de datos de Juan.
test('another tab remains functional after an update with the same database schema', async ({ page, context, server, variants }) => {
  await page.goto('./'); await ready(page); await importFixture(page, config.fixture);
  await page.getByRole('link', { name: 'Volver', exact: true }).click();
  const other = await context.newPage(); await other.goto(server.url); await ready(other);
  await start(other); await answer(other);
  const session = other.url();
  await offerUpdate(page, server, variants.B);
  await Promise.all([page.waitForEvent('load'), updateNotice(page).getByRole('button', { name: 'Actualizar', exact: true }).click()]);
  await version(page, 'B');
  // Workbox may reload controlled clients; in either case the session route must be preserved.
  await expect(other).toHaveURL(session);
  await expect(other.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  await expect(other.getByText('La app se ha actualizado en otra ventana. Recarga.', { exact: true })).toHaveCount(0);
  await answer(other); expect(await idbCount(other, 'attempts')).toBe(2);
  expect(await idbCount(page, 'attempts')).toBe(2);
});

// Juan recibe el resultado de protección una sola vez y encuentra instrucciones Android en Ajustes.
test('first import reports persistence once and settings explain Android installation', async ({ page, server }) => {
  await page.goto(server.url); await ready(page); await importFixture(page, config.fixture);
  const notice = page.getByRole('status').filter({ hasText: /Almacenamiento protegido|Tu navegador no ha protegido el almacenamiento/ });
  await expect(notice).toHaveCount(1); await expect(notice).toBeVisible();
  await expect(page.getByText('Android (Chrome): abre el menú ⋮ → «Instalar aplicación» (o «Añadir a pantalla de inicio»). Ábrela desde el icono.', { exact: true })).toBeVisible();
  // A fresh document removes the previous notice; a genuinely newer pack triggers another successful import.
  await importFixture(page, 'mat-ejemplo-c01-v2');
  await expect(notice).toHaveCount(0);
  expect(await idbCount(page, 'items')).toBeGreaterThan(0);
});
