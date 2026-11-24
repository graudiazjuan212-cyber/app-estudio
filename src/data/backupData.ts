import { dataConfig, studyConfig } from '../config.ts';
import { rebuildFromAttempts, studyDay } from '../domain/study/index.ts';
import type { Catalog } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import { backupSchema } from './backupSchema.ts';
import type { Backup, BackupData } from './backupSchema.ts';

export function backupCounts(data: BackupData): Record<string, number> {
  return Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows?.length ?? 0]));
}
// Sort every object's keys, including arbitrary JSON settings, for a fixed byte representation.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, child]: [string, unknown]) => [key, canonical(child)]));
  return value;
}
export function backupJson(backup: Backup): string { return JSON.stringify(canonical(backup)); }

/** Must run inside the caller's transaction. Dexie returns rows in primary-key order. */
export async function readBackup(db: StudyDb, now: string): Promise<Backup> {
  return backupSchema.parse({ schema: dataConfig.backupSchema, createdAt: now, dbVersion: db.verno,
    schedulerVersion: studyConfig.schedulerVersion, data: {
      subjects: await db.subjects.toArray(), chapters: await db.chapters.toArray(),
      blocks: await db.blocks.toArray(), items: (await db.items.toArray()).map(row => {
        const { metadataKey: derivedKey, ...item } = row;
        void derivedKey;
        return item;
      }), packs: await db.packs.toArray(),
      practiceAttempts: db.tables.some(t => t.name === 'practiceAttempts') ? await db.practiceAttempts.toArray() : undefined,
      attempts: await db.attempts.toArray(), sessions: await db.sessions.toArray(), settings: await db.settings.toArray(),
    } });
}

export function deriveBackup(data: BackupData, ctx: DataContext) {
  const blocks = [...data.blocks].sort((a, b) => a.order - b.order);
  const items = [...data.items].sort((a, b) => a.order - b.order);
  const catalog: Catalog = {
    chapters: new Map(data.chapters.map(row => [row.id, { ...row,
      blockIds: blocks.filter(block => block.chapterId === row.id).map(block => block.id) }])),
    blocks: new Map(blocks.map(row => [row.id, { ...row,
      itemIds: items.filter(item => item.blockId === row.id).map(item => item.id) }])),
    items: new Map(items.map(row => [row.id, row])),
  };
  const derived = rebuildFromAttempts(data.attempts, catalog, studyDay(ctx.now, ctx.tz));
  return { items: [...derived.items.values()], blocks: [...derived.blocks.values()].map(row => ({
    ...row, subjectId: catalog.blocks.get(row.blockId)?.subjectId ?? '',
  })) };
}
