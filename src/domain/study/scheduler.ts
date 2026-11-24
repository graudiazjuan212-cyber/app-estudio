import { createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs';
import { studyConfig } from '../../config.ts';
import { fromStoredCard, toStoredCard, validateAttempt } from './types.ts';
import type { Attempt, ItemState } from './types.ts';
import { nextCutoff } from './time.ts';
import { compareAttempts } from './history.ts';

export function fsrsRating(a: Attempt): 1 | 2 | 3 | 4 | null {
  const errors = validateAttempt(a);
  if (errors.length) throw new Error(errors.join('; '));
  if (a.tipo === 'info') return null;
  if (a.tipo === 'flashcard') {
    switch (a.rating) {
      case 'otra': return 1;
      case 'dificil': return 2;
      case 'bien': return 3;
      case 'facil': return 4;
      default: throw new Error('Invalid flashcard rating');
    }
  }
  if (a.dontKnow || !a.correct) return 1;
  switch (a.confidence) {
    case 'duda': return 2;
    case 'bastante': return 3;
    case 'seguro': return 4;
    default: throw new Error('Invalid confidence');
  }
}
export function newItemState(itemId: string, itemGen: number): ItemState {
  if (!itemId || !Number.isInteger(itemGen) || itemGen < 1) throw new Error('Invalid item identity');
  // Sentinel only: an unreviewed card is seeded with the first attempt's instant.
  return { itemId, itemGen, lastAttemptId: '', card: toStoredCard(createEmptyCard(studyConfig.emptyCardInstant)) };
}
interface Applied { state: ItemState; needsRebuild: boolean }
interface MaybeApplied { state: ItemState | null; needsRebuild: boolean }
export function applyAttempt(prev: ItemState, a: Attempt): Applied;
export function applyAttempt(prev: ItemState | null, a: Attempt): MaybeApplied;
export function applyAttempt(prev: ItemState | null, a: Attempt): MaybeApplied {
  const rating = fsrsRating(a);
  if (rating === null) return { state: prev, needsRebuild: false };
  if (prev && (prev.itemId !== a.itemId || prev.itemGen !== a.itemGen)) throw new Error('Item identity mismatch');
  if (prev && typeof prev.lastAttemptId !== 'string') return { state: prev, needsRebuild: true };
  if (prev && prev.lastAttemptId === a.attemptId) return { state: prev, needsRebuild: false };
  const at = new Date(a.at);
  const card = prev ? fromStoredCard(prev.card) : createEmptyCard(at);
  if (prev?.card.last_review !== undefined &&
    compareAttempts(a, { at: prev.card.last_review, attemptId: prev.lastAttemptId }) < 0)
    return { state: prev, needsRebuild: true };
  if (card.reps === 0) card.due = at;
  const scheduler = fsrs(generatorParameters(studyConfig.fsrs));
  const next = scheduler.next(card, at, rating).card;
  return { state: { itemId: a.itemId, itemGen: a.itemGen, lastAttemptId: a.attemptId,
    card: toStoredCard(next) }, needsRebuild: false };
}
export function isDue(state: ItemState, now: string, tz: string): boolean {
  return isDueBefore(state, dueCutoffMs(now, tz));
}

export function dueCutoffMs(now: string, tz: string): number {
  return Date.parse(nextCutoff(now, tz));
}
export function isDueBefore(state: ItemState, cutoffMs: number): boolean {
  // Preserve rejection of invalid stored dates, including last_review.
  fromStoredCard(state.card);
  if (!Number.isFinite(cutoffMs)) throw new Error('Invalid cutoff');
  return Date.parse(state.card.due) < cutoffMs;
}
