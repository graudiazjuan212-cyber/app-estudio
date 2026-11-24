import { packConfig, studyConfig as config } from '../../config.ts';
import type { Catalog, CatalogItem } from './catalog.ts';
import type { DerivedState } from './rebuild.ts';
import type { Attempt } from './types.ts';
import { fromStoredCard } from './types.ts';
import { studyDay } from './time.ts';
import { dueCutoffMs, isDueBefore } from './scheduler.ts';
import { estimateSeconds } from './estimate.ts';
import { shuffle } from './random.ts';
import { compareText } from './history.ts';

export interface SessionInput {
  catalog: Catalog; derived: DerivedState; attempts: Attempt[];
  subjectId: string; now: string; tz: string; minutes: number; seed: number;
}
export interface SessionPlan {
  itemIds: string[];
  groups: { blind: string[]; due: string[]; current: string[]; interleaved: string[] };
  estimatedSeconds: number;
}
export function buildSession(input: SessionInput): SessionPlan {
  const { catalog, derived, attempts, subjectId, now, tz, minutes, seed } = input;
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('Duración de sesión inválida.');
  const today = studyDay(now, tz);
  // Same strict boundary as isDue, computed once rather than once per card.
  const cutoff = dueCutoffMs(now, tz);
  const budget = minutes * config.secondsPerMinute;
  const costs = new Map(packConfig.itemTypes.map(tipo => [tipo, estimateSeconds(tipo, attempts)]));
  const answered = new Set<string>();
  const attempted = new Set<string>();
  const seenInfo = new Set<string>();
  for (const a of attempts) {
    attempted.add(a.itemId);
    if (a.studyDay === today) answered.add(a.itemId);
    if (a.tipo === 'info') seenInfo.add(a.itemId);
  }
  const eligible = new Map<string, CatalogItem>();
  for (const item of catalog.items.values()) {
    const block = catalog.blocks.get(item.blockId);
    const state = derived.blocks.get(item.blockId);
    if (block?.subjectId === subjectId && state && !state.locked && !item.archived && !answered.has(item.id))
      eligible.set(item.id, item);
  }
  const blind = derived.blindSpots.map(spot => spot.itemId)
    .filter(id => eligible.has(id) && eligible.get(id)?.tipo !== 'info');
  const dueTimes = new Map<string, number>();
  for (const item of eligible.values()) {
    const state = derived.items.get(item.id);
    if (item.tipo === 'info' || !state) continue;
    const due = fromStoredCard(state.card).due.getTime();
    if (isDueBefore(state, cutoff)) dueTimes.set(item.id, due);
  }
  const due = [...dueTimes.keys()].sort((a, b) =>
    (dueTimes.get(a) ?? 0) - (dueTimes.get(b) ?? 0) || compareText(a, b));
  const current: string[] = [];
  const chapters = [...catalog.chapters.values()].filter(ch => ch.subjectId === subjectId)
    .sort((a, b) => a.numero - b.numero || compareText(a.id, b.id));
  for (const chapter of chapters) for (const blockId of chapter.blockIds) {
    const block = catalog.blocks.get(blockId);
    const state = derived.blocks.get(blockId);
    if (!block || !state || state.locked || !['pendiente', 'en_curso'].includes(state.status)) continue;
    const items = block.itemIds.flatMap(id => {
      const item = eligible.get(id);
      return item ? [item] : [];
    });
    if (state.status === 'pendiente') current.push(...items.filter(item =>
      item.tipo === 'info' && !seenInfo.has(item.id)).map(item => item.id));
    const evaluable = items.filter(item => item.tipo !== 'info');
    current.push(...evaluable.filter(item => !attempted.has(item.id)).map(item => item.id),
      ...evaluable.filter(item => attempted.has(item.id)).map(item => item.id));
  }
  const interleaved = shuffle([...eligible.values()].filter(item => item.tipo !== 'info' &&
    derived.blocks.get(item.blockId)?.status !== 'pendiente').map(item => item.id).sort(compareText), seed);
  const plan: SessionPlan = { itemIds: [], groups: { blind: [], due: [], current: [], interleaved: [] }, estimatedSeconds: 0 };
  const selected = new Set<string>();
  const cost = (id: string) => {
    const item = eligible.get(id);
    if (!item) throw new Error('Ítem candidato ausente.');
    return costs.get(item.tipo) ?? config.secondsPerType[item.tipo];
  };
  const add = (id: string, group: keyof SessionPlan['groups']) => {
    selected.add(id);
    plan.groups[group].push(id);
    plan.estimatedSeconds += cost(id);
  };
  for (const [group, candidates, limit] of [
    ['blind', blind, Math.floor(budget * config.blindSpotBudgetPercent / config.percentScale)],
    ['due', due, budget], ['current', current, budget], ['interleaved', interleaved, budget],
  ] satisfies [keyof SessionPlan['groups'], string[], number][]) {
    for (const id of candidates) if (!selected.has(id) && plan.estimatedSeconds + cost(id) <= limit) add(id, group);
  }
  if (selected.size === 0) {
    for (const [group, candidates] of [['current', current], ['due', due], ['interleaved', interleaved]] satisfies
      [keyof SessionPlan['groups'], string[]][]) {
      const first = candidates[0];
      if (first !== undefined) { add(first, group); break; }
    }
  }
  plan.itemIds = [...plan.groups.blind, ...plan.groups.due, ...plan.groups.current, ...plan.groups.interleaved];
  return plan;
}
