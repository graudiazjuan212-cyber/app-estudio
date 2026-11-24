import { blockDayProgress, studyDay } from '../domain/study/index.ts';
import type { BlockDayProgress } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import { loadMetadataCatalog } from './catalog.ts';

/** Called inside the caller's transaction, after the attempt and cached state are saved. */
export async function readBlockDayProgress(db: StudyDb, subjectId: string, blockId: string, ctx: DataContext): Promise<BlockDayProgress | null> {
  const state = await db.blockState.get(blockId);
  if (state?.locked || state?.status === 'dominado' || state?.status === 'graduado') return null;
  const catalog = await loadMetadataCatalog(db, subjectId);
  const block = catalog.blocks.get(blockId);
  if (!block) return null;
  const today = studyDay(ctx.now, ctx.tz);
  const attempts = await db.attempts.where('[subjectId+studyDay]').equals([subjectId, today]).toArray();
  return blockDayProgress({ block, catalog, attempts, today, state });
}
