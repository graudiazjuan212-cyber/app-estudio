import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { changedBackup } from '../../tests/fixtures/data/backup.ts';
import { context, dump, testDb } from '../../tests/fixtures/data/helpers.ts';
import { incrementalAttempt, incrementalSequence, incrementalTestConfig as config,
  unrelatedHistory } from '../../tests/fixtures/data/incremental.ts';
import type { StudyDb } from './db.ts';
import { recordAttempt } from './attempts.ts';
import { restoreBackup } from './backup.ts';
import { rebuildCache } from './cache.ts';

let db: StudyDb;
beforeEach(async () => {
  db = await testDb();
  expect((await restoreBackup(db, changedBackup(b => { b.data.attempts = []; }), context)).status).toBe('restored');
});
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });

async function expectRebuildEquivalent(now: string): Promise<void> {
  const items = await db.itemState.toArray();
  const blocks = await db.blockState.toArray();
  await rebuildCache(db, { ...context, now });
  expect(await db.itemState.toArray()).toEqual(items);
  expect(await db.blockState.toArray()).toEqual(blocks);
}

it('matches full rebuilding through 30 attempts, four days, mastery and loss', async () => {
  const sequence = incrementalSequence();
  expect(sequence).toHaveLength(30);
  for (const [index, row] of sequence.entries()) {
    const result = await recordAttempt(db, row, { ...context, now: row.at });
    expect(result.usedFullRebuild).toBeUndefined();
    if (config.checkpoints.includes(index)) {
      expect((await db.blockState.get('b1'))?.status).toBe(index === 11 ? 'dominado' : 'en_curso');
      expect((await db.blockState.get('b2'))?.locked).toBe(index !== 11);
    }
    await expectRebuildEquivalent(row.at);
  }
});
it('uses a full rebuild only when a catalog block cache is missing', async () => {
  await db.blockState.delete('b2');
  expect(await recordAttempt(db, incrementalAttempt(), context)).toMatchObject({ usedFullRebuild: true });
  await expectRebuildEquivalent(context.now);
  expect((await recordAttempt(db, incrementalAttempt({ attemptId: 'next' }), context)).usedFullRebuild).toBeUndefined();
});
it('queries only current block item history and leaves unchanged block rows unwritten', async () => {
  const query = vi.spyOn(db.attempts, 'where');
  const writes = vi.spyOn(db.blockState, 'bulkPut');
  const result = await recordAttempt(db, incrementalAttempt(), context);
  expect(query.mock.calls.map(args => args[0])).toEqual(['itemId']);
  expect(writes).toHaveBeenCalledOnce();
  expect(writes.mock.calls[0]?.[0]).toMatchObject([{ blockId: 'b1' }]);
  expect(result.blockState).not.toHaveProperty('subjectId');
});
it('rebuilds only the out of order item and matches the full reconstruction', async () => {
  await recordAttempt(db, incrementalAttempt({ attemptId: 'later', at: '2026-11-25T10:00:00.000Z', studyDay: '2026-11-25' }), context);
  const query = vi.spyOn(db.attempts, 'where');
  const itemWrites = vi.spyOn(db.itemState, 'put');
  await recordAttempt(db, incrementalAttempt(), context);
  expect(query.mock.calls.map(args => args[0])).toEqual(['itemId', 'itemId']);
  expect(itemWrites).toHaveBeenCalledOnce();
  expect(itemWrites.mock.calls[0]?.[0]).toMatchObject({ itemId: 'i1' });
  await expectRebuildEquivalent(context.now);
});
it('expires provisional states on another block when the study day changes', async () => {
  for (const row of incrementalSequence()) await recordAttempt(db, row, { ...context, now: row.at });
  expect((await db.blockState.get('b2'))?.provisional).toBe(true);
  const next = incrementalAttempt({ itemId: 'i4', blockId: 'b4', chapterId: 'c2',
    at: '2026-11-28T10:00:00.000Z', studyDay: '2026-11-28' });
  await recordAttempt(db, next, { ...context, now: next.at });
  expect((await db.blockState.get('b2'))?.provisional).toBe(false);
  await expectRebuildEquivalent(next.at);
});
it('keeps idempotence and rolls back an incremental block write failure', async () => {
  const row = incrementalAttempt();
  await recordAttempt(db, row, context);
  const before = await dump(db);
  expect((await recordAttempt(db, row, context)).status).toBe('duplicate');
  expect(await dump(db)).toEqual(before);
  vi.spyOn(db.blockState, 'bulkPut').mockRejectedValueOnce(new Error('Cuota'));
  await expect(recordAttempt(db, incrementalAttempt({ attemptId: 'failure', correct: false }), context)).rejects.toThrow('Cuota');
  expect(await dump(db)).toEqual(before);
});
it('records an answer below the latency budget with 20000 unrelated subject attempts', async () => {
  await db.attempts.bulkAdd(unrelatedHistory());
  await rebuildCache(db, context);
  const query = vi.spyOn(db.attempts, 'where');
  const start = performance.now();
  const result = await recordAttempt(db, incrementalAttempt(), context);
  const elapsed = performance.now() - start;
  if (elapsed > config.targetMs) console.info(`recordAttempt: ${String(elapsed)} ms`);
  expect(elapsed).toBeLessThan(config.maxMs);
  expect(result.usedFullRebuild).toBeUndefined();
  expect(query.mock.calls.map(args => args[0])).toEqual(['itemId']);
  await expectRebuildEquivalent(context.now);
}, config.timeoutMs);
