import { practiceConfig as config, studyConfig } from '../../config.ts';
import type { Attempt } from './types.ts';
import type { SessionInput } from './session.ts';
import { estimateSeconds } from './estimate.ts';
import { mulberry32 } from './random.ts';
import { compareText } from './history.ts';

export type PracticeAttempt = Omit<Attempt, 'schedulerVersion'>;
export interface PracticeWeightInput {
  blindSpot?: boolean; recentFail?: boolean; lowConfidence?: boolean;
  practiceFailures?: number; mastered?: boolean;
}
export function practiceWeight(input: PracticeWeightInput): number {
  const failures = input.practiceFailures ?? 0;
  if (!Number.isInteger(failures) || failures < 0) throw new Error('Racha de fallos inválida.');
  return (config.base + (input.blindSpot ? config.blindSpot : 0) +
    (input.recentFail ? config.recentFail : 0) + (input.lowConfidence ? config.lowConfidence : 0) +
    config.practiceFail * Math.min(failures, config.practiceFailCap)) * (input.mastered ? config.masteredFactor : 1);
}
export function consecutivePracticeFailures(attempts: readonly PracticeAttempt[]): number {
  const ordered = [...attempts].sort((a, b) => compareText(b.at, a.at) || compareText(b.attemptId, a.attemptId));
  const firstCorrect = ordered.findIndex(a => a.correct);
  return firstCorrect < 0 ? ordered.length : firstCorrect;
}
export interface PracticeInput extends SessionInput {
  practiceAttempts: PracticeAttempt[];
  // Historical eligibility is separate from the recent weighting window.
  attemptedItemIds?: ReadonlySet<string>;
}
export function buildPracticeSession(input: PracticeInput): { itemIds: string[]; estimatedSeconds: number } {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) throw new Error('Duración de sesión inválida.');
  const { catalog, derived, attempts, practiceAttempts, subjectId } = input;
  const attempted = input.attemptedItemIds ?? new Set(attempts.map(a => a.itemId));
  const blind = new Set(derived.blindSpots.map(a => a.itemId));
  const normal = new Map<string, Attempt[]>();
  const practice = new Map<string, PracticeAttempt[]>();
  for (const a of attempts) {
    if (catalog.items.get(a.itemId)?.itemGen !== a.itemGen) continue;
    const group = normal.get(a.itemId) ?? []; group.push(a); normal.set(a.itemId, group);
  }
  for (const a of practiceAttempts) {
    if (catalog.items.get(a.itemId)?.itemGen !== a.itemGen) continue;
    const group = practice.get(a.itemId) ?? []; group.push(a); practice.set(a.itemId, group);
  }
  const random = mulberry32(input.seed);
  const candidates = [...catalog.items.values()].filter(item => item.tipo !== 'info' && !item.archived &&
    catalog.blocks.get(item.blockId)?.subjectId === subjectId &&
    derived.blocks.get(item.blockId)?.locked === false && attempted.has(item.id)).sort((a, b) => compareText(a.id, b.id));
  const costs = new Map([...new Set(candidates.map(item => item.tipo))]
    .map(tipo => [tipo, estimateSeconds(tipo, attempts)]));
  const ranked = candidates.map(item => {
    const history = normal.get(item.id) ?? [];
    const latest = [...history].sort((a, b) => compareText(b.at, a.at) || compareText(b.attemptId, a.attemptId))[0];
    const status = derived.blocks.get(item.blockId)?.status;
    const weight = practiceWeight({ blindSpot: blind.has(item.id), recentFail: history.some(a => !a.correct),
      lowConfidence: latest?.correct === true && (latest.confidence === 'duda' || latest.confidence === 'bastante' || latest.rating === 'dificil'),
      practiceFailures: consecutivePracticeFailures(practice.get(item.id) ?? []),
      mastered: status === 'dominado' || status === 'graduado' });
    return { id: item.id, key: random() ** (1 / weight), seconds: costs.get(item.tipo) ?? studyConfig.secondsPerType[item.tipo] };
  }).sort((a, b) => b.key - a.key || compareText(a.id, b.id));
  const itemIds: string[] = [];
  let estimatedSeconds = 0;
  for (const item of ranked) if (estimatedSeconds + item.seconds <= input.minutes * studyConfig.secondsPerMinute) {
    itemIds.push(item.id); estimatedSeconds += item.seconds;
  }
  const first = ranked[0];
  if (!itemIds.length && first) { itemIds.push(first.id); estimatedSeconds = first.seconds; }
  return { itemIds, estimatedSeconds };
}
