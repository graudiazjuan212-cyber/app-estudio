import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import type { StudyDb } from './db.ts';
import { importPackText } from './importPack.ts';
import { rebuildCache } from './cache.ts';
import { exportBackup, restoreBackup } from './backup.ts';
import { loadMetadataCatalog } from './catalog.ts';
import { evaluableIds } from '../domain/study/index.ts';
import { readItemMetadata } from './itemMetadata.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { await db.delete(); });
async function expectCounts(expected: number[]) {
  const catalog = await loadMetadataCatalog(db, 'ejmat');
  expect([...catalog.blocks.values()].map(block => evaluableIds(block, catalog).length)).toEqual(expected);
  const rows = await db.items.orderBy('id').toArray();
  const metadata = (await readItemMetadata(db)).sort((a, b) => a.id.localeCompare(b.id));
  expect(metadata).toEqual(rows.sort((a, b) => a.id.localeCompare(b.id)).map(row => ({
    subjectId: row.subjectId, order: row.order, id: row.id, blockId: row.blockId, tipo: row.tipo,
    itemGen: row.itemGen, archived: row.archived, relaciona: row.relaciona,
  })));
}
it('indexes imported items without their question data', async () => {
  await importPackText(db, packText(), context);
  await expectCounts([4, 5, 4]);
  expect(await readItemMetadata(db, 'missing')).toEqual([]);
});
it('tracks archived, moved and changed-type items after v2', async () => {
  await importPackText(db, packText(), context);
  await importPackText(db, packText('mat-ejemplo-c01-v2'), context);
  await expectCounts([3, 4, 6]);
  // v2 removes i5, changes i2 from flashcard to vf and moves i10 to b3.
  const rows = await db.items.toArray();
  const metadata = await readItemMetadata(db);
  for (const id of ['mat-i5', 'mat-i2', 'mat-i10']) {
    const row = rows.find(item => item.id === id);
    expect(row).toBeDefined();
    expect(metadata.find(item => item.id === id)).toMatchObject({
      archived: row?.archived, tipo: row?.tipo, blockId: row?.blockId, itemGen: row?.itemGen,
    });
  }
  expect(metadata.find(item => item.id === 'mat-i5')?.archived).toBe(true);
  expect(metadata.find(item => item.id === 'mat-i2')?.itemGen).toBe(2);
  expect(metadata.find(item => item.id === 'mat-i10')?.blockId).toBe('mat-b3');
});
it('recomputes the index on direct updates and ignores supplied stale derived values', async () => {
  await importPackText(db, packText(), context);
  await db.items.update('mat-i3', { archived: true });
  await expectCounts([3, 5, 4]);
  const row = await db.items.get('mat-i3');
  if (!row) throw new Error('Missing fixture');
  await db.items.put({ ...row, archived: false });
  await expectCounts([4, 5, 4]);
});
it('rebuilds index keys and preserves data/history during rebuildCache', async () => {
  await importPackText(db, packText(), context);
  const before = await exportBackup(db, context);
  await rebuildCache(db, context);
  await expectCounts([4, 5, 4]);
  expect(await exportBackup(db, context)).toEqual(before);
});
it('keeps the backup format unchanged and recalculates metadata on restore', async () => {
  await importPackText(db, packText(), context);
  const backup = await exportBackup(db, context);
  expect(backup.json).not.toContain('metadataKey');
  expect(backup.json).not.toContain('evaluables');
  const target = await testDb();
  try {
    expect((await restoreBackup(target, backup.json, context)).status).toBe('restored');
    expect(await readItemMetadata(target)).toEqual(await readItemMetadata(db));
    expect((await exportBackup(target, context)).json).toBe(backup.json);
  } finally { await target.delete(); }
});
it('does not retain deleted item keys', async () => {
  await importPackText(db, packText(), context);
  await db.items.delete('mat-i3');
  await expectCounts([3, 5, 4]);
});

it('rejects missing metadata, then repairs it without changing backup data', async () => {
  await importPackText(db, packText(), context);
  const before = await exportBackup(db, context);
  const row = await db.items.get('mat-i3');
  if (!row) throw new Error('Missing fixture');
  const { metadataKey: derivedKey, ...original } = row;
  void derivedKey;
  // Simulate pre-index data without passing through the maintenance hooks.
  await new Promise<void>((resolve, reject) => {
    const tx = db.backendDB().transaction('items', 'readwrite');
    tx.objectStore('items').put(original);
    tx.oncomplete = () => { resolve(); };
    tx.onerror = () => { reject(new Error('Fixture write failed')); };
  });
  await expect(readItemMetadata(db)).rejects.toThrow('Faltan metadatos');
  await rebuildCache(db, context);
  await expectCounts([4, 5, 4]);
  expect(await exportBackup(db, context)).toEqual(before);
});
it('leaves index keys unchanged after a rejected import', async () => {
  await importPackText(db, packText(), context);
  const before = await readItemMetadata(db);
  expect((await importPackText(db, '{}', context)).status).toBe('rejected');
  expect(await readItemMetadata(db)).toEqual(before);
});
