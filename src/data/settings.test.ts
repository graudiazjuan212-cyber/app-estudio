import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, dump, testDb } from '../../tests/fixtures/data/helpers.ts';
import { validSettings } from '../../tests/fixtures/data/services.ts';
import type { StudyDb } from './db.ts';
import { getSettings, setSetting } from './settings.ts';
import type { Settings } from './settings.ts';
import { getAppStorageStatus } from './appStorage.ts';
let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it('uses defaults when settings are absent', async () => {
  expect(await getSettings(db)).toEqual({ sessionMinutes: 10, dailyGoalMinutes: 10, theme: 'system' });
});
it('falls back independently for invalid persisted values without writing', async () => {
  await db.settings.bulkPut([{ key: 'sessionMinutes', value: 7 }, { key: 'dailyGoalMinutes', value: 7 }, { key: 'theme', value: 'rojo' }]);
  const before = await dump(db);
  expect(await getSettings(db)).toEqual({ sessionMinutes: 10, dailyGoalMinutes: 10, theme: 'system' });
  expect(await dump(db)).toEqual(before);
});
it.each(validSettings)('round trips valid %s = %s', async (key, value) => {
  await setSetting(db, key, value);
  expect((await getSettings(db))[key]).toBe(value);
});
it.each([['sessionMinutes', 7], ['dailyGoalMinutes', 7], ['theme', 'rojo'], ['unknown', 10]])('rejects invalid %s without writes', async (key, value) => {
  const before = await dump(db);
  await expect(setSetting(db, key as keyof Settings, value as Settings[keyof Settings])).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
it('handles missing storage APIs without changing data', async () => {
  const before = await dump(db);
  expect(await getAppStorageStatus(db, undefined)).toEqual({ persisted: null, usageBytes: null,
    quotaBytes: null, persistence: 'unsupported', openSessions: [] });
  expect(await dump(db)).toEqual(before);
});
it('delegates storage status and persistence', async () => {
  expect(await getAppStorageStatus(db, { storage: { persisted: () => Promise.resolve(true),
    persist: () => Promise.resolve(true), estimate: () => Promise.resolve({ usage: 12, quota: 100 }) } }))
    .toEqual({ persisted: true, usageBytes: 12, quotaBytes: 100, persistence: 'granted', openSessions: [] });
  expect(context.tz).toBe('Europe/Madrid');
});
