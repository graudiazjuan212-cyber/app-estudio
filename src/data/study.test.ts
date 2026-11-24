import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { attempt, context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { answers, initialIds, serviceTimes, startInput } from '../../tests/fixtures/data/services.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { loadSessionRun, startStudySession, submitAnswer } from './study.ts';
let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it('plans an initial study session from attempts, ignoring corrupt caches', async () => {
  await db.blockState.clear();
  expect(await startStudySession(db, startInput, context)).toEqual({ status: 'started', sessionId: 'run' });
  expect(await db.sessions.get('run')).toEqual({ id: 'run', subjectId: 'ejmat', kind: 'study', chapterId: null,
    startedAt: context.now, endedAt: null, result: null, minutes: 10, itemIds: initialIds, percentBefore: { 'ejmat-c01': 0 } });
});
it('rejects duplicate session ids without changing data', async () => {
  await startStudySession(db, startInput, context);
  const before = await dump(db);
  expect((await startStudySession(db, startInput, context)).status).toBe('error');
  expect(await dump(db)).toEqual(before);
});
it('returns error for write failure rather than throwing', async () => {
  const before = await dump(db);
  vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('write failed'));
  expect(await startStudySession(db, startInput, context)).toEqual({ status: 'error', message: 'write failed' });
  expect(await dump(db)).toEqual(before);
});
it.each([
  { subjectId: 'missing' }, { sessionId: 'A' }, { minutes: 0 }, { minutes: NaN }, { seed: NaN },
  { kind: 'review' as const, chapterId: null }, { kind: 'exam' as const, chapterId: 'missing' },
])('returns error for invalid input %j without a session', async patch => {
  expect((await startStudySession(db, { ...startInput, ...patch }, context)).status).toBe('error');
  expect(await db.sessions.count()).toBe(0);
});
it('filters review to its chapter even with another subject chapter present', async () => {
  await importPackText(db, packText('mat-ejemplo-c02-services'), context);
  expect((await startStudySession(db, { ...startInput, kind: 'review', chapterId: 'ejmat-c02' }, context)).status).toBe('started');
  expect((await db.sessions.get('run'))?.itemIds).toEqual(['mat-c02-i1']);
});
it('creates an exam with five evaluable items in a stable order', async () => {
  expect((await startStudySession(db, { ...startInput, kind: 'exam', chapterId: 'ejmat-c01' }, context)).status).toBe('started');
  const run = await loadSessionRun(db, 'run');
  expect(run?.items).toHaveLength(5);
  expect(run?.items.every(row => row.chapterId === 'ejmat-c01' && row.item.tipo !== 'info')).toBe(true);
  await startStudySession(db, { ...startInput, sessionId: 'other', kind: 'exam', chapterId: 'ejmat-c01' }, context);
  expect((await db.sessions.get('other'))?.itemIds).toEqual(run?.session.itemIds);
});
it('returns empty without a row when every item has been answered today', async () => {
  const rows = await db.items.toArray();
  await db.attempts.bulkAdd(rows.map(row => attempt({ attemptId: row.id, itemId: row.id, tipo: row.tipo, blockId: row.blockId })));
  expect((await startStudySession(db, startInput, context)).status).toBe('empty');
  expect(await db.sessions.count()).toBe(0);
});
it('loads progress, handles missing sessions, and skips archived items', async () => {
  expect(await loadSessionRun(db, 'missing')).toBeNull();
  await startStudySession(db, startInput, context);
  expect((await loadSessionRun(db, 'run'))?.nextIndex).toBe(0);
  for (const [index, answer] of answers.entries()) {
    await submitAnswer(db, { ...answer, sessionId: 'run', attemptId: `answer-${String(index)}`, durationMs: 1000 }, context);
    if (index === 1) expect(await loadSessionRun(db, 'run')).toMatchObject({ answered: ['mat-i1', 'mat-i2'], nextIndex: 2 });
  }
  expect((await loadSessionRun(db, 'run'))?.nextIndex).toBe(5);
  await db.items.update('mat-i3', { archived: true });
  expect((await loadSessionRun(db, 'run'))?.items.map(i => i.id)).toEqual(['mat-i1', 'mat-i2', 'mat-i4', 'mat-i5']);
  expect((await loadSessionRun(db, 'run'))?.nextIndex).toBe(4);
});
it('produces no session for an empty chapter', async () => {
  await db.items.toCollection().modify({ archived: true });
  expect((await startStudySession(db, { ...startInput, kind: 'exam', chapterId: 'ejmat-c01' }, context)).status).toBe('empty');
  expect(await db.sessions.count()).toBe(0);
});
it('keeps chapter percentages for all chapters before review', async () => {
  await importPackText(db, packText('mat-ejemplo-c02-services'), context);
  await startStudySession(db, { ...startInput, kind: 'review', chapterId: 'ejmat-c02' }, { ...context, now: serviceTimes.tomorrow });
  expect((await db.sessions.get('run'))?.percentBefore).toEqual({ 'ejmat-c01': 0, 'ejmat-c02': 0 });
});
