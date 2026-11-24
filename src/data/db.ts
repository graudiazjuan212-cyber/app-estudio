import { installItemMetadata } from './itemMetadata.ts';
import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import type { Attempt, ItemState } from '../domain/study/index.ts';
import type { BlockRow, BlockStateRow, ChapterRow, DbVersion, ItemRow, PackRow,
  SessionRow, SnapshotRow, SubjectRow, ValueRow } from './schema.ts';

export class StudyDb extends Dexie {
  declare subjects: Table<SubjectRow, string>;
  declare chapters: Table<ChapterRow, string>;
  declare blocks: Table<BlockRow, string>;
  declare items: Table<ItemRow, string>;
  declare packs: Table<PackRow, string>;
  declare attempts: Table<Attempt, string>;
  declare itemState: Table<ItemState, string>;
  declare blockState: Table<BlockStateRow, string>;
  declare sessions: Table<SessionRow, string>;
  declare settings: Table<ValueRow, string>;
  declare snapshots: Table<SnapshotRow, number>;
  declare meta: Table<ValueRow, string>;
}
export function defineDb(name: string, versions: DbVersion[]): StudyDb {
  const db = new StudyDb(name, { indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange });
  for (const version of versions) {
    const declared = db.version(version.version).stores(version.stores);
    if (version.upgrade) declared.upgrade(version.upgrade);
  }
  installItemMetadata(db);
  return db;
}
