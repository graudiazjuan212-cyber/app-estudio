import { buildProgressExport, progressFileName } from '../domain/progress/export.ts';
import { studyDay } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import { loadCatalog } from './catalog.ts';

export type ProgressResult = { status: 'ok'; json: string; fileName: string } |
  { status: 'empty'; message: string } | { status: 'error'; message: string };
export async function exportProgress(db: StudyDb, subjectId: string, ctx: DataContext): Promise<ProgressResult> {
  try {
    return await db.transaction('r', [db.subjects, db.chapters, db.blocks, db.items,
      db.attempts, db.sessions, db.itemState], async (): Promise<ProgressResult> => {
      if (!await db.subjects.get(subjectId)) return { status: 'empty', message: 'No encuentro esta asignatura.' };
      const catalog = await loadCatalog(db, subjectId);
      for (const chapter of await db.chapters.where('subjectId').equals(subjectId).toArray()) {
        const entry = catalog.chapters.get(chapter.id);
        if (entry) catalog.chapters.set(chapter.id, { ...entry, ...chapter });
      }
      const progress = buildProgressExport({ subjectId, catalog,
        attempts: await db.attempts.where('subjectId').equals(subjectId).toArray(),
        sessions: await db.sessions.where('subjectId').equals(subjectId).toArray(),
        itemStates: new Map((await db.itemState.toArray()).map(s => [s.itemId, s])), ...ctx });
      return { status: 'ok', json: `${JSON.stringify(progress, null, 2)}\n`,
        fileName: progressFileName(subjectId, studyDay(ctx.now, ctx.tz)) };
    });
  } catch (error) {
    return { status: 'error', message: `No se pudo exportar el progreso: ${error instanceof Error ? error.message : 'error de lectura'}` };
  }
}
