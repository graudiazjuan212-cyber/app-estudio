import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { correctTest, startInput } from '../../tests/fixtures/data/services.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { getSessionSummary, loadSessionRun, startStudySession, submitAnswer } from './study.ts';

let db: StudyDb;
beforeEach(async () => {
  db = await testDb();
  await importPackText(db, packText('fp-v1'), context);
  await startStudySession(db, startInput, context);
});
afterEach(async () => { await db.delete(); });
async function input(itemId = 'mat-i3', sessionId = 'run') {
  const run = await loadSessionRun(db, sessionId);
  const item = run?.items.find(i => i.id === itemId);
  if (!item) throw new Error('Missing fixture item');
  return { sessionId, itemId, attemptId: 'a1', fingerprint: item.fingerprint,
    submission: correctTest, durationMs: 1000 };
}
it('A1/A3: saves once, preserves all state and counts only one answer', async () => {
  const first = await input();
  expect((await loadSessionRun(db, 'run'))?.items).toHaveLength(3);
  expect(await submitAnswer(db, first, context)).toMatchObject({ status: 'saved', correct: true });
  const before = await dump(db);
  expect(await submitAnswer(db, { ...first, attemptId: 'a2', submission: { kind: 'dontKnow' } }, context))
    .toEqual({ status: 'already-answered', correct: true, blockStatus: null });
  expect(await dump(db)).toEqual(before);
  expect(await db.attempts.count()).toBe(1);
  expect((await submitAnswer(db, first, context)).status).toBe('duplicate');
  expect(await dump(db)).toEqual(before);
  expect(await getSessionSummary(db, 'run', context)).toMatchObject({ total: 1, correct: 1 });
});
it('A2: concurrent submissions serialize to one saved answer', async () => {
  const first = await input();
  const results = await Promise.all([submitAnswer(db, first, context),
    submitAnswer(db, { ...first, attemptId: 'a2' }, context)]);
  expect(results.map(r => r.status).sort()).toEqual(['already-answered', 'saved']);
  expect(await db.attempts.count()).toBe(1);
});
it('A4: allows different items and the same item in another session', async () => {
  await startStudySession(db, { ...startInput, sessionId: 'other' }, context);
  expect((await submitAnswer(db, await input(), context)).status).toBe('saved');
  expect((await submitAnswer(db, { ...await input('mat-i5'), attemptId: 'a2',
    submission: { kind: 'answer', answer: { tipo: 'vf', value: true }, confidence: 'seguro' } }, context)).status).toBe('saved');
  expect((await submitAnswer(db, { ...await input('mat-i3', 'other'), attemptId: 'a3' }, context)).status).toBe('saved');
  expect(await db.attempts.count()).toBe(3);
});
it('returns null correctness for an info answer already saved in another window', async () => {
  await importPackText(db, packText('mat-ejemplo-c01-v2'), context);
  await startStudySession(db, { ...startInput, sessionId: 'info' }, context);
  const first = { ...await input('mat-i1', 'info'), submission: { kind: 'seen' as const } };
  await submitAnswer(db, first, context);
  const before = await dump(db);
  expect(await submitAnswer(db, { ...first, attemptId: 'a2' }, context))
    .toEqual({ status: 'already-answered', correct: null, blockStatus: null });
  expect(await dump(db)).toEqual(before);
});
it('B2: refuses stale content then corrects refreshed content with its active version', async () => {
  const first = await input();
  await importPackText(db, packText('fp-v2'), context);
  const before = await dump(db);
  expect(await submitAnswer(db, first, context)).toEqual({ status: 'changed', correct: null, blockStatus: null });
  expect(await dump(db)).toEqual(before);
  expect(await db.attempts.count()).toBe(0);
  const refreshed = await input();
  expect(refreshed.fingerprint).not.toBe(first.fingerprint);
  expect(await submitAnswer(db, refreshed, context)).toMatchObject({ status: 'saved', correct: false });
  expect(await db.attempts.get('a1')).toMatchObject({ packVersion: 2, itemGen: 1, correct: false });
});
it('B3: accepts unchanged content from a newer pack and records the active version', async () => {
  const first = await input('mat-i5');
  await importPackText(db, packText('fp-v2'), context);
  expect((await input('mat-i5')).fingerprint).toBe(first.fingerprint);
  expect((await submitAnswer(db, { ...first,
    submission: { kind: 'answer', answer: { tipo: 'vf', value: true }, confidence: 'seguro' } }, context)).status).toBe('saved');
  expect(await db.attempts.get('a1')).toMatchObject({ packVersion: 2 });
});
it.each([undefined, '', 'not-a-fingerprint', '12345678:0', '12345678:12\n'])('B4: rejects invalid or absent fingerprint %s without writes', async fingerprint => {
    const first = await input();
    if (fingerprint === undefined) Reflect.deleteProperty(first, 'fingerprint');
    else first.fingerprint = fingerprint;
    const before = await dump(db);
    await expect(submitAnswer(db, first, context)).rejects.toThrow();
    expect(await dump(db)).toEqual(before);
  });

it('A3: summary remains one after a rejected second answer', async () => {
  const first = await input();
  await submitAnswer(db, first, context);
  await submitAnswer(db, { ...first, attemptId: 'a2' }, context);
  expect(await getSessionSummary(db, 'run', context)).toMatchObject({ total: 1, correct: 1 });
});
it('returns stored correctness for retries even if the content has since changed', async () => {
  const first = await input();
  await submitAnswer(db, first, context);
  await importPackText(db, packText('fp-v2'), context);
  const before = await dump(db);
  expect(await submitAnswer(db, first, context)).toMatchObject({ status: 'duplicate', correct: true });
  expect(await submitAnswer(db, { ...first, attemptId: 'a2' }, context))
    .toEqual({ status: 'already-answered', correct: true, blockStatus: null });
  expect(await dump(db)).toEqual(before);
});
