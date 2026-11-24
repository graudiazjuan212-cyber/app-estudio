import type { Item } from '../pack/index.ts';
import { grade, ratingToCorrect } from './grade.ts';
import type { Answer } from './grade.ts';
import type { Confidence, FlashRating } from './types.ts';
export type Submission =
  | { kind: 'answer'; answer: Answer; confidence: Confidence }
  | { kind: 'dontKnow' } | { kind: 'flashcard'; rating: FlashRating } | { kind: 'seen' };
export type Outcome =
  | { ok: true; correct: boolean; dontKnow: boolean; confidence: Confidence | null; rating: FlashRating | null }
  | { ok: false; reason: string };
export function submissionOutcome(item: Item, submission: Submission): Outcome {
  const invalid: Outcome = { ok: false, reason: 'Envío incompatible con la pregunta.' };
  const base = { ok: true as const, dontKnow: false, confidence: null, rating: null };
  switch (submission.kind) {
    case 'answer': {
      if (!['duda', 'bastante', 'seguro'].includes(submission.confidence)) return invalid;
      const graded = grade(item, submission.answer);
      return graded.ok ? { ...base, correct: graded.correct, confidence: submission.confidence } : graded;
    }
    case 'dontKnow': return item.tipo === 'info' || item.tipo === 'flashcard' ? invalid
      : { ...base, correct: false, dontKnow: true };
    case 'flashcard': return item.tipo === 'flashcard' && ['otra', 'dificil', 'bien', 'facil'].includes(submission.rating)
      ? { ...base, correct: ratingToCorrect(submission.rating), rating: submission.rating } : invalid;
    case 'seen': return item.tipo === 'info' ? { ...base, correct: true } : invalid;
  }
}
