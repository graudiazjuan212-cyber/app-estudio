import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, expect, it, vi } from 'vitest';
import { context, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import { importPackText } from './importPack.ts';
import { exportBackup } from './backup.ts';
import { backupSchema } from './backupSchema.ts';
import { studyVersions } from './schema.ts';
import { openStudyDb } from './open.ts';
import { readItemMetadata } from './itemMetadata.ts';

afterEach(() => { vi.restoreAllMocks(); });
it.each([false, true])('copies old v1 before extending its index (copy failure: %s)', async failCopy => {
  const current = await testDb();
  const name = `test-${crypto.randomUUID()}`;
  const previous = new Dexie(name);
  const recovery = new Dexie(`${name}-premigration-v1`);
  try {
    await importPackText(current, packText(), context);
    const backup = await exportBackup(current, context);
    const data = backupSchema.parse(JSON.parse(backup.json) as unknown).data;
    const version = studyVersions[0];
    if (!version) throw new Error('Missing v1 fixture');
    previous.version(1).stores({ ...version.stores,
      items: 'id, blockId, chapterId, subjectId, archived' });
    await previous.open();
    for (const [table, rows] of Object.entries(data)) await previous.table(table).bulkAdd(rows);
    previous.close();
    const proto = Dexie.prototype as { open: (this: Dexie) => Promise<Dexie> };
    const originalOpen = proto.open;
    vi.spyOn(proto, 'open').mockImplementation(function (this: Dexie) {
      if (failCopy && this.name === recovery.name) throw new Error('Copy failed');
      return originalOpen.call(this);
    });
    const opened = await openStudyDb(name);
    if (failCopy) {
      expect(opened).toMatchObject({ ok: false, reason: 'migration-failed' });
      await previous.open();
      expect(previous.table('items').schema.idxByName.metadataKey).toBeUndefined();
      expect(await previous.table('items').count()).toBe(14);
      return;
    }
    expect(opened.ok).toBe(true);
    if (!opened.ok) throw new Error(opened.message);
    try {
      expect(await readItemMetadata(opened.db)).toHaveLength(14);
      expect((await exportBackup(opened.db, context)).json).toBe(backup.json);
      await recovery.open();
      const saved = await recovery.table<{ key: string; json: string }, string>('backup').get('dump');
      expect(saved).toBeDefined();
      expect(saved?.json).not.toContain('metadataKey');
    } finally { opened.db.close(); }
    const reopened = await openStudyDb(name);
    expect(reopened.ok).toBe(true);
    if (reopened.ok) reopened.db.close();
  } finally {
    current.close(); previous.close(); recovery.close();
    await Dexie.delete(current.name); await Dexie.delete(name); await Dexie.delete(`${name}-premigration-v1`);
  }
});
