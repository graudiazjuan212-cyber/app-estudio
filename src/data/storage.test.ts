import { expect, it, vi } from 'vitest';
import { canShareFile, requestPersistence, storageStatus } from './storage.ts';
import type { StorageLike } from './storage.ts';

it.each([true, false])('maps persistence result %s', async granted => {
  expect(await requestPersistence({ persist: () => Promise.resolve(granted) })).toBe(granted ? 'granted' : 'denied');
});
it('grants already persistent storage without requesting again', async () => {
  const persist = vi.fn(() => Promise.resolve(false));
  expect(await requestPersistence({ persisted: () => Promise.resolve(true), persist })).toBe('granted');
  expect(persist).not.toHaveBeenCalled();
});
it.each(['persist', 'persisted'] as const)('handles a failing %s method', async method => {
  const storage: StorageLike = { persist: () => Promise.resolve(true) };
  storage[method] = () => Promise.reject(new Error('Unavailable'));
  expect(await requestPersistence(storage)).toBe('denied');
});
it.each([undefined, {}, { persisted: () => Promise.resolve(true) }])('reports unsupported persistence', async storage => {
  expect(await requestPersistence(storage)).toBe('unsupported');
});
it('reports usage, quota and persistence', async () => {
  expect(await storageStatus({ persisted: () => Promise.resolve(true),
    estimate: () => Promise.resolve({ usage: 123, quota: 456 }) }))
    .toEqual({ persisted: true, usageBytes: 123, quotaBytes: 456 });
});
it.each([undefined, {}, { estimate: () => Promise.reject(new Error('Unavailable')) },
  { estimate: () => Promise.resolve({ usage: NaN, quota: -1 }) }])('reports unavailable estimates with nulls', async storage => {
  expect(await storageStatus(storage)).toEqual({ persisted: null, usageBytes: null, quotaBytes: null });
});
it('isolates persistence failure from estimates and preserves partial estimates', async () => {
  expect(await storageStatus({ persisted: () => Promise.reject(new Error('Unavailable')),
    estimate: () => Promise.resolve({ usage: 0 }) })).toEqual({ persisted: null, usageBytes: 0, quotaBytes: null });
});
it.each([true, false])('checks file sharing capability %s', allowed => {
  const file = new File(['{}'], 'backup.json', { type: 'application/json' });
  const canShare = vi.fn(() => allowed);
  expect(canShareFile({ canShare, share: () => undefined }, file)).toBe(allowed);
  expect(canShare).toHaveBeenCalledWith({ files: [file] });
});
it.each([undefined, {}, { canShare: (): boolean => true }, { share: (): undefined => undefined },
  { share: true, canShare: () => true },
  { share: (): undefined => undefined, canShare: (): boolean => { throw new Error('Unsupported'); } }])('rejects unavailable file sharing', nav => {
  expect(canShareFile(nav, new File([], 'backup.json'))).toBe(false);
});
