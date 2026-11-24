import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { attempt, context, dump, session, testDb } from '../../tests/fixtures/data/helpers.ts';
import type { StudyDb } from './db.ts';
import { finishSession, listOpenSessions, sessionAttempts, startSession } from './sessions.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it('round trips sessions, filters subjects and sorts newest first', async () => {
  await startSession(db, session);
  await startSession(db, { ...session, id: 'later', startedAt: '2026-11-25T10:00:00.000Z' });
  await startSession(db, { ...session, id: 'other', subjectId: 'other' });
  expect((await listOpenSessions(db, 'ejmat')).map(s => s.id)).toEqual(['later', 'session']);
  expect(await db.sessions.get('session')).toEqual({ ...session, endedAt: null, result: null });
  await finishSession(db, 'session', context.now, { correct: 1, total: 2 });
  expect((await listOpenSessions(db, 'ejmat')).map(s => s.id)).toEqual(['later']);
});
it('rejects duplicate session ids without changes', async () => {
  await startSession(db, session);
  const before = await dump(db);
  await expect(startSession(db, session)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('finishes idempotently and accepts a null result', async () => {
  await startSession(db, session);
  await finishSession(db, session.id, context.now, null);
  const before = await dump(db);
  await finishSession(db, session.id, '2026-11-25T10:00:00.000Z', { correct: 1, total: 1 });
  expect(await dump(db)).toEqual(before);
});
it('rejects finishing a missing session without changes', async () => {
  const before = await dump(db);
  await expect(finishSession(db, 'missing', context.now, null)).rejects.toThrow('no existe');
  expect(await dump(db)).toEqual(before);
});
it('filters attempts by session and orders by instant then id', async () => {
  const a = attempt({ attemptId: 'a' });
  const b = attempt({ attemptId: 'b' });
  const later = attempt({ attemptId: 'c', at: '2026-11-25T10:00:00.000Z', studyDay: '2026-11-25' });
  await db.attempts.bulkAdd([later, b, a, attempt({ attemptId: 'other', sessionId: 'other' })]);
  expect(await sessionAttempts(db, 'session')).toEqual([a, b, later]);
  expect(await sessionAttempts(db, 'missing')).toEqual([]);
});
