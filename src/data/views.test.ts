import { afterEach, beforeEach, expect, it } from 'vitest';
import { attempt, context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { dueCases, serviceTimes, startInput } from '../../tests/fixtures/data/services.ts';
import type { StudyDb } from './db.ts';
import { getHomeView, getSubjectView } from './views.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';
import { markBackupDone } from './reminder.ts';
import { startStudySession, finishStudySession } from './study.ts';
let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it('returns an empty read-only home and null for an unknown subject', async () => {
  const before = await dump(db);
  expect(await getHomeView(db, context)).toEqual({ subjects: [], hasData: false, streak: 0, secondsToday: 0,
    dailyGoalMinutes: 10, goalReached: false, backupReminder: false, openSession: null });
  expect(await getSubjectView(db, 'missing', context)).toBeNull();
  expect(await dump(db)).toEqual(before);
});
it('shows imported data with no activity', async () => {
  await importPackText(db, packText(), context);
  expect(await getHomeView(db, context)).toMatchObject({ subjects: [{ id: 'ejmat', percent: 0,
    dueToday: 0, lastStudyDay: null }], hasData: true, backupReminder: false });
  const view = await getSubjectView(db, 'ejmat', context);
  expect(view?.chapters.map(ch => [ch.id, ch.numero, ch.hasEvaluables])).toEqual([['ejmat-c01', 1, true]]);
  expect(view?.chapters[0]?.blocks.map(b => [b.id, b.status, b.locked, b.evaluables]))
    .toEqual([['mat-b1', 'pendiente', false, 4], ['mat-b2', 'pendiente', true, 5], ['mat-b3', 'pendiente', true, 4]]);
});
it('uses weights across all blocks, unlocks dependants and computes streak, time and reminders', async () => {
  await importPackText(db, packText(), context);
  for (const [day, at] of [['2026-11-22', '2026-11-22T10:00:00.000Z'], ['2026-11-23', serviceTimes.earlier], ['2026-11-24', context.now]] as const) {
    for (const [itemId, tipo] of [['mat-i3', 'test'], ['mat-i4', 'multi'], ['mat-i5', 'vf']] as const)
      await recordAttempt(db, attempt({ itemId, tipo, attemptId: `${day}-${itemId}`, at, studyDay: day }), context);
    await recordAttempt(db, attempt({ itemId: 'mat-i2', tipo: 'flashcard', rating: 'facil', confidence: null,
      attemptId: `${day}-flash`, at, studyDay: day }), context);
  }
  expect(await getHomeView(db, context)).toMatchObject({ subjects: [{ percent: 11, lastStudyDay: '2026-11-24' }],
    streak: 3, secondsToday: 4, goalReached: false, backupReminder: true });
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks.map(b => [b.status, b.locked]))
    .toEqual([['dominado', false], ['pendiente', false], ['pendiente', true]]);
  await markBackupDone(db, context.now);
  expect((await getHomeView(db, context)).backupReminder).toBe(false);
});
it('counts due cards strictly before cutoff, excluding answered and archived items', async () => {
  await importPackText(db, packText(), context);
  for (const row of dueCases) {
    await recordAttempt(db, attempt({ itemId: row.id, attemptId: row.id, at: serviceTimes.earlier,
      studyDay: '2026-11-23', tipo: row.id === 'mat-i2' ? 'flashcard' : row.id === 'mat-i4' ? 'multi' : 'test',
      rating: row.id === 'mat-i2' ? 'facil' : null, confidence: row.id === 'mat-i2' ? null : 'seguro' }), context);
    const state = await db.itemState.get(row.id);
    if (!state) throw new Error('Missing fixture state');
    await db.itemState.put({ ...state, card: { ...state.card, due: row.due } });
  }
  await db.attempts.add(attempt({ attemptId: 'today', itemId: 'mat-i4', tipo: 'multi' }));
  expect((await getHomeView(db, context)).subjects[0]?.dueToday).toBe(1);
  await db.items.update('mat-i2', { archived: true });
  expect((await getHomeView(db, context)).subjects[0]?.dueToday).toBe(0);
});
it('exposes the newest open session and removes finished sessions', async () => {
  await importPackText(db, packText(), context);
  await startStudySession(db, startInput, context);
  await startStudySession(db, { ...startInput, sessionId: 'newer' }, { ...context, now: serviceTimes.tomorrow });
  expect((await getHomeView(db, context)).openSession?.id).toBe('newer');
  await finishStudySession(db, 'newer', context);
  expect((await getHomeView(db, context)).openSession?.id).toBe('run');
  await finishStudySession(db, 'run', context);
  expect((await getHomeView(db, context)).openSession).toBeNull();
});
it('omits archived blocks after a replacement pack', async () => {
  await importPackText(db, packText(), context);
  await importPackText(db, packText('mat-ejemplo-c01-archived-services'), context);
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks.map(b => b.id)).toEqual(['mat-b1']);
});
it('shows en_curso before mastery', async () => {
  await importPackText(db, packText(), context);
  await recordAttempt(db, attempt(), context);
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks[0]?.status).toBe('en_curso');
});
