import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, expect, it, vi } from 'vitest';
import { realContext, realText, seedPublishedV1, patchPublishedV1 } from '../../tests/fixtures/backups/v1';
import { dump } from '../../tests/fixtures/data/helpers';
import { defineDb } from './db';
import { openStudyDb } from './open';
import { studyVersions } from './schema';
import { exportBackup, restoreBackup } from './backup';
import { backupSchema } from './backupSchema';
import { rebuildCache } from './cache';
import { getHomeView, getSubjectView } from './views';
import { getHomeView as getV1HomeView } from '../../tests/fixtures/backups/v1-views';
import { backupJson } from './backupData';

const names: string[] = [];
function name() { const value = `test-${crypto.randomUUID()}`; names.push(value); return value; }
afterEach(async () => {
  vi.restoreAllMocks();
  for (const n of names.splice(0)) {
    await Dexie.delete(n); await Dexie.delete(`${n}-premigration-v1`);
  }
});
it.each([false, true])('preserves real v1 data, recovery copy and rebuilt views (native patch: %s)', async patched => {
  const n = name(); await seedPublishedV1(n);
  const old = defineDb(n, studyVersions.filter(v => v.version === 1));
  await old.open(); await rebuildCache(old, realContext);
  const before = await dump(old);
  const backup = await exportBackup(old, realContext);
  const subject = await getSubjectView(old, 'ejmat', realContext);
  const oldHome = await getV1HomeView(old, realContext);
  old.close();
  if (patched) await patchPublishedV1(n);
  const result = await openStudyDb(n);
  if (!result.ok) throw new Error(result.message);
  const db = result.db;
  try {
    const { practiceAttempts, ...after } = await dump(db);
    expect(practiceAttempts).toEqual([]); expect(after).toEqual(before);
    const exportedText = (await exportBackup(db, realContext)).json;
    const exported = backupSchema.parse(JSON.parse(exportedText) as unknown);
    const expected = backupSchema.parse(JSON.parse(backup.json) as unknown);
    expect(exported).toEqual({ ...expected, dbVersion: 2, data: { ...expected.data, practiceAttempts: [] } });
    expect(exportedText).toBe(backupJson({ ...expected, dbVersion: 2, data: { ...expected.data, practiceAttempts: [] } }));
    const copy = new Dexie(`${n}-premigration-v1`);
    await copy.open();
    try {
      const saved = await copy.table<{ key: string; json: string }>('backup').get('dump');
      expect(JSON.parse(saved?.json ?? 'null')).toEqual(before);
    } finally { copy.close(); }
    expect(await getSubjectView(db, 'ejmat', realContext)).toEqual(subject);
    const home = await getHomeView(db, realContext);
    expect(home).toEqual(oldHome);
    await rebuildCache(db, realContext);
    expect(await getHomeView(db, realContext)).toEqual(home);
    expect(await getSubjectView(db, 'ejmat', realContext)).toEqual(subject);
    const beforeReopen = await dump(db); db.close();
    const openedNames: string[] = [];
    const proto = Dexie.prototype as { open: (this: Dexie) => Promise<Dexie> };
    const original = proto.open;
    vi.spyOn(proto, 'open').mockImplementation(function (this: Dexie) {
      openedNames.push(this.name); return original.call(this);
    });
    const reopened = await openStudyDb(n);
    if (!reopened.ok) throw new Error(reopened.message);
    try { expect(await dump(reopened.db)).toEqual(beforeReopen); }
    finally { reopened.db.close(); }
    expect(openedNames).not.toContain(`${n}-premigration-v1`);
  } finally { db.close(); }
});
it('restores the unchanged real v1 backup directly into v2', async () => {
  const result = await openStudyDb(name()); if (!result.ok) throw new Error(result.message);
  try {
    expect((await restoreBackup(result.db, realText, realContext)).status).toBe('restored');
    const actual = backupSchema.parse(JSON.parse((await exportBackup(result.db, realContext)).json) as unknown);
    const expected = backupSchema.parse(JSON.parse(realText) as unknown);
    expect(actual).toEqual({ ...expected, dbVersion: 2, data: { ...expected.data, practiceAttempts: [] } });
  } finally { result.db.close(); }
});
it('leaves published v1 untouched if the recovery copy fails', async () => {
  const n = name(); await seedPublishedV1(n);
  const old = defineDb(n, studyVersions.filter(v => v.version === 1)); await old.open();
  const before = await dump(old); old.close();
  const proto = Dexie.prototype as { open: (this: Dexie) => Promise<Dexie> };
  const original = proto.open;
  vi.spyOn(proto, 'open').mockImplementation(function (this: Dexie) {
    if (this.name === `${n}-premigration-v1`) throw new Error('Copy failed');
    return original.call(this);
  });
  expect(await openStudyDb(n)).toMatchObject({ ok: false, reason: 'migration-failed' });
  await old.open();
  try { expect(old.verno).toBe(1); expect(await dump(old)).toEqual(before); }
  finally { old.close(); }
});
it('creates v2 without a recovery database for a new installation', async () => {
  const n = name(); const result = await openStudyDb(n); if (!result.ok) throw new Error(result.message);
  try { expect(result.db.verno).toBe(2); expect(await result.db.practiceAttempts.count()).toBe(0); }
  finally { result.db.close(); }
  expect(await Dexie.getDatabaseNames()).not.toContain(`${n}-premigration-v1`);
});
