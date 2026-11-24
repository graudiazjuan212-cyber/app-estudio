import { allBlockStates, chapterPercent, currentStreak, dailyGoalReached, examPassed,
  secondsStudiedToday, studyDay } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import type { SessionRow } from './schema.ts';
import { loadCatalog } from './catalog.ts';
import { getSettings } from './settings.ts';
import { finishSession, sessionAttempts } from './sessions.ts';
export interface SessionSummary {
  sessionId: string; kind: SessionRow['kind']; correct: number; total: number; blindSpotsCreated: number;
  chapterChanges: { chapterId: string; titulo: string; before: number; after: number }[];
  streak: number; secondsToday: number; goalReached: boolean; exam: { passed: boolean } | null;
}
async function summarize(db: StudyDb, sessionId: string, ctx: DataContext): Promise<SessionSummary> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('La sesión no existe.');
  const attempts = (await sessionAttempts(db, sessionId)).filter(a => a.tipo !== 'info');
  const total = attempts.length;
  const correct = attempts.filter(a => a.correct).length;
  const all = await db.attempts.toArray();
  const today = studyDay(ctx.now, ctx.tz);
  const catalog = await loadCatalog(db, session.subjectId);
  const states = allBlockStates(catalog, all.filter(a => a.subjectId === session.subjectId), today);
  const chapterChanges: SessionSummary['chapterChanges'] = [];
  for (const chapter of await db.chapters.where('subjectId').equals(session.subjectId).toArray()) {
    const entry = catalog.chapters.get(chapter.id);
    const after = entry ? chapterPercent(entry, catalog, states) : 0;
    const before = session.percentBefore[chapter.id] ?? 0;
    if (before !== after) chapterChanges.push({ chapterId: chapter.id, titulo: chapter.titulo, before, after });
  }
  const secondsToday = secondsStudiedToday(all, today);
  return { sessionId, kind: session.kind, correct, total,
    blindSpotsCreated: attempts.filter(a => !a.correct && !a.dontKnow && a.confidence === 'seguro').length,
    chapterChanges, streak: currentStreak(all.map(a => a.studyDay), today), secondsToday,
    goalReached: dailyGoalReached(secondsToday, (await getSettings(db)).dailyGoalMinutes),
    exam: session.kind === 'exam' ? { passed: examPassed(correct, total) } : null };
}
export async function getSessionSummary(db: StudyDb, sessionId: string, ctx: DataContext): Promise<SessionSummary> {
  return db.transaction('r', [db.sessions, db.attempts, db.chapters, db.blocks, db.items, db.settings],
    () => summarize(db, sessionId, ctx));
}
export async function finishStudySession(db: StudyDb, sessionId: string, ctx: DataContext): Promise<SessionSummary> {
  return db.transaction('rw', [db.sessions, db.attempts, db.chapters, db.blocks, db.items, db.settings], async () => {
    const summary = await summarize(db, sessionId, ctx);
    await finishSession(db, sessionId, ctx.now, { correct: summary.correct, total: summary.total });
    return summary;
  });
}
