import { studyConfig as config } from '../../config.ts';
import { evaluableIds } from './catalog.ts';
import type { Catalog, CatalogBlock, CatalogChapter } from './catalog.ts';
import { compareAttempts, compareText, isCurrentEvaluable } from './history.ts';
import type { Attempt } from './types.ts';

export type BlockStatus = 'pendiente' | 'en_curso' | 'dominado' | 'graduado';
export interface BlockState {
  blockId: string; status: BlockStatus; validDays: string[]; masteredOn: string | null;
  provisional: boolean; reviewDays: { day: string; clean: boolean }[]; locked: boolean;
}
function isMastered(status: BlockStatus | undefined): boolean {
  return status === 'dominado' || status === 'graduado';
}
function derive(block: CatalogBlock, count: number, attempts: Attempt[], today: string): BlockState {
  const result: BlockState = { blockId: block.id, status: 'pendiente', validDays: [],
    masteredOn: null, provisional: false, reviewDays: [], locked: false };
  if (count === 0 || attempts.length === 0) return result;
  const days = new Map<string, Attempt[]>();
  for (const a of [...attempts].sort(compareAttempts)) {
    const group = days.get(a.studyDay) ?? [];
    group.push(a);
    days.set(a.studyDay, group);
  }
  for (const day of [...days.keys()].sort(compareText)) {
    const group = days.get(day) ?? [];
    if (result.masteredOn !== null && result.masteredOn < day) {
      if (group.some(a => !a.correct)) {
        result.validDays = [];
        result.masteredOn = null;
        result.reviewDays = [];
      } else {
        result.reviewDays.push({ day, clean: group.every(a => a.correct &&
          (a.tipo === 'flashcard' ? a.rating === 'facil' : a.confidence === 'seguro')) });
      }
      continue;
    }
    const first = new Map<string, Attempt>();
    for (const a of group) if (!first.has(a.itemId)) first.set(a.itemId, a);
    const successes = [...first.values()].filter(a => a.correct).length;
    if (successes * config.percentScale >= count * config.masteryThresholdPercent &&
      !group.some(a => a.dontKnow || (!a.correct && a.confidence === 'seguro'))) {
      result.validDays.push(day);
      if (result.validDays.length >= config.masteryRequiredDays) result.masteredOn = day;
    }
  }
  result.status = result.masteredOn === null ? 'en_curso' : 'dominado';
  if (result.masteredOn !== null && result.reviewDays.length >= config.graduationRequiredReviews &&
    result.reviewDays.slice(-config.graduationRequiredReviews).every(review => review.clean))
    result.status = 'graduado';
  result.provisional = isMastered(result.status) && (result.masteredOn === today ||
    (result.status === 'graduado' && result.reviewDays.at(-1)?.day === today));
  return result;
}
export function blockState(block: CatalogBlock, catalog: Catalog, attempts: Attempt[], today: string): BlockState {
  const ids = new Set(evaluableIds(block, catalog));
  return derive(block, ids.size, attempts.filter(a => ids.has(a.itemId) && isCurrentEvaluable(a, catalog)), today);
}
export function allBlockStates(catalog: Catalog, attempts: Attempt[], today: string): Map<string, BlockState> {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!isCurrentEvaluable(a, catalog)) continue;
    const item = catalog.items.get(a.itemId);
    if (!item) continue;
    const group = groups.get(item.blockId) ?? [];
    group.push(a);
    groups.set(item.blockId, group);
  }
  const states = new Map<string, BlockState>();
  for (const block of catalog.blocks.values()) {
    const ids = new Set(evaluableIds(block, catalog));
    states.set(block.id, derive(block, ids.size,
      (groups.get(block.id) ?? []).filter(a => ids.has(a.itemId)), today));
  }
  for (const block of catalog.blocks.values()) {
    const state = states.get(block.id);
    if (state) state.locked = state.status === 'pendiente' &&
      block.requiere.some(id => !isMastered(states.get(id)?.status));
  }
  return states;
}
export function chapterPercent(chapter: CatalogChapter, catalog: Catalog, states: Map<string, BlockState>): number {
  let total = 0;
  let mastered = 0;
  for (const id of chapter.blockIds) {
    const block = catalog.blocks.get(id);
    if (!block || evaluableIds(block, catalog).length === 0) continue;
    total += block.peso;
    if (isMastered(states.get(id)?.status)) mastered += block.peso;
  }
  return total === 0 ? 0 : Math.floor(config.percentScale * mastered / total);
}
