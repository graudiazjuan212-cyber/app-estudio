import type { Catalog } from './catalog.ts';
import type { Attempt } from './types.ts';

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
export function compareAttempts(a: Pick<Attempt, 'at' | 'attemptId'>, b: Pick<Attempt, 'at' | 'attemptId'>): number {
  const aTime = Date.parse(a.at);
  const bTime = Date.parse(b.at);
  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);
  // Invalid instants must not interrupt the chronological order of valid attempts.
  if (aValid !== bValid) return aValid ? -1 : 1;
  return (aValid ? aTime - bTime : compareText(a.at, b.at)) || compareText(a.attemptId, b.attemptId);
}
export function isCurrentEvaluable(a: Attempt, catalog: Catalog): boolean {
  const item = catalog.items.get(a.itemId);
  return item !== undefined && !item.archived && item.tipo !== 'info' &&
    a.tipo !== 'info' && a.itemGen === item.itemGen;
}
