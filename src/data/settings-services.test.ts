import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { defaults } from '../../tests/fixtures/data/services-m5.ts';
import { getSettings, setSetting } from './settings.ts';
import type { Settings } from './settings.ts';
import type { StudyDb } from './db.ts';
import { getAppStorageStatus } from './appStorage.ts';
import { importPackText } from './importPack.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
it('returns defaults for absent settings', async () => { expect(await getSettings(db)).toEqual(defaults); });
it.each([7, 'rojo', null])('falls back for corrupt settings: %s', async value => {
  await db.settings.bulkPut(['sessionMinutes', 'dailyGoalMinutes', 'theme'].map(key => ({ key, value })));
  expect(await getSettings(db)).toEqual(defaults);
});
it.each([5, 10, 15] as const)('round trips both minute settings: %s', async value => {
  await setSetting(db, 'sessionMinutes', value);
  await setSetting(db, 'dailyGoalMinutes', value);
  expect(await getSettings(db)).toEqual({ ...defaults, sessionMinutes: value, dailyGoalMinutes: value });
});
it.each(['system', 'light', 'dark'] as const)('round trips theme: %s', async theme => {
  await setSetting(db, 'theme', theme);
  expect((await getSettings(db)).theme).toBe(theme);
});
it.each(['sessionMinutes', 'dailyGoalMinutes', 'theme'] as const)('rejects invalid %s without overwriting', async key => {
  await db.settings.put({ key, value: 'previous' });
  await expect(setSetting(db, key, 7 as Settings[typeof key])).rejects.toThrow();
  expect(await db.settings.get(key)).toEqual({ key, value: 'previous' });
});
it('supports unavailable storage APIs', async () => {
  expect(await getAppStorageStatus(db, undefined)).toEqual({ persistence: 'unsupported', persisted: null,
    usageBytes: null, quotaBytes: null, openSessions: [] });
});
it('reuses persistence and estimate APIs', async () => {
  await importPackText(db, packText(), context);
  const status = await getAppStorageStatus(db, { storage: { persist: () => Promise.resolve(true),
    persisted: () => Promise.resolve(true), estimate: () => Promise.resolve({ usage: 100, quota: 1000 }) } });
  expect(status).toMatchObject({ persistence: 'granted', persisted: true, usageBytes: 100, quotaBytes: 1000 });
});
