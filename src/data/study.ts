import { buildSession, buildChapterExam, rebuildFromAttempts, studyDay, chapterPercent, pendingBlindSpots, validateAttempt } from '../domain/study/index.ts';
import type { Catalog } from '../domain/study/index.ts';
import { itemFingerprint } from '../domain/pack/index.ts';
import { routerConfig, studyConfig } from '../config.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import type { SessionRow } from './schema.ts';
import type { Item } from '../domain/pack/index.ts';
import { loadCatalog } from './catalog.ts';
import { startSession, sessionAttempts } from './sessions.ts';

export interface StartStudyInput {
  sessionId: string; subjectId: string; kind: SessionRow['kind']; chapterId: string | null;
  minutes: number; seed: number;
}
export type StartStudyResult = { status: 'started'; sessionId: string }
  | { status: 'empty' | 'error'; message: string };
function chapterCatalog(catalog: Catalog, chapterId: string): Catalog {
  const chapters = new Map([...catalog.chapters].filter(([id]) => id === chapterId));
  const blocks = new Map([...catalog.blocks].filter(([, b]) => b.chapterId === chapterId));
  const items = new Map([...catalog.items].filter(([, i]) => blocks.has(i.blockId)));
  return { chapters, blocks, items };
}
export async function startStudySession(db: StudyDb, input: StartStudyInput, ctx: DataContext): Promise<StartStudyResult> {
  try {
    return await db.transaction('rw', [db.sessions, db.subjects, db.chapters, db.blocks, db.items, db.attempts, db.itemState, db.blockState], async () => {
      if (routerConfig.idPattern.exec(input.sessionId)?.[0] !== input.sessionId ||
        routerConfig.idPattern.exec(input.subjectId)?.[0] !== input.subjectId ||
        !['study', 'review', 'exam'].includes(input.kind) ||
        !Number.isSafeInteger(input.seed)) throw new Error('Los datos de la sesión no son válidos.');
      if (input.kind !== 'exam' && !studyConfig.sessionMinutesOptions.some(minutes => minutes === input.minutes))
        throw new Error('La duración de la sesión debe ser 1, 5, 10, 15 o 30 minutos.');
      if (await db.sessions.get(input.sessionId)) throw new Error('La sesión ya existe.');
      if (!await db.subjects.get(input.subjectId)) throw new Error('La asignatura no existe.');
      const catalog = await loadCatalog(db, input.subjectId);
      if (input.kind !== 'study' && (!input.chapterId || !catalog.chapters.has(input.chapterId)))
        throw new Error('El capítulo no existe en esta asignatura.');
      const attempts = await db.attempts.where('subjectId').equals(input.subjectId).toArray();
      const cachedBlocks = await db.blockState.where('subjectId').equals(input.subjectId).toArray();
      const blocks = new Map(cachedBlocks.map(row => [row.blockId, row]));
      const derived = [...catalog.blocks.keys()].some(id => !blocks.has(id))
        ? rebuildFromAttempts(attempts, catalog, studyDay(ctx.now, ctx.tz))
        : { blocks, items: new Map((await db.itemState.toArray())
          .filter(state => catalog.items.has(state.itemId)).map(state => [state.itemId, state])),
        blindSpots: pendingBlindSpots(catalog, attempts.filter(a => !validateAttempt(a).length &&
          catalog.items.get(a.itemId)?.itemGen === a.itemGen)), skipped: [] };
      const plan = input.kind === 'exam' ? buildChapterExam({ ...input, chapterId: input.chapterId ?? '', catalog })
        : buildSession({ ...input, ...ctx, catalog: input.kind === 'review'
          ? chapterCatalog(catalog, input.chapterId ?? '') : catalog, attempts, derived });
      if (!plan.itemIds.length) return { status: 'empty', message: input.kind === 'study'
        ? 'Hoy no queda nada pendiente en esta asignatura.' : 'Este capítulo no tiene preguntas.' };
      const percentBefore = Object.fromEntries([...catalog.chapters.values()].map(ch =>
        [ch.id, chapterPercent(ch, catalog, derived.blocks)]));
      await startSession(db, { id: input.sessionId, subjectId: input.subjectId, kind: input.kind,
        chapterId: input.chapterId, minutes: input.kind === 'exam' ? studyConfig.defaultSessionMinutes : input.minutes,
        startedAt: ctx.now, itemIds: plan.itemIds, percentBefore });
      return { status: 'started', sessionId: input.sessionId };
    });
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se ha podido crear la sesión.' };
  }
}
export interface SessionRun {
  session: SessionRow;
  items: { id: string; item: Item; fingerprint: string; blockId: string; chapterId: string; itemGen: number }[];
  answered: string[]; nextIndex: number;
}
export async function loadSessionRun(db: StudyDb, sessionId: string): Promise<SessionRun | null> {
  return db.transaction('r', [db.sessions, db.items, db.attempts], async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;
    const rows = await db.items.bulkGet(session.itemIds);
    const items = rows.flatMap(row => row && !row.archived ? [{ id: row.id, item: row.data, fingerprint: itemFingerprint(row.data),
      blockId: row.blockId, chapterId: row.chapterId, itemGen: row.itemGen }] : []);
    const answered = [...new Set((await sessionAttempts(db, sessionId)).map(a => a.itemId))];
    const index = items.findIndex(item => !answered.includes(item.id));
    return { session, items, answered, nextIndex: index < 0 ? items.length : index };
  });
}
export { submitAnswer } from './studyAnswer.ts';
export type { AnswerResult, SubmitAnswerInput } from './studyAnswer.ts';
export { finishStudySession, getSessionSummary } from './studySummary.ts';
export type { SessionSummary } from './studySummary.ts';
