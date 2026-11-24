import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { firstAnswers, startInput } from '../../tests/fixtures/data/services-m5.ts';
import { directFlashInput, initialProgress, masteredFields } from '../../tests/fixtures/data/dayProgress.ts';
import { qualityConfig } from '../../e2e/support/quality-config.ts';
import { generateBackup } from '../../e2e/support/big-data.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { startStudySession, submitAnswer } from './study.ts';
import { getSubjectView } from './views.ts';
import { fsrsRating } from '../domain/study/index.ts';
let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it('returns initial progress and no progress for locked blocks or missing subjects', async () => {
  const view = await getSubjectView(db, 'ejmat', context);
  expect(view?.chapters[0]?.blocks.map(b => b.dayProgress)).toEqual([
    initialProgress, null, null,
  ]);
  expect(await getSubjectView(db, 'missing', context)).toBeNull();
});
it('returns the same progress in submit, duplicate and subject view without double counting today', async () => {
  await startStudySession(db, startInput, context);
  for (const answer of firstAnswers) {
    const input = { ...answer, sessionId: 'run', attemptId: answer.itemId, durationMs: 1 };
    const result = await submitAnswer(db, input, context);
    const view = await getSubjectView(db, 'ejmat', context);
    expect(result.dayProgress).toEqual(view?.chapters[0]?.blocks[0]?.dayProgress);
    expect((await submitAnswer(db, input, context)).dayProgress).toEqual(result.dayProgress);
  }
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks[0]?.dayProgress)
    .toMatchObject({ answered: 4, successes: 4, missing: 0, validToday: true, validDays: 1 });
});
it('maps the direct flashcard failure to Again without dontKnow invalidation', async () => {
  await startStudySession(db, startInput, context);
  const result = await submitAnswer(db, directFlashInput, context);
  const attempt = await db.attempts.get('direct');
  expect(attempt).toMatchObject({ tipo: 'flashcard', rating: 'otra', correct: false, dontKnow: false, confidence: null });
  if (!attempt) throw new Error('Missing attempt');
  expect(fsrsRating(attempt)).toBe(1);
  expect(await db.itemState.get('mat-i2')).toMatchObject({ lastAttemptId: 'direct', card: { reps: 1, state: 2 } });
  expect(result.dayProgress).toMatchObject({ successes: 0, voided: false, validToday: false });
});
it.each(['dominado', 'graduado'] as const)('hides progress for %s', async status => {
  await db.blockState.put({ ...masteredFields, status });
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks[0]?.dayProgress).toBeNull();
});
it('reads 6000 questions and 20000 attempts through the day index without full attempt scans', async () => {
  const { data } = generateBackup();
  await db.subjects.bulkPut(data.subjects.map(s => ({ id: s.id, nombre: s.nombre })));
  await db.chapters.bulkPut(data.chapters); await db.blocks.bulkPut(data.blocks);
  await db.items.bulkPut(data.items); await db.attempts.bulkPut(data.attempts);
  const fullScan = vi.spyOn(db.attempts, 'toArray');
  const index = vi.spyOn(db.attempts, 'where');
  const view = await getSubjectView(db, 'large-s0', context);
  expect(view?.chapters[0]?.blocks.length).toBeGreaterThan(0);
  expect(index).toHaveBeenCalledWith('[subjectId+studyDay]');
  expect(fullScan).not.toHaveBeenCalled();
}, qualityConfig.testMs);
