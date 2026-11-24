import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { changedBackup, requiredRow } from '../../tests/fixtures/data/backup.ts';
import { context, dump, testDb } from '../../tests/fixtures/data/helpers.ts';
import type { StudyDb } from './db.ts';
import { restoreBackup } from './backup.ts';
import type { Backup } from './backupSchema.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); expect((await restoreBackup(db, changedBackup(), context)).status).toBe('restored'); });
afterEach(async () => { await db.delete(); });

type Session = Backup['data']['sessions'][number];
function session(id: string, kind: Session['kind'], subjectId: string): Session {
  return { id, subjectId, kind, chapterId: null, startedAt: '2026-11-24T09:00:00.000Z', endedAt: null,
    itemIds: [], minutes: 10, percentBefore: {}, result: null };
}
function practiceRow(backup: Backup, sessionId: string) {
  const { schedulerVersion, ...rest } = requiredRow(backup.data.attempts);
  void schedulerVersion;
  return { ...rest, attemptId: 'practice-row', sessionId };
}
it('rejects a normal attempt that points at a practice session, without changing anything', async () => {
  const before = await dump(db);
  const bad = changedBackup(b => {
    const first = requiredRow(b.data.attempts);
    b.data.sessions.push(session('free', 'practice', first.subjectId));
    first.sessionId = 'free';
  });
  const result = await restoreBackup(db, bad, context);
  expect(result.status).toBe('rejected');
  if (result.status === 'rejected') expect(result.message).toContain('práctica libre');
  expect(await dump(db)).toEqual(before);
});
it('rejects a practice answer that points at a normal session, without changing anything', async () => {
  const before = await dump(db);
  const bad = changedBackup(b => {
    const first = requiredRow(b.data.attempts);
    b.data.sessions.push(session('normal', 'study', first.subjectId));
    b.data.practiceAttempts = [practiceRow(b, 'normal')];
  });
  const result = await restoreBackup(db, bad, context);
  expect(result.status).toBe('rejected');
  if (result.status === 'rejected') expect(result.message).toContain('no es de práctica libre');
  expect(await dump(db)).toEqual(before);
});
it('accepts consistent practice data and tolerates historical sessions that no longer exist', async () => {
  const good = changedBackup(b => {
    const first = requiredRow(b.data.attempts);
    b.data.sessions.push(session('free', 'practice', first.subjectId));
    b.data.practiceAttempts = [practiceRow(b, 'free'), { ...practiceRow(b, 'gone'), attemptId: 'practice-old' }];
  });
  expect((await restoreBackup(db, good, context)).status).toBe('restored');
  expect(await db.practiceAttempts.count()).toBe(2);
});
