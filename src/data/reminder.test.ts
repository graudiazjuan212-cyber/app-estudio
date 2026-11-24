import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, dump, testDb } from '../../tests/fixtures/data/helpers.ts';
import { reminderCases } from '../../tests/fixtures/data/backup.ts';
import type { StudyDb } from './db.ts';
import { backupReminderDue, getLastBackup, markBackupDone } from './reminder.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it.each(reminderCases)('reminder for %s at %s with attempts %s is %s', (last, now, hasAttempts, expected) => {
  expect(backupReminderDue(last, now, hasAttempts)).toBe(expected);
});
it('reads absent metadata and records backup completion explicitly', async () => {
  expect(await getLastBackup(db)).toBeNull();
  await markBackupDone(db, context.now);
  expect(await getLastBackup(db)).toBe(context.now);
});
it('rejects an invalid completion instant without overwriting previous metadata', async () => {
  await markBackupDone(db, context.now);
  const before = await dump(db);
  await expect(markBackupDone(db, 'invalid')).rejects.toThrow('instante');
  expect(await dump(db)).toEqual(before);
});
it('treats unrecognised stored metadata as missing', async () => {
  await db.meta.put({ key: 'lastBackupAt', value: 42 });
  expect(await getLastBackup(db)).toBeNull();
});
