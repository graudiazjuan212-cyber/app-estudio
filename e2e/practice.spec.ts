import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { preparePractice, nativeRows } from './support/practice';
import { answerCorrectly, visibleItem, idbCount } from './support/study';
import { audit } from './support/accessibility';
import { prepare, restore } from './support/quality';
import { backupSchema } from '../src/data/backupSchema';
import { practiceWeight, consecutivePracticeFailures } from '../src/domain/study/practice';
import type { PracticeAttempt } from '../src/domain/study/practice';

test('free practice keeps progress intact and its note visible in feedback and summary', async ({ page }) => {
  await preparePractice(page); await audit(page);
  const tables = ['attempts', 'itemState', 'blockState'];
  const before = await nativeRows(page, tables);
  await page.getByRole('button', { name: 'Practicar más', exact: true }).click();
  await expect(page.getByRole('note')).toHaveText('Práctica libre: no cambia tu progreso'); await audit(page);
  await answerCorrectly(page, await visibleItem(page));
  await expect(page.getByRole('note')).toBeVisible();
  await expect(page.getByText(/^Hoy:.*preguntas/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await answerCorrectly(page, await visibleItem(page), false); await audit(page);
  await page.getByRole('button', { name: 'Terminar ahora', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión' })).toBeVisible();
  await expect(page.getByRole('note')).toHaveText('Práctica libre: no cambia tu progreso');
  await expect(page.getByText(/bloque dominado|Puntos ciegos nuevos|% →/i)).toHaveCount(0);
  expect(await idbCount(page, 'practiceAttempts')).toBe(2);
  expect(await nativeRows(page, tables)).toEqual(before); await audit(page);
});
test('a recorded failure increases only the following practice weight', async ({ page }) => {
  await preparePractice(page);
  await page.getByRole('button', { name: 'Practicar más', exact: true }).click();
  await answerCorrectly(page, await visibleItem(page), false);
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeVisible();
  const rows = (await nativeRows(page, ['practiceAttempts'])).practiceAttempts as PracticeAttempt[];
  expect(rows).toHaveLength(1); expect(rows[0]?.correct).toBe(false);
  expect(practiceWeight({ practiceFailures: consecutivePracticeFailures(rows) })).toBe(4);
  expect(practiceWeight({})).toBe(1);
});
test('a practice-only day contributes minutes, goal and streak on home', async ({ page }) => {
  await prepare(page);
  const backup = backupSchema.parse(JSON.parse(readFileSync('tests/fixtures/backups/v1-real.json', 'utf8')) as unknown);
  const attempt = backup.data.attempts.find(a => a.tipo === 'test');
  if (!attempt) throw new Error('Missing fixed attempt');
  const { schedulerVersion, ...practice } = attempt; void schedulerVersion;
  const normal = backup.data.sessions.find(session => session.id === attempt.sessionId);
  if (!normal) throw new Error('Missing fixed session');
  backup.data.attempts = [];
  backup.data.sessions = [{ ...normal, id: 'free-fixed', kind: 'practice', endedAt: '2026-11-24T10:10:00.000Z' }];
  backup.data.practiceAttempts = [{ ...practice, sessionId: 'free-fixed', studyDay: '2026-11-24', at: '2026-11-24T10:00:00.000Z', durationMs: 600000 }];
  await restore(page, backup); await page.goto('./');
  await expect(page.getByText('Racha: 1 día', { exact: true })).toBeVisible();
  await expect(page.getByText(/Hoy: 10 de/)).toBeVisible();
  await expect(page.getByText('✓ Objetivo cumplido', { exact: true })).toBeVisible();
});
test('opens a native published v1 database with its recovery copy', async ({ page }) => {
  await prepare(page); await page.goto('./');
  const backup = backupSchema.parse(JSON.parse(readFileSync('tests/fixtures/backups/v1-real.json', 'utf8')) as unknown);
  // The app creates its (v2) database asynchronously: wait for it, then the seeding below drops it and writes a real v1 one.
  await page.waitForFunction(async () => (await indexedDB.databases()).some(db => db.name === 'estudio'));
  await page.evaluate(async text => {
    const { data } = JSON.parse(text) as { data: Record<string, Record<string, unknown>[]> };
    const stores = {
      subjects: 'id', chapters: 'id, subjectId', blocks: 'id, chapterId, subjectId',
      items: 'id, blockId, chapterId, subjectId, archived, metadataKey', packs: 'key, [subjectId+chapterId]',
      attempts: 'attemptId, itemId, subjectId, studyDay, sessionId, at, [subjectId+studyDay]',
      itemState: 'itemId', blockState: 'blockId, subjectId', sessions: 'id, subjectId, startedAt',
      settings: 'key', snapshots: '++id', meta: 'key',
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('estudio');
      request.onsuccess = () => { resolve(); }; request.onerror = () => { reject(request.error ?? new Error('Delete failed')); };
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('estudio', 10);
      request.onupgradeneeded = () => {
        for (const [name, schema] of Object.entries(stores)) {
          const [primary, ...indexes] = schema.split(',').map(s => s.trim());
          if (!primary) throw new Error('Missing primary key');
          const store = request.result.createObjectStore(name, { keyPath: primary.replace('++', ''), autoIncrement: primary.startsWith('++') });
          for (const index of indexes) store.createIndex(index, index.startsWith('[') ? index.slice(1, -1).split('+') : index);
        }
      };
      request.onerror = () => { reject(request.error ?? new Error('Open failed')); };
      request.onsuccess = () => {
        const db = request.result; const tx = db.transaction(Object.keys(stores), 'readwrite');
        for (const [name, rows] of Object.entries(data)) for (const row of rows) {
          const value = name === 'items' && 'id' in row && 'subjectId' in row && 'order' in row && 'blockId' in row && 'tipo' in row && 'itemGen' in row && 'archived' in row && 'relaciona' in row
            ? { ...row, metadataKey: [row.subjectId, row.order, row.id, row.blockId, row.tipo, row.itemGen, Number(row.archived), Number(row.relaciona)] } : row;
          tx.objectStore(name).add(value);
        }
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Write failed')); };
      };
    });
  }, JSON.stringify(backup));
  await page.reload();
  await expect(page.getByRole('link', { name: 'Ver asignatura', exact: true })).toHaveCount(3);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(db => db.name))).toContain('estudio-premigration-v1');
  expect(await idbCount(page, 'attempts')).toBe(38); expect(await idbCount(page, 'practiceAttempts')).toBe(0);
});
