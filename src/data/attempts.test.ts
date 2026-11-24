import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { attempt, context, dump, goldenDue, packText, sequence, testDb } from '../../tests/fixtures/data/helpers.ts';
import { rebuildFromAttempts, studyDay } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';
import { rebuildCache } from './cache.ts';
import { loadCatalog } from './catalog.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it('saves a valid attempt with the golden due and updates block state', async () => {
  expect(await recordAttempt(db, attempt(), context)).toMatchObject({ status: 'saved', blockState: { status: 'en_curso' } });
  expect(await db.attempts.count()).toBe(1);
  expect((await db.itemState.get('mat-i3'))?.card.due).toBe(goldenDue());
});
it('is idempotent sequentially and in parallel', async () => {
  await recordAttempt(db, attempt(), context);
  const before = await dump(db);
  expect((await recordAttempt(db, attempt(), context)).status).toBe('duplicate');
  expect(await dump(db)).toEqual(before);
  const results = await Promise.all([recordAttempt(db, attempt({ attemptId: 'b' }), context), recordAttempt(db, attempt({ attemptId: 'b' }), context)]);
  expect(results.map(r => r.status).sort()).toEqual(['duplicate', 'saved']);
  expect(await db.attempts.count()).toBe(2);
});
it.each([
  { at: '2026-11-24T10:00:00' }, { itemId: 'missing' }, { itemGen: 2 },
  { subjectId: 'other' }, { confidence: null },
])('rejects invalid attempt %s atomically', async patch => {
  const before = await dump(db);
  await expect(recordAttempt(db, attempt(patch), context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('rolls back attempts when item state cannot be written', async () => {
  const before = await dump(db);
  vi.spyOn(db.itemState, 'put').mockRejectedValueOnce(new Error('Cuota'));
  await expect(recordAttempt(db, attempt(), context)).rejects.toThrow('Cuota');
  expect(await dump(db)).toEqual(before);
});
it('rebuilds an item when attempts arrive out of order', async () => {
  const later = attempt({ attemptId: 'later', at: '2026-11-27T10:00:00.000Z', studyDay: '2026-11-27' });
  await recordAttempt(db, later, context);
  await recordAttempt(db, attempt(), context);
  const derived = rebuildFromAttempts([attempt(), later], await loadCatalog(db), studyDay(context.now, context.tz));
  expect(await db.itemState.get('mat-i3')).toEqual(derived.items.get('mat-i3'));
});
it('matches rebuilding after twelve attempts across four days and recovers erased caches', async () => {
  const ctx = { ...context, now: '2026-11-27T10:00:00.000Z' };
  for (const row of sequence()) await recordAttempt(db, row, ctx);
  const items = await db.itemState.toArray();
  const blocks = await db.blockState.toArray();
  expect(await rebuildCache(db, ctx)).toEqual({ items: 3, blocks: 3, skipped: 0 });
  expect(await db.itemState.toArray()).toEqual(items);
  expect(await db.blockState.toArray()).toEqual(blocks);
  await db.itemState.clear();
  await db.blockState.clear();
  await rebuildCache(db, ctx);
  expect(await db.itemState.toArray()).toEqual(items);
  expect(await db.blockState.toArray()).toEqual(blocks);
  expect(await db.attempts.count()).toBe(12);
});
it('counts skipped attempts while preserving all history', async () => {
  await db.attempts.add(attempt({ itemGen: 2 }));
  const history = await db.attempts.toArray();
  expect(await rebuildCache(db, context)).toEqual({ items: 0, blocks: 3, skipped: 1 });
  expect(await db.attempts.toArray()).toEqual(history);
});
it('rolls back a failed cache rewrite', async () => {
  await recordAttempt(db, attempt(), context);
  const before = await dump(db);
  vi.spyOn(db.blockState, 'bulkPut').mockRejectedValueOnce(new Error('Cuota'));
  await expect(rebuildCache(db, context)).rejects.toThrow('Cuota');
  expect(await dump(db)).toEqual(before);
});
