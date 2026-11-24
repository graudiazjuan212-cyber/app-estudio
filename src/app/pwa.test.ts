import { expect, it, vi } from 'vitest';
import { bannerCases, platformCases, checkCases } from '../../tests/fixtures/pwa';
import { shouldShowUpdateBanner, detectPlatform, isStandalone } from './pwaRules';
import { createPwaStore, shouldCheckUpdate, startPwa } from './pwa';
it.each(bannerCases)('banner %s %s %s ? %s', (needRefresh, name, dismissed, expected) => {
  expect(shouldShowUpdateBanner({ needRefresh, route: { name }, dismissed })).toBe(expected);
});
it.each(platformCases)('platform %s', (ua, expected) => { expect(detectPlatform(ua)).toBe(expected); });
it.each([true, false])('standalone %s', matches => {
  const match = vi.fn(() => ({ matches }));
  expect(isStandalone(match)).toBe(matches);
  expect(match).toHaveBeenCalledWith('(display-mode: standalone)');
});
it('handles absent matchMedia', () => { expect(isStandalone()).toBe(false); });
it.each(checkCases)('update threshold %s %s', (last, now, expected) => {
  expect(shouldCheckUpdate(last, now)).toBe(expected);
});
it('publishes refresh and offline readiness and unsubscribes', () => {
  const store = createPwaStore(); const listener = vi.fn();
  const before = store.getSnapshot(); const unsubscribe = store.subscribe(listener);
  store.publish({ needRefresh: true });
  expect(store.getSnapshot()).toEqual({ needRefresh: true, offlineReady: false });
  expect(store.getSnapshot()).not.toBe(before); expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe(); store.publish({ offlineReady: true });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot()).toEqual({ needRefresh: true, offlineReady: true });
});
it('does not register in development', async () => { await expect(startPwa()).resolves.toBeUndefined(); });
