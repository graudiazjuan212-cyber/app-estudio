import { applyAttempt, rebuildFromAttempts, studyDay, validateAttempt } from '../domain/study/index.ts';
import type { Attempt, BlockState } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import { loadCatalog } from './catalog.ts';
import { updateAttemptBlocks } from './attemptCache.ts';

export interface RecordResult {
  status: 'saved' | 'duplicate'; blockState: BlockState | null; usedFullRebuild?: boolean;
}
export async function recordAttempt(db: StudyDb, attempt: Attempt, ctx: DataContext): Promise<RecordResult> {
  return db.transaction('rw', [db.attempts, db.itemState, db.blockState, db.items, db.blocks, db.chapters], async () => {
    const errors = validateAttempt(attempt);
    if (errors.length) throw new Error(`Intento inválido: ${errors.join('; ')}`);
    if (await db.attempts.get(attempt.attemptId)) {
      const row = await db.blockState.get(attempt.blockId);
      if (!row) return { status: 'duplicate', blockState: null };
      const state: BlockState = { blockId: row.blockId, status: row.status, validDays: row.validDays,
        masteredOn: row.masteredOn, provisional: row.provisional, reviewDays: row.reviewDays, locked: row.locked };
      return { status: 'duplicate', blockState: state };
    }
    const item = await db.items.get(attempt.itemId);
    if (!item || item.itemGen !== attempt.itemGen) throw new Error('El ítem no existe o su generación no coincide.');
    if (item.subjectId !== attempt.subjectId || item.chapterId !== attempt.chapterId ||
      item.blockId !== attempt.blockId || item.tipo !== attempt.tipo)
      throw new Error('El intento no corresponde al ítem actual.');
    const today = studyDay(ctx.now, ctx.tz);
    await db.attempts.add(attempt);
    const catalog = await loadCatalog(db, item.subjectId);
    const applied = applyAttempt(await db.itemState.get(item.id) ?? null, attempt);
    const state = applied.needsRebuild
      ? rebuildFromAttempts(await db.attempts.where('itemId').equals(item.id).toArray(),
        { items: new Map([[item.id, item]]), blocks: new Map(), chapters: new Map() }, today).items.get(item.id)
      : applied.state;
    if (state) await db.itemState.put(state);
    const { states, usedFullRebuild } = await updateAttemptBlocks(db, catalog, item.subjectId, item.blockId, today);
    const row = states.get(item.blockId);
    const result = row ? { blockId: row.blockId, status: row.status, validDays: row.validDays,
      masteredOn: row.masteredOn, provisional: row.provisional, reviewDays: row.reviewDays, locked: row.locked } : null;
    return { status: 'saved', blockState: result, ...(usedFullRebuild ? { usedFullRebuild: true } : {}) };
  });
}
