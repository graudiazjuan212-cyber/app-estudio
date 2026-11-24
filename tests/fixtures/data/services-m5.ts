import fingerprints from './fingerprints.json';
import type { Submission } from '../../../src/domain/study/index.ts';
export const startInput = { sessionId: 'run', subjectId: 'ejmat', kind: 'study' as const,
  chapterId: null, minutes: 10, seed: 1 };
export const firstPlan = ['mat-i1', 'mat-i2', 'mat-i3', 'mat-i4', 'mat-i5'];
export const correctTest: Submission = { kind: 'answer', answer: { tipo: 'test', selected: 0 }, confidence: 'seguro' };
export const firstAnswers: { itemId: string; fingerprint: string; submission: Submission }[] = [
  { itemId: 'mat-i1', fingerprint: fingerprints['mat-i1'], submission: { kind: 'seen' } },
  { itemId: 'mat-i2', fingerprint: fingerprints['mat-i2'], submission: { kind: 'flashcard', rating: 'facil' } },
  { itemId: 'mat-i3', fingerprint: fingerprints['mat-i3'], submission: correctTest },
  { itemId: 'mat-i4', fingerprint: fingerprints['mat-i4'], submission: { kind: 'answer', answer: { tipo: 'multi', selected: [0, 1] }, confidence: 'seguro' } },
  { itemId: 'mat-i5', fingerprint: fingerprints['mat-i5'], submission: { kind: 'answer', answer: { tipo: 'vf', value: true }, confidence: 'seguro' } },
];
export const defaults = { sessionMinutes: 10, dailyGoalMinutes: 10, theme: 'system' };
export const secondContext = { now: '2026-11-25T10:00:00.000Z', tz: 'Europe/Madrid' };
export const thirdContext = { now: '2026-11-26T10:00:00.000Z', tz: 'Europe/Madrid' };
