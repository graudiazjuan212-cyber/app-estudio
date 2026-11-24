import type { Attempt, ItemState } from '../../../src/domain/study/types.ts';
import { attempt } from './items.ts';

export const tiedFailure: Attempt = { ...attempt, attemptId: 'a', itemId: 'i1', blockId: 'B',
  correct: false, confidence: 'seguro' };
export const tiedSuccess: Attempt = { ...tiedFailure, attemptId: 'b', correct: true };
// Calculated once directly with ts-fsrs 5.4.2, using M2-1's generatorParameters
// (retention .9, max 36500, no fuzz/short term): empty -> Again -> Easy,
// both at 2026-11-24T10:00Z. This fixed oracle does not call the study scheduler.
export const tiedExpected: ItemState = {
  itemId: 'i1', itemGen: 1, lastAttemptId: 'b', card: {
    due: '2026-11-28T10:00:00.000Z', stability: 0.212, difficulty: 5.20002037,
    elapsed_days: 0, scheduled_days: 4, reps: 2, lapses: 0, learning_steps: 0, state: 2,
    last_review: '2026-11-24T10:00:00.000Z',
  },
};
export const invalidDays = ['2026-98-98', '2026-02-30', '2026-02-29', '', '2026-1-5'];
export const validDays = ['2028-02-29', '2026-02-28', '2026-01-05'];
export const invalidZones = ['Mars/Olimpo', ''];
export const validZones = ['Europe/Madrid', 'Atlantic/Canary', 'UTC'];
export const impossibleSuccesses: Attempt[] = [
  { ...tiedSuccess, attemptId: 'invalid-day-1', studyDay: '2026-02-30' },
  { ...tiedSuccess, attemptId: 'invalid-day-2', studyDay: '2026-98-98', at: '2026-11-25T10:00:00.000Z' },
];
export const validSuccesses: Attempt[] = [
  tiedSuccess,
  { ...tiedSuccess, attemptId: 'next-day', studyDay: '2026-11-25', at: '2026-11-25T10:00:00.000Z' },
];
export const conflictPatches: Partial<Attempt>[] = [
  { itemId: 'i2' }, { itemGen: 2 }, { subjectId: 'other' }, { chapterId: 'other' },
  { blockId: 'other' }, { tipo: 'vf' }, { at: '2026-11-24T11:00:00.000Z' },
  { studyDay: '2026-11-23' }, { tz: 'UTC' }, { correct: false }, { dontKnow: true },
  { confidence: 'duda' }, { rating: 'bien' }, { durationMs: 101 }, { sessionId: 'other' },
  { packVersion: 2 }, { schedulerVersion: 2 },
];
