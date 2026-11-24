import { performance } from 'node:perf_hooks';
import { expect as baseExpect, test } from '@playwright/test';
import { generateBackup } from './support/big-data';
import { prepare, restore } from './support/quality';
import { qualityConfig as c } from './support/quality-config';

// Waits can legitimately exceed the 5 s default on large data: each step is judged against its own budget below.
const expect = baseExpect.configure({ timeout: 40_000 });

async function measure(name: keyof typeof c.budgets, action: () => Promise<void>) {
  const start = performance.now();
  await action();
  const elapsed = performance.now() - start;
  console.info(`[rendimiento] ${name}: ${elapsed.toFixed(1)} ms; objetivo PC ${String(c.budgets[name])} ms; móvil estimado ${(elapsed * 3).toFixed(1)}–${(elapsed * 5).toFixed(1)} ms`);
  expect(elapsed, name).toBeLessThan(c.budgets[name] * c.tolerance);
}
test('large backup: restore, navigation, session, answer and exports', async ({ page }) => {
  test.setTimeout(c.testMs);
  await prepare(page);
  const backup = generateBackup();
  expect(backup.data.items).toHaveLength(6000);
  expect(backup.data.attempts.filter(a => a.subjectId === 'large-s0')).toHaveLength(7000);
  await measure('restore', async () => { await restore(page, backup); });
  await measure('home', async () => {
    await page.goto('./');
    await expect(page.getByRole('link', { name: 'Ver asignatura', exact: true })).toHaveCount(c.large.subjects);
  });
  await measure('subject', async () => {
    await page.getByRole('link', { name: 'Ver asignatura', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Bloque 10', exact: true })).toBeVisible();
  });
  await measure('study', async () => {
    await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Pregunta', exact: true })).toBeVisible();
  });
  // Saving an unknown answer exercises the same full-history save path, independently of selected type.
  const card = page.getByRole('article', { name: 'Pregunta', exact: true });
  await measure('answer', async () => {
    const seen = card.getByRole('button', { name: 'Entendido', exact: true });
    const reveal = card.getByRole('button', { name: 'Mostrar respuesta', exact: true });
    if (await seen.isVisible()) await seen.click();
    else if (await reveal.isVisible()) {
      await reveal.click(); await card.getByRole('button', { name: 'Bien', exact: true }).click();
    } else await card.getByRole('button', { name: 'No lo sé', exact: true }).click();
    await expect(card.getByRole('status')).toBeVisible();
  });
  await page.goto('./#/ajustes');
  await measure('backup', async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar copia', exact: true }).click();
    expect(await (await download).failure()).toBeNull();
  });
  await page.goto('./#/asignatura/large-s0');
  await measure('progress', async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar progreso para Claude', exact: true }).click();
    expect(await (await download).failure()).toBeNull();
  });
});
test('import 2000 items through settings', async ({ page }) => {
  test.setTimeout(c.testMs);
  await prepare(page); await page.goto('./#/ajustes');
  const pack = generateBackup().data.packs[0];
  if (!pack) throw new Error('Falta el paquete.');
  await measure('pack', async () => {
    await page.getByLabel('Elegir archivo').setInputFiles({ name: 'large-pack.json',
      mimeType: 'application/json', buffer: Buffer.from(pack.json) });
    await page.getByRole('button', { name: 'Importar', exact: true }).click();
    await expect(page.getByText(/^Importado:/)).toBeVisible({ timeout: c.testMs });
  });
});
