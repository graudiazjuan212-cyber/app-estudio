import { registerServiceWorker } from './swRegister';
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
let update: (() => Promise<void>) | undefined;
let started = false;
export async function startPwa(clock: () => number = () => Date.now()): Promise<void> {
  if (!import.meta.env.PROD || started) return;
  started = true;
  try {
    update = await registerServiceWorker({ clock, publish: pwaStore.publish });
  } catch { /* Registration must not block studying. */ }
}
export async function applyUpdate(): Promise<void> { await update?.(); }
