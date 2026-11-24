import { afterEach, beforeEach, expect, it } from 'vitest';
import { attempt, context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { startInput, summaryAttempts } from '../../tests/fixtures/data/services.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';
import { finishStudySession, getSessionSummary, startStudySession } from './study.ts';
let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { await db.delete(); });
it('summarizes five distinct evaluables with four correct and one confident error', async () => {
  await startStudySession(db, startInput, context);
  for (const row of summaryAttempts) await recordAttempt(db, attempt({ ...row, attemptId: row.itemId,
    sessionId: 'run', confidence: row.tipo === 'flashcard' ? null : 'seguro' }), context);
  expect(await finishStudySession(db, 'run', context)).toEqual({ sessionId: 'run', kind: 'study', correct: 4,
    total: 5, blindSpotsCreated: 1, chapterChanges: [], streak: 1, secondsToday: 5, goalReached: false, exam: null });
  const before = await dump(db);
  await finishStudySession(db, 'run', context);
  expect(await dump(db)).toEqual(before);
});
it('reads an open or finished summary without altering any table', async () => {
  await startStudySession(db, startInput, context);
  const before = await dump(db);
  expect(await getSessionSummary(db, 'run', context)).toMatchObject({ total: 0, correct: 0, streak: 0, chapterChanges: [] });
  expect(await dump(db)).toEqual(before);
  await finishStudySession(db, 'run', context);
  const ended = await dump(db);
  await getSessionSummary(db, 'run', context);
  expect(await dump(db)).toEqual(ended);
});
it('does not count unknown or uncertain failures as confident errors', async () => {
  await startStudySession(db, startInput, context);
  await recordAttempt(db, attempt({ sessionId: 'run', attemptId: 'unknown', correct: false, dontKnow: true, confidence: null }), context);
  await recordAttempt(db, attempt({ sessionId: 'run', attemptId: 'uncertain', correct: false, confidence: 'duda' }), context);
  expect(await getSessionSummary(db, 'run', context)).toMatchObject({ total: 2, correct: 0, blindSpotsCreated: 0 });
});
