import type { StudyDb } from './db';
import { requestPersistence } from './storage';
import type { StorageLike } from './storage';
export async function claimPwaNotice(db: StudyDb, key: 'persistAsked' | 'offlineNoticeShown'): Promise<boolean> {
  return db.transaction('rw', db.meta, async () => {
    const row = await db.meta.get(key);
    if (row) {
      if (row.value !== true) throw new Error('La marca de almacenamiento no es válida.');
      return false;
    }
    await db.meta.put({ key, value: true });
    return true;
  });
}
export async function requestFirstPersistence(db: StudyDb, storage: StorageLike | undefined) {
  try {
    if (!await claimPwaNotice(db, 'persistAsked')) return null;
    const result = await requestPersistence(storage);
    await db.meta.put({ key: 'persistResult', value: result });
    return result;
  } catch { return 'denied' as const; }
}
