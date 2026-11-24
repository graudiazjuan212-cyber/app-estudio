import fingerprints from '../../tests/fixtures/data/fingerprints.json';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { correctTest, startInput } from '../../tests/fixtures/data/services.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { startStudySession, submitAnswer, finishStudySession } from './study.ts';
let db: StudyDb;
const input = { fingerprint: fingerprints['mat-i3'], sessionId: 'run', itemId: 'mat-i3', attemptId: 'answer', submission: correctTest, durationMs: 1000 };
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); await startStudySession(db, startInput, context); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it('saves current metadata and returns duplicate without another attempt', async () => {
  expect(await submitAnswer(db, input, context)).toEqual({ status: 'saved', correct: true, blockStatus: 'en_curso' });
  expect(await db.attempts.get('answer')).toMatchObject({ attemptId: 'answer', itemId: 'mat-i3', itemGen: 1,
    subjectId: 'ejmat', chapterId: 'ejmat-c01', blockId: 'mat-b1', tipo: 'test', at: context.now,
    studyDay: '2026-11-24', tz: 'Europe/Madrid', packVersion: 1, schedulerVersion: 1, correct: true, confidence: 'seguro' });
  const before = await dump(db);
  expect(await submitAnswer(db, input, context)).toMatchObject({ status: 'duplicate', correct: true });
  expect(await dump(db)).toEqual(before);
});
it('uses active pack version and current item generation', async () => {
  await importPackText(db, packText('mat-ejemplo-c01-v2'), context);
  await submitAnswer(db, input, context);
  expect(await db.attempts.get('answer')).toMatchObject({ packVersion: 2, itemGen: 1 });
});
it.each([-1, NaN, 1.5, Infinity])('rejects invalid duration %s without writing', async durationMs => {
  const before = await dump(db);
  await expect(submitAnswer(db, { ...input, durationMs }, context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('caps excessive duration', async () => {
  await submitAnswer(db, { ...input, durationMs: 9999999 }, context);
  expect((await db.attempts.get('answer'))?.durationMs).toBe(3600000);
});
it('rejects an incompatible submission without writing', async () => {
  const before = await dump(db);
  await expect(submitAnswer(db, { ...input, submission: { kind: 'flashcard', rating: 'facil' } }, context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('rejects a failed write and permits retry with the same attempt id', async () => {
  const before = await dump(db);
  vi.spyOn(db.attempts, 'add').mockRejectedValueOnce(new Error('write failed'));
  await expect(submitAnswer(db, input, context)).rejects.toThrow('write failed');
  expect(await dump(db)).toEqual(before);
  expect((await submitAnswer(db, input, context)).status).toBe('saved');
});
it('records info without FSRS or evaluable summary credit', async () => {
  expect(await submitAnswer(db, { ...input, itemId: 'mat-i1', fingerprint: fingerprints['mat-i1'], submission: { kind: 'seen' } }, context))
    .toMatchObject({ status: 'saved', correct: null });
  expect((await db.attempts.get('answer'))?.tipo).toBe('info');
  expect(await db.itemState.get('mat-i1')).toBeUndefined();
  expect(await finishStudySession(db, 'run', context)).toMatchObject({ correct: 0, total: 0 });
});
it('keeps flashcard correctness', async () => {
  expect(await submitAnswer(db, { ...input, itemId: 'mat-i2', fingerprint: fingerprints['mat-i2'], submission: { kind: 'flashcard', rating: 'otra' } }, context))
    .toMatchObject({ correct: false });
});
it.each([{ sessionId: 'missing' }, { itemId: 'mat-i10' }, { attemptId: '' }])('rejects invalid context %j', async patch => {
  const before = await dump(db);
  await expect(submitAnswer(db, { ...input, ...patch }, context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('rejects new answers after finishing but allows an existing retry', async () => {
  await submitAnswer(db, input, context);
  await finishStudySession(db, 'run', context);
  expect((await submitAnswer(db, input, context)).status).toBe('duplicate');
  expect((await submitAnswer(db, { ...input, attemptId: 'new' }, context)).status).toBe('already-answered');
  await expect(submitAnswer(db, { ...input, attemptId: 'unanswered', itemId: 'mat-i2',
    fingerprint: fingerprints['mat-i2'], submission: { kind: 'flashcard', rating: 'facil' } }, context)).rejects.toThrow();
});
it('rejects archived items without writing', async () => {
  await db.items.update('mat-i3', { archived: true });
  const before = await dump(db);
  await expect(submitAnswer(db, input, context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
