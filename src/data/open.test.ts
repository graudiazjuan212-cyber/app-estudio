import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { attempt, context, dump, packText, testConfig } from '../../tests/fixtures/data/helpers.ts';
import { dataConfig } from '../config.ts';
import { defineDb } from './db.ts';
import type { StudyDb } from './db.ts';
import { openStudyDb } from './open.ts';
import { studyVersions } from './schema.ts';
import type { DbVersion } from './schema.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';

let name: string;
let connections: Dexie[];
let timeout: number;
beforeEach(() => { name = `test-${crypto.randomUUID()}`; connections = []; timeout = dataConfig.blockedTimeoutMs; });
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  dataConfig.blockedTimeoutMs = timeout;
  for (const db of connections) db.close();
  for (const n of await Dexie.getDatabaseNames()) if (n === name || n.startsWith(`${name}-premigration-v`)) await Dexie.delete(n);
});
function versions(upgrade?: DbVersion['upgrade']): DbVersion[] {
  return [...studyVersions, { version: 2, stores: {
    attempts: 'attemptId, itemId, subjectId, studyDay, sessionId, at, [subjectId+studyDay], chapterId', extra: 'id',
  }, ...(upgrade ? { upgrade } : {}) }];
}
async function open(v = studyVersions, handlers = {}): Promise<StudyDb> {
  const result = await openStudyDb(name, handlers, v);
  if (!result.ok) throw new Error(result.message);
  connections.push(result.db);
  return result.db;
}
async function seeded(): Promise<StudyDb> {
  const db = await open();
  await importPackText(db, packText(), context);
  for (const id of ['a', 'b', 'c']) await recordAttempt(db, attempt({ attemptId: id }), context);
  return db;
}
it('creates v1 with schema and scheduler metadata', async () => {
  const db = await open();
  expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 1 });
  expect(await db.meta.get('schedulerVersion')).toEqual({ key: 'schedulerVersion', value: 1 });
});
it('migrates additive v2 while preserving rows, metadata and a complete prior dump', async () => {
  const db = await seeded();
  const before = await dump(db);
  db.close();
  const upgraded = await open(versions());
  expect(upgraded.verno).toBe(2);
  const { extra, ...after } = await dump(upgraded);
  expect(extra).toEqual([]);
  expect(after).toEqual(before);
  const copy = new Dexie(`${name}-premigration-v1`);
  connections.push(copy);
  await copy.open();
  const row = await copy.table<{ key: string; json: string }, string>('backup').get('dump');
  expect(JSON.parse(row?.json ?? 'null')).toEqual(before);
});
it('rolls back a throwing migration to v1 with all rows intact', async () => {
  const db = await seeded();
  const before = await dump(db);
  db.close();
  expect(await openStudyDb(name, {}, versions(() => Promise.reject(new Error('Fallo')))))
    .toMatchObject({ ok: false, reason: 'migration-failed' });
  const reopened = await open();
  expect(reopened.verno).toBe(1);
  expect(await dump(reopened)).toEqual(before);
});
it('does not migrate if the prior copy fails', async () => {
  const db = await seeded();
  const before = await dump(db);
  db.close();
  const prototype = Dexie.prototype as Dexie;
  const originalOpen = Reflect.get(prototype, 'open');
  vi.spyOn(prototype, 'open').mockImplementation(function (this: Dexie) {
    if (this.name === `${name}-premigration-v1`) throw new Error('Copia fallida');
    return originalOpen.call(this);
  });
  expect(await openStudyDb(name, {}, versions())).toMatchObject({ ok: false, reason: 'migration-failed' });
  const reopened = await open();
  expect(reopened.verno).toBe(1);
  expect(await dump(reopened)).toEqual(before);
});
it('rejects older code without modifying a newer database', async () => {
  const db = await open(versions());
  const before = await dump(db);
  db.close();
  expect(await openStudyDb(name)).toMatchObject({ ok: false, reason: 'version-newer', message: 'Recarga para actualizar' });
  expect(await dump(await open(versions()))).toEqual(before);
});
it('closes the old connection on versionchange and calls its handler', async () => {
  const changed = vi.fn();
  const a = await open(studyVersions, { onVersionChange: changed });
  await open(versions());
  expect(changed).toHaveBeenCalledOnce();
  expect(a.isOpen()).toBe(false);
  await expect(a.settings.put({ key: 'x', value: 1 })).rejects.toThrow();
});
it('notifies blocked and completes after the blocking connection closes', async () => {
  const a = defineDb(name, studyVersions);
  connections.push(a);
  a.on('versionchange', () => false);
  await a.open();
  const blocked = vi.fn(() => { a.close(); });
  await open(versions(), { onBlocked: blocked });
  expect(blocked).toHaveBeenCalledOnce();
});
it('times out a blocked opening', async () => {
  const a = defineDb(name, studyVersions);
  connections.push(a);
  a.on('versionchange', () => false);
  await a.open();
  dataConfig.blockedTimeoutMs = testConfig.blockedTimeoutMs;
  const blocked = vi.fn();
  expect(await openStudyDb(name, { onBlocked: blocked }, versions())).toMatchObject({ ok: false, reason: 'blocked' });
  expect(blocked).toHaveBeenCalledOnce();
  a.close();
});
it('returns unavailable when indexedDB is absent', async () => {
  vi.stubGlobal('indexedDB', undefined);
  expect(await openStudyDb(name)).toMatchObject({ ok: false, reason: 'unavailable' });
});
it('retains only the configured number of premigration copies', async () => {
  const db = await open();
  db.close();
  for (const version of [2, 3, 4]) {
    const upgraded = await open([...studyVersions, ...[2, 3, 4].filter(v => v <= version).map(v => ({ version: v, stores: { extra: 'id' } }))]);
    upgraded.close();
  }
  const names = (await Dexie.getDatabaseNames()).filter(n => n.startsWith(`${name}-premigration-v`)).sort();
  expect(names).toEqual([`${name}-premigration-v2`, `${name}-premigration-v3`]);
});
