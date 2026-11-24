import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { dataConfig } from '../config.ts';
import { changedBackup, requiredRow } from '../../tests/fixtures/data/backup.ts';
import { historicalChanges, integrityRejections, schedulerRejections } from '../../tests/fixtures/data/backupIntegrity.ts';
import { context, dump, testDb } from '../../tests/fixtures/data/helpers.ts';
import type { StudyDb } from './db.ts';
import { restoreBackup } from './backup.ts';
import { backupSchema } from './backupSchema.ts';
import { validateBackupIntegrity } from './backupIntegrity.ts';

let db: StudyDb;
beforeEach(async () => {
  db = await testDb();
  expect((await restoreBackup(db, changedBackup(), context)).status).toBe('restored');
});
afterEach(async () => { await db.delete(); });

it.each(integrityRejections)('rejects %s atomically and accepts its unmodified control', async (_, change) => {
  const before = await dump(db);
  const result = await restoreBackup(db, changedBackup(change), context);
  expect(result.status).toBe('rejected');
  if (result.status === 'rejected') expect(result.message.length).toBeGreaterThan(0);
  expect(await dump(db)).toEqual(before);
  expect((await restoreBackup(db, changedBackup(), context)).status).toBe('restored');
});
it.each(schedulerRejections)('rejects scheduler %s with its specific message', async (version, message) => {
  const before = await dump(db);
  expect(await restoreBackup(db, changedBackup(b => { b.schedulerVersion = version; }), context))
    .toEqual({ status: 'rejected', message });
  expect(await dump(db)).toEqual(before);
  expect((await restoreBackup(db, changedBackup(), context)).status).toBe('restored');
});
it.each(historicalChanges)('accepts history: %s', async (_, change) => {
  expect((await restoreBackup(db, changedBackup(change), context)).status).toBe('restored');
});
it('rejects one row over the limit and accepts the exact limit', async () => {
  const base = backupSchema.parse(JSON.parse(changedBackup()) as unknown);
  const count = Object.values(base.data).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
  const original = dataConfig.maxBackupRows;
  try {
    dataConfig.maxBackupRows = count;
    const before = await dump(db);
    const extra = changedBackup(b => { b.data.settings.push({ key: 'extra', value: null }); });
    const result = await restoreBackup(db, extra, context);
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') expect(result.message).toContain('límite');
    expect(await dump(db)).toEqual(before);
    expect((await restoreBackup(db, changedBackup(), context)).status).toBe('restored');
  } finally { dataConfig.maxBackupRows = original; }
});
it('reports the concrete dependency cycle', () => {
  const base = backupSchema.parse(JSON.parse(changedBackup(b => { requiredRow(b.data.blocks).requiere = ['b3']; })) as unknown);
  expect(validateBackupIntegrity(base.data)).toContain('Ciclo de dependencias: b1 → b3 → b2 → b1.');
});
