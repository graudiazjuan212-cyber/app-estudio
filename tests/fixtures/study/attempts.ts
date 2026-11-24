import type { Attempt, Confidence, FlashRating } from '../../../src/domain/study/types.ts';
import { attempt } from './items.ts';
export const D1 = '2026-11-02', D2 = '2026-11-03', D3 = '2026-11-04';
export const D4 = '2026-11-05', D5 = '2026-11-06', D6 = '2026-11-07', D7 = '2026-11-08';
export function ok(item: string, day: string, conf: Confidence = 'seguro', n = 0): Attempt {
  return { ...attempt, attemptId: `${item}-${day}-${String(n)}-${conf}`, itemId: item,
    at: new Date(Date.parse(`${day}T10:00:00.000Z`) + n * 1000).toISOString(),
    studyDay: day, blockId: 'B', confidence: conf };
}
export function bad(item: string, day: string, conf: Confidence): Attempt {
  return { ...ok(item, day, conf), attemptId: `${item}-${day}-bad-${conf}`, correct: false };
}
export function dk(item: string, day: string): Attempt {
  return { ...bad(item, day, 'duda'), attemptId: `${item}-${day}-dk`, dontKnow: true, confidence: null };
}
export function flash(item: string, day: string, rating: FlashRating): Attempt {
  return { ...ok(item, day), attemptId: `${item}-${day}-${rating}`, tipo: 'flashcard',
    confidence: null, rating, correct: rating !== 'otra' };
}
export const validAttempts: Attempt[] = [
  { ...attempt, tipo: 'info', confidence: null },
  { ...attempt, tipo: 'flashcard', confidence: null, rating: 'bien' },
  { ...attempt, tipo: 'test' }, { ...attempt, tipo: 'multi' }, { ...attempt, tipo: 'vf' },
  { ...attempt, tipo: 'ordenar' }, { ...attempt, tipo: 'emparejar' },
  { ...attempt, tipo: 'huecos' }, { ...attempt, tipo: 'error' },
  { ...attempt, dontKnow: true, correct: false, confidence: null },
  { ...attempt, correct: false }, { ...attempt, durationMs: 0 },
  { ...attempt, at: '2026-11-24T10:00:00Z' },
  { ...attempt, confidence: 'duda' }, { ...attempt, confidence: 'seguro' },
  { ...attempt, tipo: 'flashcard', rating: 'otra', correct: false, confidence: null },
  { ...attempt, tipo: 'flashcard', rating: 'dificil', confidence: null },
  { ...attempt, tipo: 'flashcard', rating: 'facil', confidence: null },
];
export const invalidAttempts: Partial<Attempt>[] = [
  { at: 'no-es-fecha' }, { at: '2026-11-24T10:00:00+00:00' },
  { at: '2026-02-30T10:00:00.000Z' }, { at: '2026-11-24' },
  { studyDay: '24-11-2026' }, { studyDay: '' },
  { durationMs: -1 }, { durationMs: 0.5 }, { durationMs: NaN },
  { itemGen: 0 }, { itemGen: 1.5 }, { itemGen: NaN },
  { packVersion: 0 }, { packVersion: 1.5 }, { packVersion: NaN },
  { tipo: 'info', confidence: null, correct: false },
  { tipo: 'info', confidence: null, dontKnow: true },
  { tipo: 'info' }, { tipo: 'info', confidence: null, rating: 'bien' },
  { tipo: 'flashcard', confidence: null },
  { tipo: 'flashcard', rating: 'bien' },
  { tipo: 'flashcard', confidence: null, rating: 'bien', dontKnow: true },
  { tipo: 'flashcard', confidence: null, rating: 'otra', correct: true },
  { tipo: 'flashcard', confidence: null, rating: 'bien', correct: false },
  { rating: 'bien' }, { dontKnow: true, confidence: null },
  { dontKnow: true, correct: false }, { confidence: null },
];
