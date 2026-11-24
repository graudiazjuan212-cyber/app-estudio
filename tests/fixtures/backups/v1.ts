import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import real from './v1-real.json';

// Frozen published v1 schema. Do not derive this from studyVersions.
export const v1Stores = {
  subjects: 'id', chapters: 'id, subjectId', blocks: 'id, chapterId, subjectId',
  items: 'id, blockId, chapterId, subjectId, archived, metadataKey', packs: 'key, [subjectId+chapterId]',
  attempts: 'attemptId, itemId, subjectId, studyDay, sessionId, at, [subjectId+studyDay]',
  itemState: 'itemId', blockState: 'blockId, subjectId', sessions: 'id, subjectId, startedAt',
  settings: 'key', snapshots: '++id', meta: 'key',
};
export const realContext = { now: real.createdAt, tz: 'Europe/Madrid' };
export const realText = JSON.stringify(real);
export async function seedPublishedV1(name: string, patched = false): Promise<void> {
  const db = new Dexie(name);
  db.version(1).stores(v1Stores);
  await db.open();
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const [table, rows] of Object.entries(real.data)) await db.table(table).bulkAdd(rows);
      await db.table('items').toCollection().modify((row: {
        subjectId: string; order: number; id: string; blockId: string; tipo: string;
        itemGen: number; archived: boolean; relaciona: boolean; metadataKey?: (string | number)[];
      }) => { row.metadataKey = [row.subjectId, row.order, row.id, row.blockId, row.tipo, row.itemGen,
        Number(row.archived), Number(row.relaciona)]; });
      await db.table('meta').bulkPut([{ key: 'schemaVersion', value: 1 }, { key: 'schedulerVersion', value: 1 }]);
    });
  } finally { db.close(); }
  if (patched) await patchPublishedV1(name);
}
export async function patchPublishedV1(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 11);
    request.onerror = () => { reject(request.error ?? new Error('Open failed')); };
    request.onsuccess = () => { request.result.close(); resolve(); };
  });
}
