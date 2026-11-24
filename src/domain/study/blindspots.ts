import type { Catalog } from './catalog.ts';
import type { Attempt } from './types.ts';
import { compareAttempts, compareText, isCurrentEvaluable } from './history.ts';

export interface BlindSpot { itemId: string; since: string }
export function pendingBlindSpots(catalog: Catalog, attempts: Attempt[]): BlindSpot[] {
  const pending = new Map<string, BlindSpot>();
  for (const a of [...attempts].sort(compareAttempts)) {
    if (!isCurrentEvaluable(a, catalog) || a.tipo === 'flashcard' ||
      catalog.items.get(a.itemId)?.tipo === 'flashcard') continue;
    const previous = pending.get(a.itemId);
    if (!a.correct && !a.dontKnow && a.confidence === 'seguro') {
      if (!previous) pending.set(a.itemId, { itemId: a.itemId, since: a.studyDay });
    } else if (previous && a.studyDay > previous.since && a.correct &&
      (a.confidence === 'bastante' || a.confidence === 'seguro')) pending.delete(a.itemId);
  }
  return [...pending.values()].sort((a, b) => compareText(a.since, b.since) || compareText(a.itemId, b.itemId));
}
