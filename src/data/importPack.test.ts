import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { attempt, context, dump, invalidNames, packFixture, packText, syntheticPack, testConfig, testDb } from '../../tests/fixtures/data/helpers.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';
import { loadCatalog } from './catalog.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it('imports all rows and the exact original text, with pending block states', async () => {
  const text = packText();
  expect((await importPackText(db, text, context)).status).toBe('imported');
  expect(await db.subjects.count()).toBe(1);
  expect(await db.chapters.count()).toBe(1);
  expect(await db.blocks.count()).toBe(3);
  expect(await db.items.count()).toBe(14);
  expect((await db.items.toArray()).every(i => i.itemGen === 1 && !i.archived)).toBe(true);
  expect(await db.packs.count()).toBe(1);
  expect((await db.packs.toArray())[0]?.json).toBe(text);
  expect((await db.blockState.toArray()).map(b => b.status)).toEqual(['pendiente', 'pendiente', 'pendiente']);
});
it('reimports identical normalized content without changes', async () => {
  await importPackText(db, packText(), context);
  const before = await dump(db);
  expect(await importPackText(db, JSON.stringify(packFixture()), context)).toEqual({ status: 'already-imported' });
  expect(await dump(db)).toEqual(before);
});
it('preserves history and archived state, increments changed types, and moves items', async () => {
  await importPackText(db, packText(), context);
  await recordAttempt(db, attempt(), context);
  await recordAttempt(db, attempt({ attemptId: 'removed', itemId: 'mat-i5', tipo: 'vf' }), context);
  await recordAttempt(db, attempt({ attemptId: 'changed', itemId: 'mat-i2', tipo: 'flashcard', confidence: null, rating: 'bien' }), context);
  const kept = await db.itemState.get('mat-i3');
  const removed = await db.itemState.get('mat-i5');
  const history = await db.attempts.toArray();
  expect((await importPackText(db, packText('mat-ejemplo-c01-v2'), context)).status).toBe('imported');
  expect(await db.itemState.get('mat-i3')).toEqual(kept);
  expect(await db.itemState.get('mat-i5')).toEqual(removed);
  expect(await db.items.get('mat-i5')).toMatchObject({ archived: true });
  expect(await db.items.get('mat-i2')).toMatchObject({ itemGen: 2 });
  expect(await db.itemState.get('mat-i2')).toBeUndefined();
  expect(await db.items.get('mat-i15')).toMatchObject({ itemGen: 1 });
  expect(await db.items.get('mat-i10')).toMatchObject({ blockId: 'mat-b3' });
  expect(await db.attempts.toArray()).toEqual(history);
  expect((await loadCatalog(db)).items.get('mat-i5')?.archived).toBe(true);
});
it('requires confirmation for downgrade and restores reappearing items', async () => {
  await importPackText(db, packText('mat-ejemplo-c01-v2'), context);
  const before = await dump(db);
  expect(await importPackText(db, packText(), context)).toEqual({ status: 'needs-confirmation', reason: 'older-version', current: 2, incoming: 1 });
  expect(await dump(db)).toEqual(before);
  await importPackText(db, packText(), { ...context, confirmOlder: true });
  expect(await db.chapters.get('ejmat-c01')).toMatchObject({ version: 1 });
  expect(await db.items.get('mat-i15')).toMatchObject({ archived: true });
  await importPackText(db, packText('mat-ejemplo-c01-v2'), context);
  expect(await db.items.get('mat-i15')).toMatchObject({ archived: false, itemGen: 1 });
});
it('rejects changed content at the same version', async () => {
  await importPackText(db, packText(), context);
  const before = await dump(db);
  const pack = packFixture();
  pack.capitulo.titulo = 'Otro título';
  expect((await importPackText(db, JSON.stringify(pack), context)).status).toBe('rejected');
  expect(await dump(db)).toEqual(before);
});
it.each(invalidNames())('rejects invalid fixture %s without writes', async name => {
  await importPackText(db, packText(), context);
  const before = await dump(db);
  expect((await importPackText(db, packText(`invalid/${name.replace(/\.json$/, '')}`), context)).status).toBe('rejected');
  expect(await dump(db)).toEqual(before);
});
it.each(['item', 'block', 'chapter'])('rejects a cross-subject %s collision', async kind => {
  await importPackText(db, packText(), context);
  const before = await dump(db);
  const pack = packFixture();
  pack.asignatura.id = 'other';
  if (kind !== 'chapter') pack.capitulo.id = 'other-c01';
  if (kind === 'item') pack.bloques = pack.bloques.map(b => ({ ...b, id: `other-${b.id}`, requiere: b.requiere.map(id => `other-${id}`) }));
  const result = await importPackText(db, JSON.stringify(pack), context);
  expect(result.status).toBe('rejected');
  if (result.status === 'rejected') expect(result.errors[0]?.message).toContain('ejmat');
  expect(await dump(db)).toEqual(before);
});
it.each(['items', 'blocks', 'blockState'] as const)('aborts the entire import on %s failure', async table => {
  await importPackText(db, packText(), context);
  const before = await dump(db);
  vi.spyOn(db[table], 'bulkPut').mockRejectedValueOnce(new Error('Cuota'));
  await expect(importPackText(db, packText('mat-ejemplo-c01-v2'), context)).rejects.toThrow('Cuota');
  expect(await dump(db)).toEqual(before);
});
it('imports 2000 items within the performance budget', async () => {
  const text = syntheticPack();
  const start = performance.now();
  expect((await importPackText(db, text, context)).status).toBe('imported');
  const elapsed = performance.now() - start;
  console.info(`Importación 2000 ítems: ${String(elapsed)} ms`);
  expect(elapsed).toBeLessThan(testConfig.performanceMaxMs);
  expect(await db.items.count()).toBe(2000);
});
it('loads a consistent subject-filtered catalog and keeps archived blocks', async () => {
  await importPackText(db, packText(), context);
  expect((await loadCatalog(db, 'missing')).items.size).toBe(0);
  const pack = packFixture();
  pack.version = 2;
  pack.bloques = pack.bloques.slice(0, 1);
  await importPackText(db, JSON.stringify(pack), context);
  expect(await db.blocks.get('mat-b3')).toMatchObject({ archived: true });
  expect((await loadCatalog(db, 'ejmat')).blocks.size).toBe(3);
});
