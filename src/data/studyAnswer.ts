import { itemFingerprint } from '../domain/pack/index.ts';
import { fingerprintConfig, studyConfig } from '../config.ts';
import { submissionOutcome, studyDay } from '../domain/study/index.ts';
import type { BlockStatus, Submission } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import { readBlockDayProgress } from './dayProgress.ts';
import type { BlockDayProgress } from '../domain/study/index.ts';
import { recordAttempt } from './attempts.ts';
export interface AnswerResult { status: 'saved' | 'duplicate' | 'already-answered' | 'changed'; correct: boolean | null; blockStatus: BlockStatus | null; dayProgress: BlockDayProgress | null }
export interface SubmitAnswerInput {
  fingerprint: string; sessionId: string; itemId: string; attemptId: string; submission: Submission; durationMs: number;
}
export async function submitAnswer(db: StudyDb, input: SubmitAnswerInput, ctx: DataContext): Promise<AnswerResult> {
  if (typeof input.fingerprint !== 'string' || fingerprintConfig.pattern.exec(input.fingerprint)?.[0] !== input.fingerprint)
    throw new Error('La huella de la pregunta no es válida. Vuelve a cargar la sesión.');
  if (!Number.isInteger(input.durationMs) || input.durationMs < 0) throw new Error('La duración no es válida.');
  if (!input.attemptId) throw new Error('Falta el identificador del intento.');
  return db.transaction('rw', [db.sessions, db.items, db.chapters, db.blocks, db.attempts, db.itemState, db.blockState], async () => {
    const session = await db.sessions.get(input.sessionId);
    const item = await db.items.get(input.itemId);
    if (!session || !item || item.archived || item.subjectId !== session.subjectId || !session.itemIds.includes(item.id))
      throw new Error('La pregunta no pertenece a esta sesión o ya no está disponible.');
    const previous = await db.attempts.get(input.attemptId);
    if (previous && (previous.sessionId !== session.id || previous.itemId !== item.id))
      throw new Error('El identificador del intento pertenece a otra respuesta.');
    const progress = () => readBlockDayProgress(db, item.subjectId, item.blockId, ctx);
    if (previous) return { status: 'duplicate', dayProgress: await progress(), correct: previous.tipo === 'info' ? null : previous.correct,
      blockStatus: (await db.blockState.get(previous.blockId))?.status ?? null };
    const answered = await db.attempts.where('sessionId').equals(session.id).filter(a => a.itemId === item.id).first();
    if (answered) return { status: 'already-answered', dayProgress: await progress(), correct: answered.tipo === 'info' ? null : answered.correct, blockStatus: null };
    if (itemFingerprint(item.data) !== input.fingerprint) return { status: 'changed', dayProgress: null, correct: null, blockStatus: null };
    const outcome = submissionOutcome(item.data, input.submission);
    if (!outcome.ok) throw new Error(outcome.reason);
    if (session.endedAt !== null) throw new Error('La sesión ya ha terminado.');
    const chapter = await db.chapters.get(item.chapterId);
    if (!chapter) throw new Error('El capítulo no está disponible.');
    const result = await recordAttempt(db, { attemptId: input.attemptId, sessionId: session.id,
      itemId: item.id, itemGen: item.itemGen, subjectId: item.subjectId, chapterId: item.chapterId,
      blockId: item.blockId, tipo: item.tipo, at: ctx.now, studyDay: studyDay(ctx.now, ctx.tz), tz: ctx.tz,
      correct: outcome.correct, dontKnow: outcome.dontKnow, confidence: outcome.confidence, rating: outcome.rating,
      durationMs: Math.min(input.durationMs, studyConfig.maxAttemptMs), packVersion: chapter.version,
      schedulerVersion: studyConfig.schedulerVersion }, ctx);
    return { status: result.status, dayProgress: await progress(), correct: item.tipo === 'info' ? null : outcome.correct,
      blockStatus: result.blockState?.status ?? null };
  });
}
