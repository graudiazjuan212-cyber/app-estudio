import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { answerCorrectly, importFixture, visibleItem } from './study';
import { prepare } from './quality';

export async function preparePractice(page: Page) {
  await prepare(page); await importFixture(page, 'mat-ejemplo-c01');
  await page.goto('./#/asignatura/ejmat');
  await page.getByLabel('Duración de la sesión').selectOption('10');
  await page.getByRole('button', { name: 'Estudiar', exact: true }).click();
  while (!page.url().includes('#/resumen/')) {
    await answerCorrectly(page, await visibleItem(page));
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Pregunta', exact: true })
      .or(page.getByRole('heading', { name: 'Resumen de la sesión' }))).toBeVisible();
  }
  await page.getByRole('button', { name: 'Otra sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Practicar más', exact: true })).toBeVisible();
}
export async function nativeRows(page: Page, tables: string[]): Promise<Record<string, unknown[]>> {
  return page.evaluate(tables => new Promise((resolve, reject) => {
    const request = indexedDB.open('estudio');
    request.onerror = () => { reject(request.error ?? new Error('Open failed')); };
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction(tables); const rows: Record<string, unknown[]> = {};
      for (const table of tables) {
        const read = tx.objectStore(table).getAll(); read.onsuccess = () => { rows[table] = read.result as unknown[]; };
      }
      tx.oncomplete = () => { db.close(); resolve(rows); };
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Read failed')); };
    };
  }), tables);
}
