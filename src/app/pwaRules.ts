export function shouldShowUpdateBanner({ needRefresh, route, dismissed }: {
  needRefresh: boolean; route: { name: string }; dismissed: boolean;
}): boolean { return needRefresh && !dismissed && route.name !== 'session'; }
export function detectPlatform(userAgent: string): 'android' | 'ios' | 'other' {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'other';
}
export function isStandalone(matchMedia?: (query: string) => { matches: boolean }): boolean {
  return matchMedia?.('(display-mode: standalone)').matches ?? false;
}
