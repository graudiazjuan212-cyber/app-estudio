import { afterEach, beforeEach, expect, it } from 'vitest';
import { attempt, context, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { firstAnswers, secondContext, startInput, thirdContext } from '../../tests/fixtures/data/services-m5.ts';
import type { StudyDb } from './db.ts';
import { getHomeView, getSubjectView } from './views.ts';
import { importPackText } from './importPack.ts';
import { startStudySession, submitAnswer, finishStudySession } from './study.ts';
import { markBackupDone } from './reminder.ts';
import { recordAttempt } from './attempts.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it('shows an empty home without reminders', async () => {
  expect(await getHomeView(db, context)).toMatchObject({ subjects: [], hasData: false, streak: 0,
    backupReminder: false, openSession: null, secondsToday: 0, goalReached: false });
});
it('shows an imported subject without attempts', async () => {
  await importPackText(db, packText(), context);
  expect(await getHomeView(db, context)).toMatchObject({ hasData: true, backupReminder: false,
    subjects: [{ id: 'ejmat', percent: 0, dueToday: 0, lastStudyDay: null }] });
});
it('returns null for an absent subject', async () => { expect(await getSubjectView(db, 'missing', context)).toBeNull(); });
it('orders chapters and blocks and reports locked pending states', async () => {
  await importPackText(db, packText(), context);
  const view = await getSubjectView(db, 'ejmat', context);
  expect(view?.chapters.map(c => [c.id, c.numero, c.percent, c.hasEvaluables])).toEqual([['ejmat-c01', 1, 0, true]]);
  expect(view?.chapters[0]?.blocks.map(b => [b.id, b.status, b.locked, b.evaluables])).toEqual([
    ['mat-b1', 'pendiente', false, 4], ['mat-b2', 'pendiente', true, 5], ['mat-b3', 'pendiente', true, 4],
  ]);
});
it('omits archived blocks', async () => {
  await importPackText(db, packText(), context);
  await db.blocks.update('mat-b3', { archived: true });
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks.map(b => b.id)).toEqual(['mat-b1', 'mat-b2']);
});
it('uses weighted mastery and unlocks the dependent block', async () => {
  await importPackText(db, packText(), context);
  for (const [index, ctx] of [context, secondContext].entries()) {
    const sessionId = `run-${String(index)}`;
    await startStudySession(db, { ...startInput, sessionId }, ctx);
    for (const answer of firstAnswers.filter(answer => index === 0 || answer.submission.kind !== 'seen')) await submitAnswer(db, { ...answer, sessionId,
      attemptId: `${sessionId}-${answer.itemId}`, durationMs: 1000 }, ctx);
  }
  expect((await getHomeView(db, secondContext)).subjects[0]?.percent).toBe(11);
  const blocks = (await getSubjectView(db, 'ejmat', secondContext))?.chapters[0]?.blocks;
  expect(blocks?.[0]).toMatchObject({ status: 'dominado', locked: false });
  expect(blocks?.[1]).toMatchObject({ status: 'pendiente', locked: false });
});
it('shows in-progress state after one answer', async () => {
  await importPackText(db, packText(), context);
  await recordAttempt(db, attempt(), context);
  expect((await getSubjectView(db, 'ejmat', context))?.chapters[0]?.blocks[0]?.status).toBe('en_curso');
});
it('counts due items before cutoff excluding today, info, archived and future items', async () => {
  await importPackText(db, packText(), context);
  for (const itemId of ['mat-i3', 'mat-i10', 'mat-i13', 'mat-i14']) {
    const row = await db.items.get(itemId);
    if (!row) throw new Error('Missing fixture');
    await recordAttempt(db, attempt({ attemptId: itemId, itemId, blockId: row.blockId,
      tipo: row.tipo, at: '2026-11-23T10:00:00.000Z', studyDay: '2026-11-23' }), context);
    const state = await db.itemState.get(itemId);
    if (!state) throw new Error('Missing state');
    await db.itemState.put({ ...state, card: { ...state.card,
      due: itemId === 'mat-i14' ? '2026-11-25T03:00:00.000Z' : '2026-11-24T00:00:00.000Z' } });
  }
  await db.items.update('mat-i13', { archived: true });
  await recordAttempt(db, attempt({ attemptId: 'today' }), context);
  expect((await getHomeView(db, context)).subjects[0]?.dueToday).toBe(1);
});
it('computes streak, latest day, seconds and backup reminders', async () => {
  await importPackText(db, packText(), context);
  for (const [i, ctx] of [context, secondContext, thirdContext].entries()) {
    await recordAttempt(db, attempt({ attemptId: `a-${String(i)}`, at: ctx.now, studyDay: ctx.now.slice(0, 10) }), ctx);
  }
  expect(await getHomeView(db, thirdContext)).toMatchObject({ streak: 3, secondsToday: 1, backupReminder: true,
    subjects: [{ lastStudyDay: '2026-11-26' }] });
  await markBackupDone(db, thirdContext.now);
  expect((await getHomeView(db, thirdContext)).backupReminder).toBe(false);
});
it('reports the newest open session and removes finished sessions', async () => {
  await importPackText(db, packText(), context);
  await startStudySession(db, startInput, context);
  await startStudySession(db, { ...startInput, sessionId: 'new' }, secondContext);
  expect((await getHomeView(db, secondContext)).openSession?.id).toBe('new');
  await finishStudySession(db, 'new', secondContext);
  expect((await getHomeView(db, secondContext)).openSession?.id).toBe('run');
  await finishStudySession(db, 'run', secondContext);
  expect((await getHomeView(db, secondContext)).openSession).toBeNull();
});
