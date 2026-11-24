import { practiceConfig, routerConfig, studyConfig, fingerprintConfig } from '../config.ts';
import { buildPracticeSession, pendingBlindSpots, studyDay, previousDay, submissionOutcome, validateAttempt } from '../domain/study/index.ts';
import type { PracticeAttempt } from '../domain/study/index.ts';
import { itemFingerprint } from '../domain/pack/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import type { StartStudyInput, StartStudyResult } from './study.ts';
import type { SubmitAnswerInput } from './studyAnswer.ts';
import { loadMetadataCatalog } from './catalog.ts';
import { startSession } from './sessions.ts';

export async function startPracticeSession(db: StudyDb, input: Omit<StartStudyInput, 'kind' | 'chapterId'>,
  ctx: DataContext): Promise<StartStudyResult> {
  try {
    return await db.transaction('rw', [db.sessions, db.subjects, db.chapters, db.blocks, db.items,
      db.attempts, db.practiceAttempts, db.itemState, db.blockState], async () => {
      if (routerConfig.idPattern.exec(input.sessionId)?.[0] !== input.sessionId ||
        routerConfig.idPattern.exec(input.subjectId)?.[0] !== input.subjectId || !Number.isSafeInteger(input.seed) ||
        !studyConfig.sessionMinutesOptions.some(m => m === input.minutes)) throw new Error('Los datos de la sesión no son válidos.');
      if (await db.sessions.get(input.sessionId)) throw new Error('La sesión ya existe.');
      if (!await db.subjects.get(input.subjectId)) throw new Error('La asignatura no existe.');
      const today = studyDay(ctx.now, ctx.tz);
      let since = today;
      for (let i = 1; i < practiceConfig.windowDays; i++) since = previousDay(since);
      const catalog = await loadMetadataCatalog(db, input.subjectId);
      const attempts = await db.attempts.where('[subjectId+studyDay]')
        .between([input.subjectId, since], [input.subjectId, today], true, true).toArray();
      const practiceAttempts = await db.practiceAttempts.where('[subjectId+studyDay]')
        .between([input.subjectId, since], [input.subjectId, today], true, true).toArray();
      // Old history is needed for unresolved blind spots and historical eligibility only.
      const historical = await db.attempts.where('[subjectId+studyDay]')
        .between([input.subjectId, ''], [input.subjectId, since], true, false).toArray();
      const normalHistory = [...historical, ...attempts];
      const attemptedItemIds = new Set(normalHistory.map(a => a.itemId));
      const blocks = new Map((await db.blockState.where('subjectId').equals(input.subjectId).toArray()).map(b => [b.blockId, b]));
      const derived = { blocks, items: new Map(), blindSpots: pendingBlindSpots(catalog, normalHistory), skipped: [] };
      const plan = buildPracticeSession({ ...input, ...ctx, catalog, derived, attempts, practiceAttempts, attemptedItemIds });
      if (!plan.itemIds.length) return { status: 'empty', message: practiceConfig.empty };
      await startSession(db, { id: input.sessionId, subjectId: input.subjectId, kind: 'practice', chapterId: null,
        startedAt: ctx.now, minutes: input.minutes, itemIds: plan.itemIds, percentBefore: {} });
      return { status: 'started', sessionId: input.sessionId };
    });
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se ha podido crear la sesión.' };
  }
}
export interface PracticeAnswerResult { status: 'saved' | 'duplicate' | 'already-answered' | 'changed'; correct: boolean | null }
export async function submitPracticeAnswer(db: StudyDb, input: SubmitAnswerInput, ctx: DataContext): Promise<PracticeAnswerResult> {
  if (typeof input.fingerprint !== 'string' || fingerprintConfig.pattern.exec(input.fingerprint)?.[0] !== input.fingerprint)
    throw new Error('La huella de la pregunta no es válida. Vuelve a cargar la sesión.');
  if (!Number.isInteger(input.durationMs) || input.durationMs < 0) throw new Error('La duración no es válida.');
  if (!input.attemptId) throw new Error('Falta el identificador del intento.');
  return db.transaction('rw', [db.sessions, db.items, db.chapters, db.practiceAttempts], async () => {
    const session = await db.sessions.get(input.sessionId);
    const item = await db.items.get(input.itemId);
    if (session?.kind !== 'practice' || !item || item.archived || item.tipo === 'info' ||
      item.subjectId !== session.subjectId || !session.itemIds.includes(item.id))
      throw new Error('La pregunta no pertenece a esta sesión o ya no está disponible.');
    const previous = await db.practiceAttempts.get(input.attemptId);
    if (previous?.sessionId !== undefined && (previous.sessionId !== session.id || previous.itemId !== item.id))
      throw new Error('El identificador del intento pertenece a otra respuesta.');
    if (previous) return { status: 'duplicate', correct: previous.correct };
    if (session.endedAt !== null) throw new Error('La sesión ya ha terminado.');
    const answered = await db.practiceAttempts.where('sessionId').equals(session.id).filter(a => a.itemId === item.id).first();
    if (answered) return { status: 'already-answered', correct: answered.correct };
    if (itemFingerprint(item.data) !== input.fingerprint) return { status: 'changed', correct: null };
    const outcome = submissionOutcome(item.data, item.tipo === 'flashcard' && input.submission.kind === 'dontKnow'
      ? { kind: 'flashcard', rating: 'otra' } : input.submission);
    if (!outcome.ok) throw new Error(outcome.reason);
    const chapter = await db.chapters.get(item.chapterId);
    if (!chapter) throw new Error('El capítulo no está disponible.');
    const attempt: PracticeAttempt = { attemptId: input.attemptId, sessionId: session.id,
      itemId: item.id, itemGen: item.itemGen, subjectId: item.subjectId, chapterId: item.chapterId,
      blockId: item.blockId, tipo: item.tipo, at: ctx.now, studyDay: studyDay(ctx.now, ctx.tz), tz: ctx.tz,
      correct: outcome.correct, dontKnow: outcome.dontKnow, confidence: outcome.confidence, rating: outcome.rating,
      durationMs: Math.min(input.durationMs, studyConfig.maxAttemptMs), packVersion: chapter.version };
    const errors = validateAttempt({ ...attempt, schedulerVersion: studyConfig.schedulerVersion });
    if (errors.length) throw new Error(`Intento de práctica inválido: ${errors.join('; ')}`);
    await db.practiceAttempts.add(attempt);
    return { status: 'saved', correct: outcome.correct };
  });
}
