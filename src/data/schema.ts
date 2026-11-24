import type { Transaction } from 'dexie';
import type { Item } from '../domain/pack/index.ts';
import type { BlockState } from '../domain/study/index.ts';

export interface SubjectRow { id: string; nombre: string }
export interface ChapterRow { id: string; subjectId: string; numero: number; titulo: string; version: number }
export interface BlockRow {
  id: string; subjectId: string; chapterId: string; titulo: string; peso: 1 | 3 | 5;
  requiere: string[]; order: number; archived: boolean;
}
export interface ItemRow {
  id: string; subjectId: string; chapterId: string; blockId: string; tipo: Item['tipo'];
  itemGen: number; archived: boolean; relaciona: boolean; order: number; data: Item; metadataKey?: ItemMetadataKey;
}
export type ItemMetadataKey = [subjectId: string, order: number, id: string, blockId: string,
  tipo: Item['tipo'], itemGen: number, archived: number, relaciona: number];
export interface PackRow {
  key: string; subjectId: string; chapterId: string; version: number; importedAt: string; json: string;
}
export type BlockStateRow = BlockState & { subjectId: string };
export interface SessionRow {
  id: string; subjectId: string; kind: 'study' | 'review' | 'exam' | 'practice'; chapterId: string | null;
  startedAt: string; endedAt: string | null; itemIds: string[]; minutes: number;
  percentBefore: Record<string, number>; result: { correct: number; total: number } | null;
}
export interface ValueRow { key: string; value: unknown }
export interface SnapshotRow { id?: number; createdAt: string; reason: string; json: string }
export interface DbVersion {
  version: number; stores: Record<string, string | null>; upgrade?: (tx: Transaction) => Promise<void>;
}
export const studyVersions: DbVersion[] = [{ version: 1, stores: {
  subjects: 'id', chapters: 'id, subjectId', blocks: 'id, chapterId, subjectId',
  items: 'id, blockId, chapterId, subjectId, archived, metadataKey', packs: 'key, [subjectId+chapterId]',
  attempts: 'attemptId, itemId, subjectId, studyDay, sessionId, at, [subjectId+studyDay]',
  itemState: 'itemId', blockState: 'blockId, subjectId', sessions: 'id, subjectId, startedAt',
  settings: 'key', snapshots: '++id', meta: 'key',
} }, { version: 2, stores: {
  practiceAttempts: 'attemptId, itemId, subjectId, studyDay, sessionId, [subjectId+studyDay]',
} }];
