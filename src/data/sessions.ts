import type { Attempt } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { SessionRow } from './schema.ts';

export async function startSession(db: StudyDb, row: Omit<SessionRow, 'endedAt' | 'result'>): Promise<void> {
  await db.sessions.add({ ...row, endedAt: null, result: null });
}
export async function finishSession(db: StudyDb, id: string, endedAt: string, result: SessionRow['result']): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const row = await db.sessions.get(id);
    if (!row) throw new Error('La sesión no existe.');
    if (row.endedAt !== null) return;
    await db.sessions.put({ ...row, endedAt, result });
  });
}
export async function listOpenSessions(db: StudyDb, subjectId: string): Promise<SessionRow[]> {
  return (await db.sessions.where('subjectId').equals(subjectId).toArray())
    .filter(row => row.endedAt === null).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export async function sessionAttempts(db: StudyDb, sessionId: string): Promise<Attempt[]> {
  return (await db.attempts.where('sessionId').equals(sessionId).toArray())
    .sort((a, b) => a.at.localeCompare(b.at) || a.attemptId.localeCompare(b.attemptId));
}
