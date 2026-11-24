import { allBlockStates, blockState, evaluableIds } from '../domain/study/index.ts';
import type { BlockState, Catalog } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { BlockStateRow } from './schema.ts';

export async function updateAttemptBlocks(db: StudyDb, catalog: Catalog, subjectId: string,
  blockId: string, today: string): Promise<{ states: Map<string, BlockState>; usedFullRebuild: boolean }> {
  const cached = await db.blockState.where('subjectId').equals(subjectId).toArray();
  const previous = new Map(cached.map(row => [row.blockId, row]));
  if ([...catalog.blocks.keys()].some(id => !previous.has(id))) {
    const attempts = await db.attempts.where('subjectId').equals(subjectId).toArray();
    const states = allBlockStates(catalog, attempts, today);
    await db.blockState.bulkPut([...states.values()].map(state => ({ ...state, subjectId })));
    return { states, usedFullRebuild: true };
  }
  const block = catalog.blocks.get(blockId);
  if (!block) throw new Error('El bloque no existe en el catálogo.');
  const ids = evaluableIds(block, catalog);
  const attempts = ids.length ? await db.attempts.where('itemId').anyOf(ids).toArray() : [];
  const states = new Map<string, BlockStateRow>(previous);
  states.set(blockId, { ...blockState(block, catalog, attempts, today), subjectId });
  const changed: BlockStateRow[] = [];
  for (const current of catalog.blocks.values()) {
    const state = states.get(current.id);
    if (!state) continue;
    const locked = state.status === 'pendiente' && current.requiere.some(id => {
      const status = states.get(id)?.status;
      return status !== 'dominado' && status !== 'graduado';
    });
    // Day rollover also expires provisional mastery, without reading more history.
    const provisional = (state.status === 'dominado' || state.status === 'graduado') &&
      (state.masteredOn === today || (state.status === 'graduado' && state.reviewDays.at(-1)?.day === today));
    const next = { ...state, locked, provisional };
    states.set(current.id, next);
    if (JSON.stringify(previous.get(current.id)) !== JSON.stringify(next)) changed.push(next);
  }
  if (changed.length) await db.blockState.bulkPut(changed);
  return { states, usedFullRebuild: false };
}
