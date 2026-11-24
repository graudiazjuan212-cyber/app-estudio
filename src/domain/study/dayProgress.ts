import { studyConfig } from '../../config.ts';
import { evaluableIds } from './catalog.ts';
import type { Catalog, CatalogBlock } from './catalog.ts';
import { compareAttempts, isCurrentEvaluable } from './history.ts';
import { blockState } from './mastery.ts';
import type { BlockState } from './mastery.ts';
import type { Attempt } from './types.ts';

export interface BlockDayProgress {
  total: number; answered: number; successes: number; needed: number; missing: number;
  remaining: number; voided: boolean; validToday: boolean; validDays: number; requiredDays: number;
}
export function blockDayProgress({ block, catalog, attempts, today, state }: {
  block: CatalogBlock; catalog: Catalog; attempts: Attempt[]; today: string; state?: BlockState | undefined;
}): BlockDayProgress {
  const ids = new Set(evaluableIds(block, catalog));
  const group = attempts.filter(a => a.studyDay === today && ids.has(a.itemId) && isCurrentEvaluable(a, catalog));
  const first = new Map<string, Attempt>();
  for (const a of [...group].sort(compareAttempts)) if (!first.has(a.itemId)) first.set(a.itemId, a);
  const total = ids.size;
  const needed = Math.ceil(total * studyConfig.masteryThresholdPercent / studyConfig.percentScale);
  const successes = [...first.values()].filter(a => a.correct).length;
  const voided = group.some(a => a.dontKnow || (!a.correct && a.confidence === 'seguro'));
  return { total, answered: first.size, successes, needed, missing: Math.max(0, needed - successes),
    remaining: total - first.size, voided, validToday: total > 0 && !voided && successes >= needed,
    validDays: (state ?? blockState(block, catalog, attempts, today)).validDays.length,
    requiredDays: studyConfig.masteryRequiredDays };
}
