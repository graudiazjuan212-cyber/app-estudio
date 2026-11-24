import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, dump, packText, testDb } from '../../tests/fixtures/data/helpers';
import { correctTest } from '../../tests/fixtures/data/services';
import { realContext, realText } from '../../tests/fixtures/backups/v1';
import { importPackText } from './importPack';
import type { StudyDb } from './db';
import { startPracticeSession, submitPracticeAnswer } from './practice';
import { loadSessionRun } from './study';
import { finishStudySession } from './studySummary';
import { exportBackup, restoreBackup, undoRestore } from './backup';
import { backupSchema } from './backupSchema';
import { rebuildCache } from './cache';
import { getHomeView, getSubjectView } from './views';
import { exportProgress } from './progressExport';
import { practiceConfig } from '../config';

let db: StudyDb;
beforeEach(async () => {
  db = await testDb();
  await importPackText(db, packText('fp-v1'), context);
  await db.sessions.add({ id: 'practice', subjectId: 'ejmat', kind: 'practice', chapterId: null,
    startedAt: context.now, endedAt: null, itemIds: ['mat-i3', 'mat-i5'], minutes: 10, percentBefore: {}, result: null });
});
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
async function input(itemId = 'mat-i3') {
  const item = (await loadSessionRun(db, 'practice'))?.items.find(i => i.id === itemId);
  if (!item) throw new Error('Missing fixture item');
  return { fingerprint: item.fingerprint, sessionId: 'practice', itemId, attemptId: 'p1', durationMs: 60000, submission: correctTest };
}
it('serializes concurrent saves, duplicate retry and second answer without extra writes', async () => {
  const first = await input();
  const results = await Promise.all([submitPracticeAnswer(db, first, context), submitPracticeAnswer(db, { ...first, attemptId: 'p2' }, context)]);
  expect(results.map(r => r.status).sort()).toEqual(['already-answered', 'saved']);
  const before = await dump(db);
  expect(await submitPracticeAnswer(db, first, context)).toEqual({ status: 'duplicate', correct: true });
  expect(await submitPracticeAnswer(db, { ...first, attemptId: 'p3' }, context)).toEqual({ status: 'already-answered', correct: true });
  expect(await dump(db)).toEqual(before);
  expect((await loadSessionRun(db, 'practice'))?.answered).toEqual(['mat-i3']);
});
it('rejects a stale fingerprint and accepts refreshed content at the active pack version', async () => {
  const first = await input(); await importPackText(db, packText('fp-v2'), context);
  const before = await dump(db);
  expect(await submitPracticeAnswer(db, first, context)).toEqual({ status: 'changed', correct: null });
  expect(await dump(db)).toEqual(before);
  expect(await submitPracticeAnswer(db, await input(), context)).toEqual({ status: 'saved', correct: false });
  expect(await db.practiceAttempts.get('p1')).toMatchObject({ packVersion: 2, itemGen: 1 });
});
it.each([undefined, '', 'bad', '12345678:0', '12345678:12\n'])('rejects absent/invalid fingerprint %s without writing', async fingerprint => {
  const first = await input();
  if (fingerprint === undefined) Reflect.deleteProperty(first, 'fingerprint'); else first.fingerprint = fingerprint;
  const before = await dump(db);
  await expect(submitPracticeAnswer(db, first, context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it.each(['archived', 'finished', 'foreign', 'normal', 'invalid-duration', 'missing-id'])('rejects %s without writes', async reason => {
  const first = await input();
  if (reason === 'archived') await db.items.update(first.itemId, { archived: true });
  if (reason === 'finished') await db.sessions.update('practice', { endedAt: context.now });
  if (reason === 'foreign') await db.sessions.update('practice', { itemIds: [] });
  if (reason === 'normal') await db.sessions.update('practice', { kind: 'study' });
  if (reason === 'invalid-duration') first.durationMs = -1;
  if (reason === 'missing-id') first.attemptId = '';
  const before = await dump(db);
  await expect(submitPracticeAnswer(db, first, context)).rejects.toThrow(); expect(await dump(db)).toEqual(before);
});
it('rejects reuse of another item attempt id', async () => {
  await submitPracticeAnswer(db, await input(), context);
  const before = await dump(db);
  await expect(submitPracticeAnswer(db, await input('mat-i5'), context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('a confident practice failure cannot create a blind spot or move due dates', async () => {
  const first = await input(); const before = await dump(db);
  expect(await submitPracticeAnswer(db, { ...first, submission: {
    kind: 'answer', answer: { tipo: 'test', selected: 1 }, confidence: 'seguro',
  } }, context)).toEqual({ status: 'saved', correct: false });
  const after = await dump(db);
  for (const table of ['attempts', 'itemState', 'blockState']) expect(after[table]).toEqual(before[table]);
  expect(await finishStudySession(db, 'practice', context)).toMatchObject({ blindSpotsCreated: 0, chapterChanges: [] });
});
it('flashcard unknown uses otra and a later practice success is recorded separately', async () => {
  await db.delete();
  db = await testDb();
  await importPackText(db, packText(), context);
  await db.sessions.add({ id: 'practice', subjectId: 'ejmat', kind: 'practice', chapterId: null,
    startedAt: context.now, endedAt: null, itemIds: ['mat-i2'], minutes: 10, percentBefore: {}, result: null });
  const first = await input('mat-i2');
  expect(await submitPracticeAnswer(db, { ...first, submission: { kind: 'dontKnow' } }, context))
    .toEqual({ status: 'saved', correct: false });
  expect(await db.practiceAttempts.get('p1')).toMatchObject({ rating: 'otra', dontKnow: false, confidence: null });
  await db.sessions.add({ id: 'second', kind: 'practice', subjectId: 'ejmat', chapterId: null,
    itemIds: ['mat-i2'], minutes: 10, startedAt: context.now, endedAt: null, percentBefore: {}, result: null });
  expect(await submitPracticeAnswer(db, { ...first, sessionId: 'second', attemptId: 'p2',
    submission: { kind: 'flashcard', rating: 'bien' } }, context)).toEqual({ status: 'saved', correct: true });
  expect(await db.attempts.count()).toBe(0);
});
it('counts a practice-only day and yesterday practice plus normal study today', async () => {
  const before = await getHomeView(db, context);
  await submitPracticeAnswer(db, await input(), context);
  const after = await getHomeView(db, context);
  expect(after.secondsToday).toBe(60); expect(after.streak).toBe(1);
  expect(after.subjects).toEqual(before.subjects);
  const tomorrow = { ...context, now: '2026-11-25T10:00:00.000Z' };
  const row = await db.practiceAttempts.get('p1'); if (!row) throw new Error('Missing practice');
  await db.attempts.add({ ...row, attemptId: 'normal', at: tomorrow.now, studyDay: '2026-11-25', schedulerVersion: 1 });
  expect((await getHomeView(db, tomorrow)).streak).toBe(2);
});
it('round trips practice, rejects malformed rows atomically and undo restores practice too', async () => {
  await submitPracticeAnswer(db, await input(), context);
  const saved = (await exportBackup(db, context)).json;
  const backup = backupSchema.parse(JSON.parse(saved) as unknown);
  const malformed = { ...backup, data: { ...backup.data, practiceAttempts: [{ attemptId: 'broken' }] } };
  const before = await dump(db);
  expect((await restoreBackup(db, JSON.stringify(malformed), context)).status).toBe('rejected');
  expect(await dump(db)).toEqual(before);
  const { practiceAttempts, ...legacyData } = backup.data;
  expect(practiceAttempts).toHaveLength(1);
  expect((await restoreBackup(db, JSON.stringify({ ...backup, data: legacyData }), context)).status).toBe('restored');
  expect(await db.practiceAttempts.count()).toBe(0);
  expect((await undoRestore(db, context)).status).toBe('restored');
  expect(await db.practiceAttempts.toArray()).toEqual(practiceAttempts);
  expect((await restoreBackup(db, saved, context)).status).toBe('restored');
  expect(await db.practiceAttempts.toArray()).toEqual(practiceAttempts);
});
it('rejects invalid references in practice backups without writing', async () => {
  await submitPracticeAnswer(db, await input(), context);
  const backup = backupSchema.parse(JSON.parse((await exportBackup(db, context)).json) as unknown);
  const row = backup.data.practiceAttempts?.[0]; if (!row) throw new Error('Missing fixture');
  row.itemId = 'unknown'; const before = await dump(db);
  expect((await restoreBackup(db, JSON.stringify(backup), context)).status).toBe('rejected');
  expect(await dump(db)).toEqual(before);
});
it('preserves all progress and export on real history, including a confident failure, unknown and flashcard', async () => {
  expect((await restoreBackup(db, realText, realContext)).status).toBe('restored');
  const start = await startPracticeSession(db, { subjectId: 'ejmat', sessionId: 'free', minutes: 30, seed: 1 }, realContext);
  expect(start.status).toBe('started');
  const run = await loadSessionRun(db, 'free'); if (!run) throw new Error('Missing run');
  const before = await dump(db);
  const home = await getHomeView(db, realContext); const subject = await getSubjectView(db, 'ejmat', realContext);
  const progress = await exportProgress(db, 'ejmat', realContext);
  for (const item of run.items) await submitPracticeAnswer(db, { sessionId: 'free', itemId: item.id,
    fingerprint: item.fingerprint, attemptId: `free-${item.id}`, durationMs: 1000,
    submission: item.item.tipo === 'test' ? correctTest : { kind: 'dontKnow' } }, realContext);
  const after = await dump(db);
  for (const table of ['attempts', 'itemState', 'blockState', 'items', 'chapters', 'blocks']) expect(after[table]).toEqual(before[table]);
  expect((await getHomeView(db, realContext)).subjects).toEqual(home.subjects);
  expect(await getSubjectView(db, 'ejmat', realContext)).toEqual(subject);
  expect(await exportProgress(db, 'ejmat', realContext)).toEqual(progress);
  const summary = await finishStudySession(db, 'free', realContext);
  expect(summary).toMatchObject({ kind: 'practice', total: run.items.length, blindSpotsCreated: 0, chapterChanges: [] });
  await rebuildCache(db, realContext);
  expect(await db.itemState.toArray()).toEqual(before.itemState);
  expect(await db.blockState.toArray()).toEqual(before.blockState);
  expect(await db.practiceAttempts.count()).toBe(run.items.length);
});
it('returns the fixed empty message and uses only indexed history reads', async () => {
  const normal = vi.spyOn(db.attempts, 'toArray'); const practice = vi.spyOn(db.practiceAttempts, 'toArray');
  expect(await startPracticeSession(db, { subjectId: 'ejmat', sessionId: 'empty', minutes: 10, seed: 1 }, context))
    .toEqual({ status: 'empty', message: practiceConfig.empty });
  await getHomeView(db, context);
  expect(normal).not.toHaveBeenCalled(); expect(practice).not.toHaveBeenCalled();
});
it.each(['duration', 'seed', 'subject', 'session'])('rejects invalid practice start %s without writes', async field => {
  const start = { subjectId: 'ejmat', sessionId: 'new', minutes: 10, seed: 1 };
  if (field === 'duration') start.minutes = 0;
  if (field === 'seed') start.seed = 0.5;
  if (field === 'subject') start.subjectId = 'missing';
  if (field === 'session') start.sessionId = 'practice';
  const before = await dump(db);
  expect((await startPracticeSession(db, start, context)).status).toBe('error');
  expect(await dump(db)).toEqual(before);
});
it('practice-only history cannot introduce new material into a draw', async () => {
  await submitPracticeAnswer(db, await input(), context);
  expect(await startPracticeSession(db, { subjectId: 'ejmat', sessionId: 'next', minutes: 10, seed: 1 }, context))
    .toEqual({ status: 'empty', message: practiceConfig.empty });
});
it('a failure leaves the current plan intact and only the next session draws again', async () => {
  expect((await restoreBackup(db, realText, realContext)).status).toBe('restored');
  const start = { subjectId: 'ejmat', sessionId: 'draw', minutes: 10, seed: 1 };
  expect((await startPracticeSession(db, start, realContext)).status).toBe('started');
  const before = await db.sessions.get('draw');
  const run = await loadSessionRun(db, 'draw'); const item = run?.items[0];
  if (!item) throw new Error('Missing practice question');
  await submitPracticeAnswer(db, { sessionId: 'draw', itemId: item.id, fingerprint: item.fingerprint,
    attemptId: 'failure', durationMs: 1000, submission: { kind: 'dontKnow' } }, realContext);
  expect(await db.sessions.get('draw')).toEqual(before);
  expect((await startPracticeSession(db, { ...start, sessionId: 'next' }, realContext)).status).toBe('started');
});
