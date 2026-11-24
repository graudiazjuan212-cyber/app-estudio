import type { StudyDb } from './db.ts';

export function readProgressAttempts(db: StudyDb, subjectId: string) {
  return db.attempts.where('subjectId').equals(subjectId).toArray();
}
