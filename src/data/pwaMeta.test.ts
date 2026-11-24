import { expect, it, vi } from 'vitest';
import { context, packText, testDb } from '../../tests/fixtures/data/helpers';
import { importPackText } from './importPack';
import { claimPwaNotice, requestFirstPersistence } from './pwaMeta';
it('requests persistence only after the first successful import', async () => {
  const db = await testDb(); const persist = vi.fn(() => Promise.resolve(true));
  try {
    expect((await importPackText(db, packText(), context)).status).toBe('imported');
    expect(await requestFirstPersistence(db, { persist })).toBe('granted');
    expect((await importPackText(db, packText('mat-ejemplo-c01-v2'), context)).status).toBe('imported');
    expect(await requestFirstPersistence(db, { persist })).toBeNull();
    expect(persist).toHaveBeenCalledTimes(1);
    expect((await db.meta.get('persistAsked'))?.value).toBe(true);
  } finally { db.close(); await db.delete(); }
});
it('keeps imported data when persistence fails and records denial', async () => {
  const db = await testDb();
  try {
    expect((await importPackText(db, packText(), context)).status).toBe('imported');
    expect(await requestFirstPersistence(db, { persist: () => Promise.reject(new Error('Unavailable')) })).toBe('denied');
    expect(await db.packs.count()).toBe(1);
    expect((await db.meta.get('persistResult'))?.value).toBe('denied');
    expect(await requestFirstPersistence(db, undefined)).toBeNull();
  } finally { db.close(); await db.delete(); }
});
it('claims the offline notice only once, including concurrent claims', async () => {
  const db = await testDb();
  try { expect(await Promise.all([claimPwaNotice(db, 'offlineNoticeShown'), claimPwaNotice(db, 'offlineNoticeShown')])).toEqual([true, false]); }
  finally { db.close(); await db.delete(); }
});
it('preserves invalid metadata and does not request storage', async () => {
  const db = await testDb(); const persist = vi.fn(() => Promise.resolve(true));
  try {
    await db.meta.put({ key: 'persistAsked', value: 'invalid' });
    expect(await requestFirstPersistence(db, { persist })).toBe('denied');
    expect(persist).not.toHaveBeenCalled();
    expect((await db.meta.get('persistAsked'))?.value).toBe('invalid');
  } finally { db.close(); await db.delete(); }
});
