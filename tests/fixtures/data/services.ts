import fingerprints from './fingerprints.json';
import type { Submission } from '../../../src/domain/study/index.ts';
export const startInput = { sessionId: 'run', subjectId: 'ejmat', kind: 'study' as const,
  chapterId: null, minutes: 10, seed: 1 };
export const initialIds = ['mat-i1', 'mat-i2', 'mat-i3', 'mat-i4', 'mat-i5'];
export const correctTest: Submission = { kind: 'answer', answer: { tipo: 'test', selected: 0 }, confidence: 'seguro' };
export const answers: { itemId: string; fingerprint: string; submission: Submission }[] = [
  { itemId: 'mat-i1', fingerprint: fingerprints['mat-i1'], submission: { kind: 'seen' } },
  { itemId: 'mat-i2', fingerprint: fingerprints['mat-i2'], submission: { kind: 'flashcard', rating: 'facil' } },
  { itemId: 'mat-i3', fingerprint: fingerprints['mat-i3'], submission: correctTest },
  { itemId: 'mat-i4', fingerprint: fingerprints['mat-i4'], submission: { kind: 'answer', answer: { tipo: 'multi', selected: [0, 1] }, confidence: 'seguro' } },
  { itemId: 'mat-i5', fingerprint: fingerprints['mat-i5'], submission: { kind: 'answer', answer: { tipo: 'vf', value: true }, confidence: 'seguro' } },
];
export const validSettings = [
  ['sessionMinutes', 5], ['sessionMinutes', 10], ['sessionMinutes', 15],
  ['dailyGoalMinutes', 5], ['dailyGoalMinutes', 10], ['dailyGoalMinutes', 15],
  ['theme', 'system'], ['theme', 'light'], ['theme', 'dark'],
] as const;
export const summaryAttempts = [
  { itemId: 'mat-i2', tipo: 'flashcard' as const, rating: 'facil' as const, confidence: null, correct: true },
  { itemId: 'mat-i3', tipo: 'test' as const, correct: true },
  { itemId: 'mat-i4', tipo: 'multi' as const, correct: true },
  { itemId: 'mat-i5', tipo: 'vf' as const, correct: true },
  { itemId: 'mat-i10', tipo: 'test' as const, blockId: 'mat-b2', correct: false },
];
export const dueCases = [
  { id: 'mat-i2', due: '2026-11-25T02:59:59.999Z' },
  { id: 'mat-i3', due: '2026-11-25T03:00:00.000Z' },
  { id: 'mat-i4', due: '2026-11-24T00:00:00.000Z' },
];
export const serviceTimes = { earlier: '2026-11-23T10:00:00.000Z',
  tomorrow: '2026-11-25T10:00:00.000Z', after: '2026-11-26T10:00:00.000Z' };

export const defaults = { sessionMinutes: 10, dailyGoalMinutes: 10, theme: 'system' };
export const firstAnswers = answers;
export const firstPlan = initialIds;
export const secondContext = { now: '2026-11-25T10:00:00.000Z', tz: 'Europe/Madrid' };
export const thirdContext = { now: '2026-11-26T10:00:00.000Z', tz: 'Europe/Madrid' };
