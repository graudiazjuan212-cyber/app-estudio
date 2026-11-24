import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { startInput } from '../../tests/fixtures/data/services.ts';
import { allowedMinutes, rejectedMinutes, rejectedSettings } from '../../tests/fixtures/data/sessionMinutes.ts';
import type { StudyDb } from './db.ts';
import type { Settings } from './settings.ts';
import { getSettings, setSetting } from './settings.ts';
import { importPackText } from './importPack.ts';
import { startStudySession } from './study.ts';
let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it.each(allowedMinutes)('round trips session duration %s', async minutes => {
  expect((await getSettings(db)).sessionMinutes).toBe(10);
  await setSetting(db, 'sessionMinutes', minutes);
  expect((await getSettings(db)).sessionMinutes).toBe(minutes);
});
it.each(rejectedSettings)('rejects setting %s = %s without writes', async (key, value) => {
  const before = await dump(db);
  await expect(setSetting(db, key, value as Settings[typeof key])).rejects.toThrow('valor permitido');
  expect(await dump(db)).toEqual(before);
});
it('reads an invalid stored duration as default without overwriting it', async () => {
  await db.settings.put({ key: 'sessionMinutes', value: 20 });
  const before = await dump(db);
  expect((await getSettings(db)).sessionMinutes).toBe(10);
  expect(await dump(db)).toEqual(before);
});
for (const kind of ['study', 'review'] as const) {
  it.each(allowedMinutes)(`${kind} accepts %s minutes`, async minutes => {
    await importPackText(db, packText(), context);
    expect((await startStudySession(db, { ...startInput, kind, chapterId: 'ejmat-c01', minutes }, context)).status).toBe('started');
    expect((await db.sessions.get('run'))?.minutes).toBe(minutes);
  });
  it.each(rejectedMinutes)(`${kind} rejects %s minutes without writes`, async value => {
    await importPackText(db, packText(), context);
    const before = await dump(db);
    expect(await startStudySession(db, { ...startInput, kind, chapterId: 'ejmat-c01', minutes: value as number }, context))
      .toEqual({ status: 'error', message: 'La duración de la sesión debe ser 1, 5, 10, 15 o 30 minutos.' });
    expect(await db.sessions.count()).toBe(0);
    expect(await dump(db)).toEqual(before);
  });
}
it.each(rejectedMinutes)('exam ignores duration %s', async value => {
  await importPackText(db, packText(), context);
  expect((await startStudySession(db, { ...startInput, kind: 'exam', chapterId: 'ejmat-c01', minutes: value as number }, context)).status).toBe('started');
  expect((await db.sessions.get('run'))?.itemIds).toHaveLength(5);
  expect((await db.sessions.get('run'))?.minutes).toBe(10);
});
it('one minute keeps at least one item and fewer items than thirty minutes', async () => {
  await importPackText(db, packText(), context);
  await startStudySession(db, { ...startInput, minutes: 1 }, context);
  await startStudySession(db, { ...startInput, sessionId: 'long', minutes: 30 }, context);
  const short = await db.sessions.get('run');
  const long = await db.sessions.get('long');
  expect(short?.minutes).toBe(1);
  expect(long?.minutes).toBe(30);
  expect(short?.itemIds.length).toBeGreaterThanOrEqual(1);
  expect(short?.itemIds.length).toBeLessThan(long?.itemIds.length ?? 0);
});
