import fingerprints from '../../tests/fixtures/data/fingerprints.json';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { correctTest, firstAnswers, firstPlan, startInput } from '../../tests/fixtures/data/services-m5.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { loadSessionRun, startStudySession, submitAnswer } from './study.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
const input = () => ({ fingerprint: fingerprints['mat-i3'], sessionId: 'run', itemId: 'mat-i3', attemptId: 'answer', submission: correctTest, durationMs: 1000 });
it('starts with the fixed initial plan and chapter percentages', async () => {
  expect(await startStudySession(db, startInput, context)).toEqual({ status: 'started', sessionId: 'run' });
  expect(await db.sessions.get('run')).toMatchObject({ itemIds: firstPlan, percentBefore: { 'ejmat-c01': 0 }, kind: 'study' });
});
it('reviews only the specified chapter', async () => {
  await db.chapters.put({ id: 'other', subjectId: 'ejmat', numero: 2, titulo: 'Otro', version: 1 });
  await db.blocks.put({ id: 'other-block', subjectId: 'ejmat', chapterId: 'other', titulo: 'Otro', peso: 1,
    requiere: [], order: 0, archived: false });
  await db.items.put({ id: 'other-item', subjectId: 'ejmat', chapterId: 'other', blockId: 'other-block', tipo: 'vf',
    itemGen: 1, archived: false, relaciona: false, order: 0, data: { id: 'other-item', tipo: 'vf', enunciado: 'Otro', correcta: true } });
  expect(await startStudySession(db, { ...startInput, kind: 'review', chapterId: 'other' }, context)).toMatchObject({ status: 'started' });
  expect((await db.sessions.get('run'))?.itemIds).toEqual(['other-item']);
});
it('starts an exam with five evaluables', async () => {
  expect(await startStudySession(db, { ...startInput, kind: 'exam', chapterId: 'ejmat-c01' }, context)).toMatchObject({ status: 'started' });
  const run = await loadSessionRun(db, 'run');
  expect(run?.items).toHaveLength(5);
  expect(run?.items.every(i => i.chapterId === 'ejmat-c01' && i.item.tipo !== 'info')).toBe(true);
});
it.each(['review', 'exam'] as const)('does not create an empty %s session', async kind => {
  await db.items.toCollection().modify({ archived: true });
  expect(await startStudySession(db, { ...startInput, kind, chapterId: 'ejmat-c01' }, context)).toMatchObject({ status: 'empty' });
  expect(await db.sessions.count()).toBe(0);
});
it('does not create a session when every item was answered today', async () => {
  await startStudySession(db, startInput, context);
  for (const answer of firstAnswers) await submitAnswer(db, { ...answer, sessionId: 'run', attemptId: answer.itemId, durationMs: 1 }, context);
  expect(await startStudySession(db, { ...startInput, sessionId: 'empty' }, context)).toMatchObject({ status: 'empty' });
  expect(await db.sessions.count()).toBe(1);
});
it('rejects a repeated session id without changes', async () => {
  await startStudySession(db, startInput, context);
  const before = await db.sessions.toArray();
  expect(await startStudySession(db, startInput, context)).toMatchObject({ status: 'error' });
  expect(await db.sessions.toArray()).toEqual(before);
});
it('returns an error for failed session writes', async () => {
  vi.spyOn(db.sessions, 'add').mockRejectedValue(new Error('write failed'));
  expect(await startStudySession(db, startInput, context)).toMatchObject({ status: 'error' });
  expect(await db.sessions.count()).toBe(0);
});
it.each([
  { subjectId: 'missing' }, { minutes: 0 }, { minutes: NaN }, { seed: NaN },
  { kind: 'review' as const, chapterId: null }, { kind: 'exam' as const, chapterId: 'missing' },
])('returns errors for invalid session parameters: %j', async patch => {
  expect(await startStudySession(db, { ...startInput, ...patch }, context)).toMatchObject({ status: 'error' });
  expect(await db.sessions.count()).toBe(0);
});
it('loads the run at each position and omits subsequently archived items', async () => {
  expect(await loadSessionRun(db, 'missing')).toBeNull();
  await startStudySession(db, startInput, context);
  expect(await loadSessionRun(db, 'run')).toMatchObject({ answered: [], nextIndex: 0 });
  for (const answer of firstAnswers.slice(0, 2)) await submitAnswer(db, { ...answer, sessionId: 'run', attemptId: answer.itemId, durationMs: 1 }, context);
  expect(await loadSessionRun(db, 'run')).toMatchObject({ answered: ['mat-i1', 'mat-i2'], nextIndex: 2 });
  for (const answer of firstAnswers.slice(2)) await submitAnswer(db, { ...answer, sessionId: 'run', attemptId: answer.itemId, durationMs: 1 }, context);
  expect((await loadSessionRun(db, 'run'))?.nextIndex).toBe(5);
  await db.items.update('mat-i3', { archived: true });
  const run = await loadSessionRun(db, 'run');
  expect(run?.items.map(i => i.id)).toEqual(['mat-i1', 'mat-i2', 'mat-i4', 'mat-i5']);
  expect(run?.nextIndex).toBe(4);
});
it('records current metadata and returns duplicate on retry', async () => {
  await startStudySession(db, startInput, context);
  expect(await submitAnswer(db, input(), context)).toMatchObject({ status: 'saved', correct: true, blockStatus: 'en_curso' });
  expect(await db.attempts.get('answer')).toMatchObject({ itemGen: 1, packVersion: 1,
    schedulerVersion: 1, studyDay: '2026-11-24', tz: 'Europe/Madrid', at: context.now, confidence: 'seguro' });
  expect(await submitAnswer(db, input(), context)).toMatchObject({ status: 'duplicate', correct: true });
  expect(await db.attempts.count()).toBe(1);
});
it('uses the current item generation and chapter version', async () => {
  await startStudySession(db, startInput, context);
  await db.items.update('mat-i3', { itemGen: 2 });
  await db.chapters.update('ejmat-c01', { version: 2 });
  await submitAnswer(db, input(), context);
  expect(await db.attempts.get('answer')).toMatchObject({ itemGen: 2, packVersion: 2 });
});
it.each([-1, NaN, 1.5, Infinity])('rejects invalid duration %s without saving', async durationMs => {
  await startStudySession(db, startInput, context);
  await expect(submitAnswer(db, { ...input(), durationMs }, context)).rejects.toThrow();
  expect(await db.attempts.count()).toBe(0);
});
it('caps large durations', async () => {
  await startStudySession(db, startInput, context);
  await submitAnswer(db, { ...input(), durationMs: 9999999 }, context);
  expect((await db.attempts.get('answer'))?.durationMs).toBe(3600000);
});
it('rejects incompatible submissions without saving', async () => {
  await startStudySession(db, startInput, context);
  await expect(submitAnswer(db, { ...input(), submission: { kind: 'flashcard', rating: 'facil' } }, context)).rejects.toThrow();
  expect(await db.attempts.count()).toBe(0);
});
it('propagates write failure and preserves a retry with the same id', async () => {
  await startStudySession(db, startInput, context);
  const spy = vi.spyOn(db.attempts, 'add').mockRejectedValue(new Error('write failed'));
  await expect(submitAnswer(db, input(), context)).rejects.toThrow('write failed');
  expect(await db.attempts.count()).toBe(0);
  spy.mockRestore();
  expect(await submitAnswer(db, input(), context)).toMatchObject({ status: 'saved' });
});
it('records info as seen without scheduler state', async () => {
  await startStudySession(db, startInput, context);
  expect(await submitAnswer(db, { ...input(), itemId: 'mat-i1', fingerprint: fingerprints['mat-i1'], submission: { kind: 'seen' } }, context))
    .toMatchObject({ status: 'saved', correct: null });
  expect(await db.attempts.get('answer')).toMatchObject({ tipo: 'info' });
  expect(await db.itemState.get('mat-i1')).toBeUndefined();
});
it('rejects a missing or foreign item/session', async () => {
  await expect(submitAnswer(db, input(), context)).rejects.toThrow();
  await startStudySession(db, startInput, context);
  await expect(submitAnswer(db, { ...input(), itemId: 'mat-i10' }, context)).rejects.toThrow();
  expect(await db.attempts.count()).toBe(0);
});
