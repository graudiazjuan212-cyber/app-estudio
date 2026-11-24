import { context, packText, sequence } from './helpers.ts';
import type { StudyDb } from '../../../src/data/db.ts';
import { importPackText } from '../../../src/data/importPack.ts';
import { rebuildCache } from '../../../src/data/cache.ts';

export const backupContext = { ...context, now: '2026-11-27T10:00:00.000Z' };
export const exportContext = { now: '2026-11-24T10:00:00Z' };
export const expectedCounts = { subjects: 2, chapters: 2, blocks: 5, items: 24, packs: 2,
  attempts: 12, sessions: 0, settings: 0 };
export const backupTestConfig = { attempts: 20000, performanceMaxMs: 5000 };
export const reminderCases: [string | null, string, boolean, boolean][] = [
  [null, '2026-11-24T10:00:00Z', false, false],
  [null, '2026-11-24T10:00:00Z', true, true],
  ['2026-11-17T11:00:00Z', '2026-11-24T10:00:00Z', true, false],
  ['2026-11-17T10:00:00Z', '2026-11-24T10:00:00Z', true, true],
  ['2026-11-16T10:00:00Z', '2026-11-24T10:00:00Z', false, true],
  ['invalid', '2026-11-24T10:00:00Z', false, true],
  ['2026-11-17T10:00:00Z', 'invalid', false, true],
  [null, 'invalid', false, true],
  ['2026-11-24T10:00:00Z', '2026-11-24T10:00:00Z', true, false],
  ['2026-02-30T10:00:00Z', '2026-03-01T10:00:00Z', false, true],
  ['2026-11-17T10:00:00Z', '2026-11-24', false, true],
  ['2026-10-24T10:00:00+02:00', '2026-10-31T09:00:00+01:00', true, true],
];
export async function seedBackup(db: StudyDb): Promise<void> {
  await importPackText(db, packText(), backupContext);
  await importPackText(db, packText('ioe-ejemplo-c01'), backupContext);
  await db.attempts.bulkAdd(sequence());
  await rebuildCache(db, backupContext);
}
export async function dataAndCaches(db: StudyDb): Promise<Record<string, unknown[]>> {
  const rows: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    if (table.name !== 'meta' && table.name !== 'snapshots') rows[table.name] = await table.toArray() as unknown[];
  }
  return rows;
}
