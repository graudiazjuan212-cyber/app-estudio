import type { Catalog } from './catalog.ts';
import type { Attempt, ItemState } from './types.ts';
import { validateAttempt } from './types.ts';
import { applyAttempt } from './scheduler.ts';
import { allBlockStates } from './mastery.ts';
import type { BlockState } from './mastery.ts';
import { pendingBlindSpots } from './blindspots.ts';
import type { BlindSpot } from './blindspots.ts';
import { compareAttempts } from './history.ts';

export interface DerivedState {
  items: Map<string, ItemState>; blocks: Map<string, BlockState>; blindSpots: BlindSpot[];
  skipped: { attemptId: string; reason: string }[];
}
export function rebuildFromAttempts(attempts: Attempt[], catalog: Catalog, today: string): DerivedState {
  const items = new Map<string, ItemState>();
  const skipped: DerivedState['skipped'] = [];
  const accepted: Attempt[] = [];
  for (const a of [...attempts].sort(compareAttempts)) {
    const errors = validateAttempt(a);
    const item = catalog.items.get(a.itemId);
    const reason = errors.length ? `Intento inválido: ${errors.join('; ')}` :
      !item ? 'El ítem no está en el catálogo.' :
        a.itemGen !== item.itemGen ? 'La generación del ítem no coincide con la actual.' : null;
    if (reason !== null) {
      skipped.push({ attemptId: a.attemptId, reason });
      continue;
    }
    accepted.push(a);
    const { state } = applyAttempt(items.get(a.itemId) ?? null, a);
    if (state !== null) items.set(a.itemId, state);
  }
  return { items, blocks: allBlockStates(catalog, accepted, today),
    blindSpots: pendingBlindSpots(catalog, accepted), skipped };
}
