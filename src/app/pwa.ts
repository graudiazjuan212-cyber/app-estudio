import { pwaConfig } from '../config';
export interface PwaSnapshot { needRefresh: boolean; offlineReady: boolean }
export function createPwaStore() {
  let snapshot: PwaSnapshot = { needRefresh: false, offlineReady: false };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish: (patch: Partial<PwaSnapshot>) => {
      snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => { listener(); });
    },
  };
}
export const pwaStore = createPwaStore();
export function shouldCheckUpdate(last: number | null, now: number): boolean {
  return last === null || now - last >= pwaConfig.updateCheckMinMinutes * pwaConfig.millisecondsPerMinute;
}
let lastCheck: number | null = null;
let update: ((reloadPage?: boolean) => Promise<void>) | undefined;
let started = false;
export async function startPwa(clock: () => number = () => Date.now()): Promise<void> {
  if (!import.meta.env.PROD || started) return;
  started = true;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    update = registerSW({ immediate: true,
      onNeedRefresh: () => { pwaStore.publish({ needRefresh: true }); },
      onOfflineReady: () => { pwaStore.publish({ offlineReady: true }); },
      onRegisterError: () => { /* Offline first launch: keep the app usable. */ },
      onRegisteredSW: (_url, registration) => {
        if (!registration) return;
        lastCheck = clock();
        document.addEventListener('visibilitychange', () => {
          const now = clock();
          if (document.visibilityState !== 'visible' || !shouldCheckUpdate(lastCheck, now)) return;
          lastCheck = now;
          void registration.update().catch(() => { /* Retry on a later return to the app. */ });
        });
      },
    });
  } catch { /* Registration must not block studying. */ }
}
export async function applyUpdate(): Promise<void> { await update?.(true); }
