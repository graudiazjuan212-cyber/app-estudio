import { rebuildFromAttempts, studyDay } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import { itemMetadataKey } from './itemMetadata.ts';
import { loadCatalog } from './catalog.ts';

export interface DataContext { now: string; tz: string }
export async function rebuildCache(db: StudyDb, ctx: DataContext): Promise<{ items: number; blocks: number; skipped: number }> {
  return db.transaction('rw', [db.items, db.blocks, db.chapters, db.attempts, db.itemState, db.blockState], async () => {
    // Repair the derived covering index too, without changing question content or history.
    await db.items.toCollection().modify(row => { row.metadataKey = itemMetadataKey(row); });
    const catalog = await loadCatalog(db);
    const derived = rebuildFromAttempts(await db.attempts.toArray(), catalog, studyDay(ctx.now, ctx.tz));
    await db.itemState.clear();
    await db.blockState.clear();
    await db.itemState.bulkPut([...derived.items.values()]);
    await db.blockState.bulkPut([...derived.blocks.values()].map(state => ({ ...state,
      subjectId: catalog.blocks.get(state.blockId)?.subjectId ?? '' })));
    return { items: derived.items.size, blocks: derived.blocks.size, skipped: derived.skipped.length };
  });
}
