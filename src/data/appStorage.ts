import type { StudyDb } from './db.ts';
import { requestPersistence, storageStatus } from './storage.ts';
import type { StorageLike } from './storage.ts';

export async function getOpenSessions(db: StudyDb) {
  return (await db.sessions.toArray()).filter(session => session.endedAt === null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id));
}
export async function getAppStorageStatus(db: StudyDb, nav: { storage?: StorageLike } | undefined) {
  const persistence = await requestPersistence(nav?.storage);
  return { ...await storageStatus(nav?.storage), persistence, openSessions: await getOpenSessions(db) };
}
