import fingerprints from '../../tests/fixtures/data/fingerprints.json';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { attempt, context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { firstAnswers, secondContext, startInput } from '../../tests/fixtures/data/services-m5.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';
import { finishStudySession, getSessionSummary, startStudySession, submitAnswer } from './study.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { await db.delete(); });
it.each([4, 3])('summarizes five evaluables with %s correct and stores a stable ending', async correct => {
  await startStudySession(db, { ...startInput, kind: 'exam', chapterId: 'ejmat-c01' }, context);
  for (let i = 0; i < 5; i++) await recordAttempt(db, attempt({ attemptId: `a-${String(i)}`,
    sessionId: 'run', correct: i < correct, confidence: 'seguro' }), context);
  const summary = await finishStudySession(db, 'run', context);
  expect(summary).toEqual({ sessionId: 'run', kind: 'exam', correct, total: 5,
    blindSpotsCreated: 5 - correct, chapterChanges: [], streak: 1, secondsToday: 5, goalReached: false,
    exam: { passed: correct === 4 } });
  expect(await finishStudySession(db, 'run', context)).toEqual(summary);
  expect((await db.sessions.get('run'))?.endedAt).toBe(context.now);
  await finishStudySession(db, 'run', secondContext);
  expect((await db.sessions.get('run'))?.endedAt).toBe(context.now);
  expect((await db.sessions.get('run'))?.result).toEqual({ correct, total: 5 });
});
it('summarizes without writing and excludes info from the score', async () => {
  await startStudySession(db, startInput, context);
  for (const answer of firstAnswers) await submitAnswer(db, { ...answer, sessionId: 'run', attemptId: answer.itemId, durationMs: 1000 }, context);
  const before = await dump(db);
  expect(await getSessionSummary(db, 'run', context)).toMatchObject({ correct: 4, total: 4,
    blindSpotsCreated: 0, exam: null, secondsToday: 5, chapterChanges: [] });
  expect(await dump(db)).toEqual(before);
});
it('includes only changed chapter percentages after mastery', async () => {
  for (const [index, ctx] of [context, secondContext].entries()) {
    const sessionId = `run-${String(index)}`;
    await startStudySession(db, { ...startInput, sessionId }, ctx);
    for (const answer of firstAnswers.filter(answer => index === 0 || answer.submission.kind !== 'seen')) await submitAnswer(db, { ...answer, sessionId,
      attemptId: `${sessionId}-${answer.itemId}`, durationMs: 1000 }, ctx);
  }
  expect((await finishStudySession(db, 'run-1', secondContext)).chapterChanges).toEqual([
    { chapterId: 'ejmat-c01', titulo: 'Vectores en el plano', before: 0, after: 11 },
  ]);
});
it('does not count dontKnow answers as blind spots', async () => {
  await startStudySession(db, startInput, context);
  await submitAnswer(db, { fingerprint: fingerprints['mat-i3'], sessionId: 'run', itemId: 'mat-i3', attemptId: 'unknown', submission: { kind: 'dontKnow' }, durationMs: 600000 }, context);
  expect(await finishStudySession(db, 'run', context)).toMatchObject({ correct: 0, total: 1, blindSpotsCreated: 0,
    goalReached: true, secondsToday: 600 });
});
it('rejects missing sessions without writing', async () => {
  const before = await dump(db);
  await expect(getSessionSummary(db, 'missing', context)).rejects.toThrow();
  await expect(finishStudySession(db, 'missing', context)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
