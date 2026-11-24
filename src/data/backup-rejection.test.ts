import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { dump, testDb } from '../../tests/fixtures/data/helpers.ts';
import { backupContext, exportContext, seedBackup } from '../../tests/fixtures/data/backup.ts';
import type { StudyDb } from './db.ts';
import { exportBackup, restoreBackup } from './backup.ts';
import { backupSchema } from './backupSchema.ts';
import type { Backup } from './backupSchema.ts';
import type { BackupMigration } from './backupMigrations.ts';

let db: StudyDb;
let json: string;
beforeEach(async () => {
  db = await testDb(); await seedBackup(db);
  json = (await exportBackup(db, exportContext)).json;
  await restoreBackup(db, json, backupContext);
});
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });

function changed(change: (backup: Backup) => void): string {
  const backup = backupSchema.parse(JSON.parse(json) as unknown);
  change(backup);
  return JSON.stringify(backup);
}
it.each(['truncated', 'schema', 'extra', 'attempt', 'item', 'block', 'depth', 'empty', 'duplicate', 'version', 'session', 'nested'])(
  'rejects %s without changing any table or snapshots', async kind => {
    let text = json;
    switch (kind) {
      case 'truncated': text = json.slice(0, -1); break;
      case 'schema': text = json.replace('estudio-backup/1', 'another-app'); break;
      case 'extra': text = JSON.stringify({ ...backupSchema.parse(JSON.parse(json) as unknown), extra: true }); break;
      case 'attempt': text = changed(b => { const a = b.data.attempts[0]; if (a) a.confidence = null; }); break;
      case 'item': text = changed(b => { const a = b.data.attempts[0]; if (a) a.itemId = 'missing'; }); break;
      case 'block': text = changed(b => { const a = b.data.blocks[0]; if (a) a.chapterId = 'missing'; }); break;
      case 'depth': text = json.replace('"settings":[]', '"settings":[{"key":"deep","value":' + '['.repeat(20) + '0' + ']'.repeat(20) + '}]'); break;
      case 'empty': text = ''; break;
      case 'duplicate': text = changed(b => { const a = b.data.attempts[0]; if (a) b.data.attempts.push(a); }); break;
      case 'version': text = changed(b => { b.dbVersion = -1; }); break;
      case 'session': text = changed(b => { b.data.sessions.push({ id: 's', subjectId: 'ejmat', kind: 'study', chapterId: null,
        startedAt: 'invalid', endedAt: null, itemIds: [], minutes: 10, percentBefore: {}, result: null }); }); break;
      case 'nested': text = changed(b => { b.data.settings.push({ key: 'bad', value: null }); });
        text = text.replace('"value":null', '"value":NaN'); break;
    }
    const before = await dump(db);
    const result = await restoreBackup(db, text, backupContext);
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') expect(result.message.length).toBeGreaterThan(0);
    expect(await dump(db)).toEqual(before);
  });
it('rejects a future version with the update message', async () => {
  const before = await dump(db);
  expect(await restoreBackup(db, changed(b => { b.dbVersion = 2; }), backupContext)).toEqual({
    status: 'rejected', message: 'Actualiza la app antes de restaurar esta copia',
  });
  expect(await dump(db)).toEqual(before);
});
it.each(['items', 'attempts', 'snapshot', 'quota', 'cache', 'meta'])('rolls back a failure in %s', async kind => {
  const before = await dump(db);
  const error = kind === 'quota' ? new DOMException('QuotaExceededError', 'QuotaExceededError') : new Error('write failure');
  if (kind === 'items') vi.spyOn(db.items, 'bulkAdd').mockRejectedValueOnce(error);
  if (kind === 'attempts' || kind === 'quota') vi.spyOn(db.attempts, 'bulkAdd').mockRejectedValueOnce(error);
  if (kind === 'snapshot') vi.spyOn(db.snapshots, 'add').mockRejectedValueOnce(error);
  if (kind === 'cache') vi.spyOn(db.itemState, 'bulkAdd').mockRejectedValueOnce(error);
  if (kind === 'meta') vi.spyOn(db.meta, 'bulkPut').mockRejectedValueOnce(error);
  expect((await restoreBackup(db, json, backupContext)).status).toBe('rejected');
  expect(await dump(db)).toEqual(before);
});
it('migrates an old document in memory and leaves the source string unchanged', async () => {
  const backup = backupSchema.parse(JSON.parse(json) as unknown);
  const legacy = { ...backup, dbVersion: 0, oldData: backup.data, data: undefined };
  const text = JSON.stringify(legacy);
  const migrate = vi.fn((input: unknown): unknown => {
    const old = input as { oldData: Backup['data'] };
    return { schema: backup.schema, createdAt: backup.createdAt, dbVersion: 1, schedulerVersion: 1,
      data: { ...old.oldData, settings: [{ key: 'migrated', value: true }] } };
  });
  expect((await restoreBackup(db, text, backupContext, [{ from: 0, to: 1, migrate }])).status).toBe('restored');
  expect(await db.settings.get('migrated')).toEqual({ key: 'migrated', value: true });
  expect(text).toBe(JSON.stringify(legacy));
  expect(migrate).toHaveBeenCalledOnce();
});
it.each(['gap', 'throws', 'invalid', 'cycle', 'ambiguous'])('rejects migration %s atomically', async kind => {
  const text = changed(b => { b.dbVersion = 0; });
  const migrations: BackupMigration[] = kind === 'gap' ? [] : [{ from: 0, to: kind === 'cycle' ? 0 : 1,
    migrate: () => { if (kind === 'throws') throw new Error('migration failure'); return {}; } }];
  if (kind === 'ambiguous') migrations.push({ from: 0, to: 1, migrate: value => value });
  const before = await dump(db);
  expect((await restoreBackup(db, text, backupContext, migrations)).status).toBe('rejected');
  expect(await dump(db)).toEqual(before);
});
