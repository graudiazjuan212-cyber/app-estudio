import type { Attempt } from '../../../src/domain/study/types.ts';
import { attempt } from './items.ts';
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
