import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, dump, packText, session, testDb } from '../../tests/fixtures/data/helpers.ts';
import { backupContext, dataAndCaches, expectedCounts, exportContext, seedBackup } from '../../tests/fixtures/data/backup.ts';
import type { StudyDb } from './db.ts';
import { exportBackup, listSnapshots, restoreBackup, undoRestore } from './backup.ts';
import { backupSchema } from './backupSchema.ts';
import { importPackText } from './importPack.ts';
import { startSession, finishSession } from './sessions.ts';

let db: StudyDb;
let target: StudyDb;
beforeEach(async () => { db = await testDb(); target = await testDb(); await seedBackup(db); });
afterEach(async () => { await db.delete(); await target.delete(); });

it('exports a coherent deterministic backup without writing metadata', async () => {
  const before = await dump(db);
  const first = await exportBackup(db, exportContext);
  expect(first).toEqual(await exportBackup(db, exportContext));
  expect(first.counts).toEqual(expectedCounts);
  expect(first.fileName).toBe('backup_estudio_2026-11-24.json');
  const parsed = backupSchema.parse(JSON.parse(first.json) as unknown);
  expect(Object.keys(parsed.data).sort()).toEqual(Object.keys(expectedCounts).sort());
  for (const key of ['itemState', 'blockState', 'snapshots', 'meta']) expect(first.json).not.toContain(`"${key}":`);
  expect(await dump(db)).toEqual(before);
});
it('round trips data, settings, sessions and rebuilt caches to an empty database', async () => {
  await db.settings.put({ key: 'preferences', value: { goal: 10, nested: { enabled: true } } });
  await startSession(db, session);
  await finishSession(db, session.id, backupContext.now, { correct: 3, total: 4 });
  const { json } = await exportBackup(db, exportContext);
  expect((await restoreBackup(target, json, backupContext)).status).toBe('restored');
  expect(await dataAndCaches(target)).toEqual(await dataAndCaches(db));
  expect(await target.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 2 });
});
it('keeps every pack version and every historical attempt', async () => {
  await importPackText(db, packText('mat-ejemplo-c01-v2'), backupContext);
  const { json } = await exportBackup(db, exportContext);
  const backup = backupSchema.parse(JSON.parse(json) as unknown);
  expect(backup.data.packs).toHaveLength(3);
  expect(backup.data.attempts).toHaveLength(12);
  expect((await restoreBackup(target, json, backupContext)).status).toBe('restored');
  expect(await dataAndCaches(target)).toEqual(await dataAndCaches(db));
});
it('snapshots the exact previous state and lists metadata without JSON', async () => {
  await importPackText(target, packText(), backupContext);
  const before = await dataAndCaches(target);
  const previous = await exportBackup(target, exportContext);
  expect((await restoreBackup(target, (await exportBackup(db, exportContext)).json, backupContext)).status).toBe('restored');
  const snapshots = await listSnapshots(target);
  expect(snapshots).toEqual([{ id: 1, createdAt: backupContext.now, reason: 'before-restore', counts: previous.counts }]);
  const stored = await target.snapshots.get(1);
  expect(stored).toBeDefined();
  if (!stored) throw new Error('Missing snapshot');
  expect(backupSchema.parse(JSON.parse(stored.json) as unknown).data)
    .toEqual(backupSchema.parse(JSON.parse(previous.json) as unknown).data);
  expect((await restoreBackup(db, stored.json, backupContext)).status).toBe('restored');
  expect(await dataAndCaches(db)).toEqual(before);
});
it('undoes repeatedly in both directions and only prunes snapshots beyond three', async () => {
  await importPackText(target, packText(), backupContext);
  const b = await dataAndCaches(target);
  const a = await dataAndCaches(db);
  await restoreBackup(target, (await exportBackup(db, exportContext)).json, backupContext);
  for (let step = 0; step < 6; step++) {
    expect((await undoRestore(target, backupContext)).status).toBe('restored');
    expect(await dataAndCaches(target)).toEqual(step % 2 === 0 ? b : a);
    expect(await target.snapshots.count()).toBe(Math.min(step + 2, 3));
    expect((await exportBackup(target, exportContext)).json).not.toContain('"snapshots":');
  }
  expect(await target.snapshots.orderBy('id').primaryKeys()).toEqual([5, 6, 7]);
});
it('rejects undo without a snapshot without writing anything', async () => {
  const before = await dump(target);
  expect(await undoRestore(target, context)).toEqual({ status: 'rejected', message: 'No hay nada que deshacer' });
  expect(await dump(target)).toEqual(before);
});
it('preserves stored study days with a different restore clock and timezone', async () => {
  const { json } = await exportBackup(db, exportContext);
  expect((await restoreBackup(target, json, { now: '2026-12-01T00:00:00Z', tz: 'Pacific/Honolulu' })).status).toBe('restored');
  expect(await target.attempts.toArray()).toEqual(await db.attempts.toArray());
  expect(await target.itemState.toArray()).toEqual(await db.itemState.toArray());
});
