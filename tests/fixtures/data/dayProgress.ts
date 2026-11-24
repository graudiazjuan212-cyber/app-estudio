import fingerprints from './fingerprints.json';
import type { SubmitAnswerInput } from '../../../src/data/studyAnswer.ts';
export const initialProgress = { total: 4, answered: 0, successes: 0, needed: 4, missing: 4, remaining: 4,
  voided: false, validToday: false, validDays: 0, requiredDays: 2 };
export const directFlashInput: SubmitAnswerInput = { itemId: 'mat-i2', fingerprint: fingerprints['mat-i2'], sessionId: 'run',
  attemptId: 'direct', durationMs: 1, submission: { kind: 'flashcard', rating: 'otra' } };
export const masteredFields = { blockId: 'mat-b1', subjectId: 'ejmat', validDays: ['2026-11-22', '2026-11-23'],
  masteredOn: '2026-11-23', provisional: false, reviewDays: [], locked: false };
